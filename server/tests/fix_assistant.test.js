import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import fixAssistant from '../src/services/fixAssistantService.js';
const require = createRequire(import.meta.url);
const geminiService = require('../src/services/geminiService');
const fixAssistantCommonJs = require('../src/services/fixAssistantService');
const aiController = require('../src/controllers/aiController');
const temporaryRoots = [];

function createRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bugtrack-fix-assistant-'));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, 'client', 'src', 'pages'), { recursive: true });
  fs.mkdirSync(path.join(root, 'server', 'src', 'controllers'), { recursive: true });
  return root;
}

function createPatch(rootPath, issueId = 'issue-1', userId = 'developer-1') {
  const filePath = 'client/src/pages/LoginPage.jsx';
  const originalCode = 'function login() {\n  return "old";\n}';
  const proposedCode = 'function login() {\n  return "fixed";\n}';
  const fullPath = path.join(rootPath, filePath);
  fs.writeFileSync(fullPath, `${originalCode}\n`, 'utf8');

  const proposal = fixAssistant.createPatchProposal({
    rootPath,
    issueId,
    userId,
    patch: {
      filePath,
      originalCode,
      proposedCode,
      explanation: 'A focused replacement.',
    },
  });
  return { filePath, fullPath, originalCode, proposedCode, proposal };
}

function writeSource(rootPath, relativePath, content) {
  const fullPath = path.join(rootPath, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('AI Fix Assistant source targeting and patch operations', () => {
  it('only considers application source and ranks actual login files above seed-like names', () => {
    const root = createRepository();
    writeSource(root, 'client/src/pages/LoginPage.jsx', 'export default function LoginPage() {}');
    writeSource(root, 'client/src/context/AuthContext.jsx', 'export function AuthProvider() {}');
    writeSource(root, 'client/src/services/api.js', 'export const api = {};');
    writeSource(root, 'server/src/controllers/authController.js', 'function authenticate() {}');
    writeSource(root, 'server/src/routes/authRoutes.js', 'router.post("/login");');
    writeSource(root, 'server/src/services/geminiService.js', 'function generateCodeFix() {}');
    writeSource(root, 'server/src/prisma_seed.js', 'deleteMany()');
    fs.mkdirSync(path.join(root, 'server', 'src', 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server', 'src', 'node_modules', 'fake.js'), 'login');

    const files = fixAssistant.listRepositoryFiles(root).map((file) => path.relative(root, file).replace(/\\/g, '/'));
    const matches = fixAssistant.matchRelevantFiles({
      title: 'Login authentication blank page',
      description: 'Users see a blank page after login.',
    }, root).map((file) => file.relative);

    expect(files).toEqual(expect.arrayContaining([
      'client/src/pages/LoginPage.jsx',
      'server/src/controllers/authController.js',
    ]));
    expect(files.some((file) => file.includes('seed') || file.includes('node_modules'))).toBe(false);
    expect(matches[0]).toBe('client/src/pages/LoginPage.jsx');
    expect(matches).not.toContain('server/src/prisma_seed.js');
    expect(matches.slice(0, 5)).toEqual(expect.arrayContaining([
      'client/src/context/AuthContext.jsx',
      'client/src/services/api.js',
      'server/src/controllers/authController.js',
      'server/src/routes/authRoutes.js',
    ]));
    expect(matches.slice(0, 5)).not.toContain('server/src/services/geminiService.js');
  });

  it('sends the complete ranked authentication flow to the generator, not just its top five files', async () => {
    const root = createRepository();
    const expectedPaths = [
      'client/src/pages/LoginPage.jsx',
      'client/src/context/AuthContext.jsx',
      'client/src/services/api.js',
      'client/src/App.jsx',
      'client/src/layouts/DashboardLayout.jsx',
      'server/src/controllers/authController.js',
      'server/src/routes/authRoutes.js',
      'server/src/middleware/authMiddleware.js',
      'server/src/utils/jwt.js',
      'server/src/services/geminiService.js',
    ];
    for (const relativePath of expectedPaths) {
      writeSource(root, relativePath, `// ${relativePath} authentication login dashboard`);
    }

    const generateCodeFix = vi.spyOn(geminiService, 'generateCodeFix')
      .mockResolvedValue({ available: false, status: 'test_unavailable' });
    try {
      await fixAssistant.buildFixSuggestion({
        title: 'Blank page after login',
        description: 'Authentication succeeds but the dashboard is blank.',
      }, { repoPath: root }, 'developer-1');

      const sourceFiles = generateCodeFix.mock.calls[0][1].map((file) => file.path);
      expect(sourceFiles).toHaveLength(8);
      expect(sourceFiles).toEqual(expect.arrayContaining(expectedPaths.slice(0, 8)));
      expect(sourceFiles).not.toContain('server/src/services/geminiService.js');
    } finally {
      generateCodeFix.mockRestore();
    }
  });

  it('requires explicit approval, applies only the exact reviewed replacement, records it, and rolls it back', () => {
    const root = createRepository();
    const { filePath, fullPath, originalCode, proposedCode, proposal } = createPatch(root);
    expect(proposal.available).toBe(true);

    expect(() => fixAssistant.applyApprovedFix({
      proposalId: proposal.proposalId,
      issueId: 'issue-1',
      userId: 'developer-1',
      approved: false,
    })).toThrow(/explicit developer approval/i);
    expect(fs.readFileSync(fullPath, 'utf8')).toBe(`${originalCode}\n`);

    const applied = fixAssistant.applyApprovedFix({
      proposalId: proposal.proposalId,
      issueId: 'issue-1',
      userId: 'developer-1',
      approved: true,
    });
    expect(applied.status).toBe('applied');
    expect(applied.appliedFiles).toEqual([filePath]);
    expect(fs.readFileSync(fullPath, 'utf8')).toBe(`${proposedCode}\n`);

    const history = fixAssistant.getFixHistory('issue-1', root);
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('applied');
    expect(history[0].appliedFiles).toEqual([filePath]);

    const rolledBack = fixAssistant.rollbackAppliedFix({
      operationId: applied.operationId,
      issueId: 'issue-1',
      userId: 'developer-1',
      rootPath: root,
    });
    expect(rolledBack.rolledBackFiles).toEqual([filePath]);
    expect(fs.readFileSync(fullPath, 'utf8')).toBe(`${originalCode}\n`);
    expect(fixAssistant.getFixHistory('issue-1', root)[0].status).toBe('rolled_back');
  });

  it('refuses to apply a proposal after the source changes', () => {
    const root = createRepository();
    const { fullPath, proposal } = createPatch(root);
    fs.writeFileSync(fullPath, 'concurrent developer edit\n', 'utf8');

    expect(() => fixAssistant.applyApprovedFix({
      proposalId: proposal.proposalId,
      issueId: 'issue-1',
      userId: 'developer-1',
      approved: true,
    })).toThrow(/source file changed/i);
    expect(fs.readFileSync(fullPath, 'utf8')).toBe('concurrent developer edit\n');
  });

  it('reports failed validation without a success-shaped response', async () => {
    const validate = vi.spyOn(fixAssistantCommonJs, 'validateFixProcess')
      .mockResolvedValue({ status: 'validation_failed' });
    const response = {
      statusCode: 0,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    try {
      await aiController.validateFix({
        body: { issueData: { title: 'validation test' }, runFullValidation: true },
      }, response, vi.fn());
      expect(response.statusCode).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.data.status).toBe('validation_failed');
    } finally {
      validate.mockRestore();
    }
  });

  it('refuses seed files, path traversal, and ambiguous original snippets', () => {
    const root = createRepository();
    fs.mkdirSync(path.join(root, 'server', 'src', 'controllers'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server', 'src', 'controllers', 'seed.js'), 'old');
    const invalidTarget = fixAssistant.createPatchProposal({
      rootPath: root,
      issueId: 'issue-1',
      userId: 'developer-1',
      patch: { filePath: 'server/src/controllers/seed.js', originalCode: 'old', proposedCode: 'new' },
    });
    expect(invalidTarget.status).toBe('invalid_target');

    expect(fixAssistant.isAllowedSourcePath('../client/src/pages/LoginPage.jsx')).toBe(false);
    expect(fixAssistant.isAllowedSourcePath('client/src/pages/generated.test.jsx')).toBe(false);

    const { proposal } = createPatch(root);
    const ambiguousPath = path.join(root, 'client', 'src', 'pages', 'LoginPage.jsx');
    fs.writeFileSync(ambiguousPath, 'function login() {\n  return "old";\n}\nfunction login() {\n  return "old";\n}\n');
    const ambiguous = fixAssistant.createPatchProposal({
      rootPath: root,
      issueId: 'issue-1',
      userId: 'developer-1',
      patch: {
        filePath: 'client/src/pages/LoginPage.jsx',
        originalCode: 'function login() {\n  return "old";\n}',
        proposedCode: 'function login() {\n  return "fixed";\n}',
      },
    });
    expect(ambiguous.status).toBe('ambiguous_patch');
    expect(proposal.available).toBe(true);
  });
});
