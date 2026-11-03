import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import request from 'supertest';
import app from '../src/app';
import config from '../src/config';

describe('AI Engine & GitHub Integration Suite', () => {
  let testerToken;
  let devToken;
  let sampleProjectId;

  beforeAll(async () => {
    const testerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tester@bugtrack.ai', password: 'Tester@123' });
    testerToken = testerLogin.body.data.token;

    const devLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'developer@bugtrack.ai', password: 'Developer@123' });
    devToken = devLogin.body.data.token;

    const projRes = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${testerToken}`);
    sampleProjectId = projRes.body.data[0].id;
  });

  it('should structure raw defect text into JSON bug report via AI engine', async () => {
    const rawInput = 'After updating my profile picture, clicking the save button makes the profile page blank with a crash error.';
    const res = await request(app)
      .post('/api/ai/structure-report')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({ rawDescription: rawInput });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const report = res.body.data;
    expect(report.title).toBeDefined();
    expect(report.stepsToReproduce).toBeDefined();
    expect(report.expectedResult).toBeDefined();
    expect(report.actualResult).toBeDefined();
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(report.severity);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(report.priority);
    expect(report.engine).toBeDefined();
    expect(typeof report.isFallback).toBe('boolean');
  });

  it('should detect duplicate issues with similarity percentage and matched keywords', async () => {
    const res = await request(app)
      .post('/api/ai/find-duplicates')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        projectId: sampleProjectId,
        title: 'Authentication token expiration causes blank dashboard screen',
        description: 'When JWT access token expires after 15 minutes, axios interceptor renders empty white screen',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const topMatch = res.body.data[0];
      expect(topMatch.similarityPercentage).toBeGreaterThan(15);
      expect(topMatch.issueKey).toBeDefined();
      expect(Array.isArray(topMatch.matchedKeywords)).toBe(true);
    }
  });

  it('should recommend developer based on skills match and active workload balance', async () => {
    const res = await request(app)
      .post('/api/ai/recommend-developer')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        projectId: sampleProjectId,
        title: 'React WebSocket disconnect in cluster telemetry view',
        description: 'Need frontend and Node engineer with WebSocket and React experience',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstChoice = res.body.data[0];
    expect(firstChoice.developerId).toBeDefined();
    expect(firstChoice.name).toBeDefined();
    expect(firstChoice.matchScore).toBeDefined();
    expect(firstChoice.rationale).toBeDefined();
  });

  it('should analyze PR code changes and assess risk, affected modules, and regression test cases', async () => {
    const prData = {
      repository: 'facebook/react',
      prNumber: 9999,
      title: 'fix(auth): sanitize JWT token refresh headers',
      changedFiles: [
        'server/src/middleware/authMiddleware.js',
        'server/src/utils/jwt.js',
        'client/src/services/api.js',
      ],
      body: 'Patches auth token refresh loop and adds validation.',
    };

    const res = await request(app)
      .post('/api/ai/review-change')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        prData,
        issueData: {
          issueKey: 'SEC-99',
          title: 'JWT Refresh Loop Vulnerability',
          description: 'Access tokens fail to refresh correctly.',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const analysis = res.body.data;
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(analysis.riskLevel);
    expect(analysis.changeSummary).toBeDefined();
    expect(Array.isArray(analysis.affectedModules)).toBe(true);
    expect(Array.isArray(analysis.potentialRisks)).toBe(true);
    expect(Array.isArray(analysis.suggestedRegressionTests)).toBe(true);
    expect(analysis.rationale).toBeDefined();
    expect(analysis.disclaimer).toBeDefined();
  });

  it('should analyze an issue with the AI Fix Assistant and produce a structured review', async () => {
    const res = await request(app)
      .post('/api/ai/fix-assistant/analyze')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        issueData: {
          title: 'Login button hangs after token refresh',
          description: 'After the session refreshes, the login button becomes unresponsive and the user cannot continue.',
          stepsToReproduce: '1. Sign in\n2. Wait for token refresh\n3. Click Login again',
          expectedResult: 'User should be redirected or shown a valid message.',
          actualResult: 'Button hangs and UI remains blocked.',
          severity: 'HIGH',
          priority: 'HIGH',
          project: { name: 'BugTrack AI', githubRepository: 'https://github.com/example/project' },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.possibleRootCause).toBeDefined();
    expect(Array.isArray(res.body.data.confirmedInformation)).toBe(true);
    expect(Array.isArray(res.body.data.assumptions)).toBe(true);
  });

  it('should evaluate the repository workspace without executing code', async () => {
    const res = await request(app)
      .post('/api/ai/fix-assistant/repository-analysis')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ repoPath: process.cwd() });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('available');
    expect(res.body.data).toHaveProperty('note');
  });

  it('should handle GitHub ping webhook with 200 response', async () => {
    const payload = { zen: 'Keep it logically awesome.' };
    const signature = `sha256=${crypto.createHmac('sha256', config.WEBHOOK_SECRET).update(JSON.stringify(payload)).digest('hex')}`;
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('x-github-event', 'ping')
      .set('x-hub-signature-256', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject unsigned GitHub webhooks', async () => {
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('x-github-event', 'ping')
      .send({ zen: 'Unsigned payload.' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
