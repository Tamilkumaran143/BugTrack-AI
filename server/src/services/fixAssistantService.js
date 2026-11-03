const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const prisma = require('../config/db');
const geminiService = require('./geminiService');

const execFileAsync = promisify(execFile);
const SOURCE_DIRECTORIES = ['client/src', 'server/src'];
const ACCEPTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.bugtrack-ai-fix-backups',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'generated',
  '.next',
  '.cache',
]);
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'have', 'when',
  'after', 'before', 'there', 'does', 'issue', 'bug', 'defect', 'instead',
  'application', 'shows', 'enter', 'valid', 'credentials',
]);
const PENDING_PROPOSAL_TTL = 30 * 60 * 1000;
const pendingProposals = new Map();
const DEFAULT_REPOSITORY_ROOT = path.resolve(__dirname, '../../..');

function repositoryRoot() {
  return path.resolve(process.env.BUGTRACK_REPO_ROOT || DEFAULT_REPOSITORY_ROOT);
}

function normalizeRoot(rootPath) {
  return path.resolve(rootPath || repositoryRoot());
}

function normalizeRelativePath(filePath, rootPath) {
  const resolved = path.resolve(filePath);
  const root = path.resolve(rootPath);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return relative.replace(/\\/g, '/');
}

function isAllowedSourcePath(relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) return false;
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.startsWith('.'))) return false;
  if (!SOURCE_DIRECTORIES.some((directory) => normalized.startsWith(`${directory}/`))) return false;
  if (segments.some((segment) => IGNORED_DIRECTORIES.has(segment))) return false;
  const basename = segments[segments.length - 1];
  if (/(^|[._-])seed([._-]|$)/i.test(basename) || /(^|[._-])(test|spec)([._-]|$)/i.test(basename)) return false;
  return ACCEPTED_EXTENSIONS.has(path.extname(basename).toLowerCase());
}

function listRepositoryFiles(rootPath = repositoryRoot(), maxFiles = 1000) {
  const root = normalizeRoot(rootPath);
  const files = [];

  function walk(currentDirectory) {
    if (files.length >= maxFiles) return;
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) continue;

      const fullPath = path.join(currentDirectory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && ACCEPTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const relative = normalizeRelativePath(fullPath, root);
        if (relative && isAllowedSourcePath(relative) && fs.statSync(fullPath).size <= 200_000) {
          files.push(fullPath);
        }
      }
    }
  }

  for (const sourceDirectory of SOURCE_DIRECTORIES) {
    const absoluteDirectory = path.join(root, sourceDirectory);
    if (fs.existsSync(absoluteDirectory)) walk(absoluteDirectory);
  }

  return files.slice(0, maxFiles);
}

function extractKeywords(issueData = {}) {
  const combined = [
    issueData.title,
    issueData.description,
    issueData.stepsToReproduce,
    issueData.expectedResult,
    issueData.actualResult,
  ].filter((value) => typeof value === 'string').join(' ');

  return [...new Set((combined.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token)))].slice(0, 40);
}

function matchRelevantFiles(issueData = {}, rootPath = repositoryRoot()) {
  const root = normalizeRoot(rootPath);
  const keywords = extractKeywords(issueData);
  const issueText = `${issueData.title || ''} ${issueData.description || ''}`;
  const authIssue = /\b(login|log in|authentication|auth|token|session|credential|password)\b/i
    .test(issueText);
  const dashboardIssue = /\b(dashboard|blank page|white screen|blank screen)\b/i
    .test(issueText);
  const aiIssue = /\b(gemini|ai|fix assistant|code generation|prompt)\b/i.test(issueText);

  return listRepositoryFiles(root)
    .map((file) => {
      const relative = normalizeRelativePath(file, root);
      const loweredPath = relative.toLowerCase();
      const content = fs.readFileSync(file, 'utf8');
      const loweredContent = content.toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        if (loweredPath.includes(keyword)) score += 5;
        if (loweredContent.includes(keyword)) score += 1;
      }
      if (authIssue) {
        if (loweredPath.endsWith('/loginpage.jsx')) score += 30;
        if (loweredPath.endsWith('/authcontext.jsx')) score += 35;
        if (loweredPath.endsWith('/authcontroller.js')) score += 30;
        if (loweredPath.endsWith('/authroutes.js')) score += 22;
        if (loweredPath.endsWith('/services/api.js')) score += 25;
        if (loweredPath.endsWith('/authmiddleware.js')) score += 20;
        if (loweredPath.endsWith('/utils/jwt.js')) score += 14;
        if (loweredPath.endsWith('/app.jsx')) score += 14;
        if (loweredPath.endsWith('/dashboardlayout.jsx')) score += 12;
        if (loweredPath.includes('/dashboard') && loweredPath.endsWith('dashboardpage.jsx')) score += 8;
        if (!aiIssue && loweredPath.endsWith('/geminiservice.js')) score = 0;
      }
      if (dashboardIssue && /\/(dashboardpage|admindashboardpage|testerdashboardpage|developerdashboardpage)\.jsx$/.test(loweredPath)) {
        score += authIssue ? 5 : 20;
      }

      return { file, relative, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.relative.localeCompare(right.relative))
    .slice(0, 8);
}

function occurrencesOf(text, snippet) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(snippet, offset)) !== -1) {
    count++;
    offset += snippet.length;
  }
  return count;
}

function resolveSourceFile(rootPath, relativePath) {
  const root = normalizeRoot(rootPath);
  if (!isAllowedSourcePath(relativePath)) return null;
  const target = path.resolve(root, relativePath);
  const normalized = normalizeRelativePath(target, root);
  if (!normalized || normalized !== relativePath.replace(/\\/g, '/').replace(/^\.\/+/, '')) return null;
  if (!fs.existsSync(target) || !fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink()) return null;
  const realTarget = fs.realpathSync(target);
  if (!normalizeRelativePath(realTarget, root)) return null;
  return target;
}

function createPatchProposal({ rootPath, issueId, userId, patch }) {
  const root = normalizeRoot(rootPath);
  const relativePath = typeof patch?.filePath === 'string'
    ? patch.filePath.replace(/\\/g, '/').replace(/^\.\/+/, '')
    : '';
  const target = resolveSourceFile(root, relativePath);
  if (!target) {
    return {
      available: false,
      status: 'invalid_target',
      explanation: 'The proposed path is outside the permitted application source directories.',
    };
  }

  if (
    typeof patch.originalCode !== 'string'
    || !patch.originalCode.trim()
    || typeof patch.proposedCode !== 'string'
    || !patch.proposedCode.trim()
    || patch.originalCode === patch.proposedCode
  ) {
    return {
      available: false,
      status: 'invalid_patch',
      explanation: 'The proposal did not include a distinct, reviewable source-code replacement.',
    };
  }

  const originalContent = fs.readFileSync(target, 'utf8');
  if (occurrencesOf(originalContent, patch.originalCode) !== 1) {
    return {
      available: false,
      status: 'ambiguous_patch',
      explanation: 'The original snippet must match exactly once in the current source file.',
    };
  }

  const proposalId = crypto.randomUUID();
  const sourceHash = crypto.createHash('sha256').update(originalContent).digest('hex');
  pendingProposals.set(proposalId, {
    rootPath: root,
    issueId: issueId || null,
    userId: userId || null,
    filePath: relativePath,
    originalCode: patch.originalCode,
    proposedCode: patch.proposedCode,
    sourceHash,
    createdAt: Date.now(),
  });

  return {
    available: true,
    status: 'proposed',
    proposalId,
    filePath: relativePath,
    originalCode: patch.originalCode,
    suggestedCode: patch.proposedCode,
    sourceHash,
    rootCause: patch.rootCause,
    explanation: patch.explanation,
    possibleRisks: Array.isArray(patch.risks) ? patch.risks : [],
  };
}

async function buildFixSuggestion(issueData, projectInfo = {}, userId) {
  const root = normalizeRoot(projectInfo.repoPath);
  const relevantFiles = matchRelevantFiles(issueData, root);
  if (relevantFiles.length === 0) {
    return {
      available: false,
      status: 'missing_source',
      relevantFiles: [],
      explanation: 'No eligible application source files matched this issue. No code change was generated.',
    };
  }

  const sourceFiles = relevantFiles.slice(0, 8).map((item) => ({
    path: item.relative,
    source: fs.readFileSync(item.file, 'utf8'),
  }));
  const generated = await geminiService.generateCodeFix(issueData, sourceFiles);
  if (!generated?.available) {
    return {
      available: false,
      status: generated?.status || 'generation_unavailable',
      relevantFiles: relevantFiles.map((item) => item.relative),
      explanation: generated?.explanation || 'No verified source patch was generated.',
    };
  }

  const allowedCandidatePaths = new Set(sourceFiles.map((file) => file.path));
  const generatedPath = typeof generated.filePath === 'string'
    ? generated.filePath.replace(/\\/g, '/').replace(/^\.\/+/, '')
    : '';
  if (!allowedCandidatePaths.has(generatedPath)) {
    return {
      available: false,
      status: 'invalid_target',
      relevantFiles: relevantFiles.map((item) => item.relative),
      explanation: 'The generated patch did not target one of the source files inspected for this issue.',
    };
  }

  const proposal = createPatchProposal({
    rootPath: root,
    issueId: issueData.id,
    userId,
    patch: { ...generated, filePath: generatedPath },
  });
  return {
    ...proposal,
    relevantFiles: relevantFiles.map((item) => item.relative),
  };
}

function buildConfirmedInfo(issueData) {
  return [
    issueData.issueKey && `Issue: ${issueData.issueKey}`,
    issueData.title && `Title: ${issueData.title}`,
    issueData.severity && `Severity: ${issueData.severity}`,
    issueData.priority && `Priority: ${issueData.priority}`,
    issueData.project?.name && `Project: ${issueData.project.name}`,
    issueData.status && `Current status: ${issueData.status}`,
  ].filter(Boolean);
}

async function analyzeIssueFix({ issueId, issueData, userId } = {}) {
  let finalIssue = issueData || {};
  if (issueId) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        project: { select: { id: true, name: true, githubRepository: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    if (!issue) {
      const error = new Error('Issue not found.');
      error.statusCode = 404;
      throw error;
    }
    finalIssue = issue;
  }

  const relevantFiles = matchRelevantFiles(finalIssue);
  const fix = await buildFixSuggestion(finalIssue, {}, userId);
  return {
    projectName: finalIssue.project?.name || 'Current project',
    repository: finalIssue.project?.githubRepository || 'Local application workspace',
    sourceStatus: relevantFiles.length ? 'local_application_source_reviewed' : 'source_unavailable',
    confirmedInformation: buildConfirmedInfo(finalIssue),
    assumptions: [
      'File relevance is determined from application source paths and static code text.',
      'Static inspection does not reproduce the runtime failure or prove its cause.',
      ...(fix.available ? [] : ['No source patch was generated; no code was changed.']),
    ],
    possibleRootCause: fix.available
      ? fix.rootCause || 'The generated patch did not provide a confirmed root cause.'
      : 'The exact runtime root cause is not established by static file matching alone.',
    affectedModules: relevantFiles.map((item) => item.relative),
    relevantFiles: relevantFiles.map((item) => item.relative),
    recommendedSolution: fix.available
      ? fix.explanation
      : 'Reproduce the issue and inspect the listed application source files; a patch requires an explicit, verified proposal.',
    potentialSideEffects: fix.possibleRisks || [],
    suggestedValidationSteps: [
      'Reproduce the reported steps and capture the browser console and network response.',
      'Review the complete original and replacement snippets before approval.',
      'Run the relevant tests and verify the source file after applying or rolling back.',
    ],
    engine: fix.available ? 'Gemini source proposal (developer review required)' : 'Local static source analysis',
    fix,
  };
}

async function analyzeRepository({ projectId } = {}) {
  let project = null;
  if (projectId) {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, githubRepository: true },
    });
    if (!project) {
      const error = new Error('Project not found.');
      error.statusCode = 404;
      throw error;
    }
  }

  const root = repositoryRoot();
  const files = listRepositoryFiles(root);
  return {
    projectName: project?.name || null,
    repositoryUrl: project?.githubRepository || null,
    repoRoot: root,
    available: files.length > 0,
    source: files.length > 0 ? 'local_application_source' : 'no_local_application_source',
    relevantFiles: files.map((file) => normalizeRelativePath(file, root)),
    note: 'Analysis is restricted to client/src and server/src; seed data, tests, generated files, dependencies, and backups are excluded.',
  };
}

function validateFixAgainstSource(issueData, projectInfo = {}) {
  const root = normalizeRoot(projectInfo.repoPath);
  const relevantFiles = matchRelevantFiles(issueData || {}, root);
  return {
    status: relevantFiles.length ? 'source_matches_found' : 'no_source_match',
    checkedFiles: relevantFiles.map((item) => item.relative),
    checks: [
      'Only client/src and server/src files are considered patch targets.',
      'Patch application requires exact source-hash validation and explicit approval.',
      'Backups and a rollback manifest are created before a source write.',
    ],
    syntaxCheck: 'not_run',
    reason: relevantFiles.length
      ? 'Relevant source files were located. No patch syntax or runtime validation is claimed by this static check.'
      : 'No eligible application source file matched the issue.',
  };
}

async function validateFixProcess({ issueData, runFullValidation = false } = {}) {
  const validation = validateFixAgainstSource(issueData || {});
  if (!runFullValidation) {
    return {
      status: 'static_validation_complete',
      validation,
      message: 'Static source validation completed. No build or test command was run.',
    };
  }

  const root = repositoryRoot();
  const summary = { status: 'validation_run', validation, commands: [] };
  const commandEnvironment = { ...process.env };
  delete commandEnvironment.NODE_CHANNEL_FD;
  delete commandEnvironment.NODE_UNIQUE_ID;
  const commands = [
    {
      name: 'backend-tests',
      cwd: path.join(root, 'server'),
      args: [
        path.join(root, 'server', 'node_modules', 'vitest', 'vitest.mjs'),
        'run',
        '--pool=threads',
      ],
    },
    {
      name: 'frontend-build',
      cwd: path.join(root, 'client'),
      args: [path.join(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
    },
  ];

  const results = [];
  for (const { name, cwd, args } of commands) {
    const command = ['node', path.relative(root, args[0]), ...args.slice(1)].join(' ');
    summary.commands.push({ name, command, cwd: path.relative(root, cwd) });
    try {
      const { stdout = '', stderr = '' } = await execFileAsync(
        process.execPath,
        args,
        {
          cwd,
          env: commandEnvironment,
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 4 * 1024 * 1024,
        },
      );
      results.push({ name, ok: true, output: `${stdout}${stderr}`.slice(-2000) });
    } catch (error) {
      results.push({
        name,
        ok: false,
        error: {
          message: error.message,
          output: `${error.stdout || ''}${error.stderr || ''}`.slice(-4000),
        },
      });
    }
  }
  for (const result of results) {
    summary[result.name === 'backend-tests' ? 'backendTests' : 'frontendBuild'] = result;
  }
  if (results.some((result) => !result.ok)) {
    summary.status = 'validation_failed';
  }
  return summary;
}

function readManifest(rootPath, operationId) {
  if (typeof operationId !== 'string' || !/^[a-f0-9-]{36}$/i.test(operationId)) return null;
  const root = normalizeRoot(rootPath);
  const operationDirectory = path.resolve(root, '.bugtrack-ai-fix-backups', operationId);
  const relative = normalizeRelativePath(operationDirectory, root);
  if (!relative || relative.split('/')[0] !== '.bugtrack-ai-fix-backups') return null;
  const manifestPath = path.join(operationDirectory, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  return { root, operationDirectory, manifestPath, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
}

function getFixHistory(issueId, rootPath = repositoryRoot()) {
  if (typeof issueId !== 'string' || !issueId) return [];
  const root = normalizeRoot(rootPath);
  const backupDirectory = path.join(root, '.bugtrack-ai-fix-backups');
  if (!fs.existsSync(backupDirectory)) return [];

  return fs.readdirSync(backupDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^[a-f0-9-]{36}$/i.test(entry.name))
    .map((entry) => {
      const stored = readManifest(root, entry.name);
      return stored?.manifest;
    })
    .filter((manifest) => manifest && manifest.issueId === issueId)
    .sort((left, right) => right.appliedAt.localeCompare(left.appliedAt));
}

function applyApprovedFix({ proposalId, issueId, userId, approved } = {}) {
  if (approved !== true) {
    const error = new Error('Explicit developer approval is required before applying a source patch.');
    error.statusCode = 400;
    throw error;
  }
  const proposal = pendingProposals.get(proposalId);
  if (!proposal || Date.now() - proposal.createdAt > PENDING_PROPOSAL_TTL) {
    pendingProposals.delete(proposalId);
    const error = new Error('Patch proposal is missing or expired. Generate and review a new proposal.');
    error.statusCode = 410;
    throw error;
  }
  if (proposal.issueId && proposal.issueId !== issueId) {
    const error = new Error('Patch proposal does not belong to this issue.');
    error.statusCode = 400;
    throw error;
  }
  if (proposal.userId && proposal.userId !== userId) {
    const error = new Error('Patch proposal belongs to another developer session.');
    error.statusCode = 403;
    throw error;
  }

  const target = resolveSourceFile(proposal.rootPath, proposal.filePath);
  if (!target) {
    const error = new Error('Patch target is no longer an eligible source file.');
    error.statusCode = 400;
    throw error;
  }
  const currentContent = fs.readFileSync(target, 'utf8');
  const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');
  if (currentHash !== proposal.sourceHash || occurrencesOf(currentContent, proposal.originalCode) !== 1) {
    const error = new Error('Source file changed after proposal generation. Generate and review a new patch.');
    error.statusCode = 409;
    throw error;
  }

  const nextContent = currentContent.replace(proposal.originalCode, proposal.proposedCode);
  if (nextContent === currentContent) {
    const error = new Error('Patch would not change the source file.');
    error.statusCode = 400;
    throw error;
  }

  const operationId = crypto.randomUUID();
  const backupRoot = path.join(proposal.rootPath, '.bugtrack-ai-fix-backups', operationId);
  const backupPath = path.join(backupRoot, ...proposal.filePath.split('/'));
  const relativeBackupPath = normalizeRelativePath(backupPath, proposal.rootPath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(target, backupPath);

  const temporaryPath = `${target}.${operationId}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, nextContent, { encoding: 'utf8', mode: fs.statSync(target).mode });
    fs.renameSync(temporaryPath, target);
    const appliedHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    const manifest = {
      operationId,
      issueId: issueId || null,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      appliedBy: userId || null,
      appliedFiles: [proposal.filePath],
      backupDirectory: normalizeRelativePath(backupRoot, proposal.rootPath),
      files: [{
        filePath: proposal.filePath,
        backupPath: relativeBackupPath,
        originalHash: proposal.sourceHash,
        appliedHash,
      }],
    };
    fs.writeFileSync(path.join(backupRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    pendingProposals.delete(proposalId);
    return {
      status: 'applied',
      patchStatus: 'applied',
      operationId,
      appliedFiles: manifest.appliedFiles,
      modifiedFiles: manifest.appliedFiles,
      backupDirectory: manifest.backupDirectory,
      appliedAt: manifest.appliedAt,
    };
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    if (fs.existsSync(backupPath)) fs.copyFileSync(backupPath, target);
    throw error;
  }
}

function rollbackAppliedFix({ operationId, issueId, userId, isAdmin = false, rootPath } = {}) {
  const stored = readManifest(rootPath || repositoryRoot(), operationId);
  if (!stored || stored.manifest.issueId !== issueId) {
    const error = new Error('Applied patch operation was not found for this issue.');
    error.statusCode = 404;
    throw error;
  }
  const manifest = stored.manifest;
  if (manifest.status !== 'applied') {
    const error = new Error(`Patch operation cannot be rolled back from status '${manifest.status}'.`);
    error.statusCode = 409;
    throw error;
  }
  if (!isAdmin && manifest.appliedBy !== userId) {
    const error = new Error('Only the developer who applied this patch or an administrator can roll it back.');
    error.statusCode = 403;
    throw error;
  }

  for (const file of manifest.files) {
    const target = resolveSourceFile(stored.root, file.filePath);
    const backupPath = path.resolve(stored.root, file.backupPath);
    if (!target || !normalizeRelativePath(backupPath, stored.operationDirectory)) {
      const error = new Error('Rollback paths failed source-boundary validation.');
      error.statusCode = 400;
      throw error;
    }
    if (!fs.existsSync(backupPath) || !fs.existsSync(target)) {
      const error = new Error('Source or backup file is missing; rollback was not performed.');
      error.statusCode = 409;
      throw error;
    }
    const appliedHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (appliedHash !== file.appliedHash) {
      const error = new Error('Source file changed after the patch was applied. Rollback stopped to avoid overwriting newer work.');
      error.statusCode = 409;
      throw error;
    }
  }

  for (const file of manifest.files) {
    const target = resolveSourceFile(stored.root, file.filePath);
    const backupPath = path.resolve(stored.root, file.backupPath);
    const temporaryPath = `${target}.${operationId}.rollback.tmp`;
    fs.copyFileSync(backupPath, temporaryPath);
    fs.renameSync(temporaryPath, target);
  }
  manifest.status = 'rolled_back';
  manifest.rolledBackAt = new Date().toISOString();
  fs.writeFileSync(stored.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return {
    status: manifest.status,
    rolledBackFiles: manifest.appliedFiles,
    backupDirectory: manifest.backupDirectory,
    rolledBackAt: manifest.rolledBackAt,
  };
}

module.exports = {
  analyzeIssueFix,
  analyzeRepository,
  buildFixSuggestion,
  createPatchProposal,
  validateFixAgainstSource,
  applyApprovedFix,
  rollbackAppliedFix,
  getFixHistory,
  validateFixProcess,
  matchRelevantFiles,
  listRepositoryFiles,
  isAllowedSourcePath,
};
