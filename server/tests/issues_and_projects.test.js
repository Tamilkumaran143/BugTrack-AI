import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Project & Issue Lifecycle Integration Suite', () => {
  let adminToken;
  let testerToken;
  let devToken;
  let testProjectId;
  let createdIssueId;

  beforeAll(async () => {
    // Admin login
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@bugtrack.ai', password: 'Admin@123' });
    adminToken = adminLogin.body.data.token;

    // Tester login
    const testerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tester@bugtrack.ai', password: 'Tester@123' });
    testerToken = testerLogin.body.data.token;

    // Dev login
    const devLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'developer@bugtrack.ai', password: 'Developer@123' });
    devToken = devLogin.body.data.token;
  });

  it('should allow ADMIN to create a new project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Automated Test Project ${Date.now()}`,
        description: 'End-to-end verification workspace for automated tests.',
        githubRepository: 'https://github.com/facebook/react',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    testProjectId = res.body.data.id;
  });

  it('should list projects', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('should allow TESTER to report a bug with auto-generated issueKey', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        projectId: testProjectId,
        title: 'Checkout button unresponsive during high network latency',
        description: 'Submitting payment form during poor network results in spinning wheel that never resolves.',
        stepsToReproduce: '1. Select credit card\n2. Throttle network to Slow 3G\n3. Click pay',
        expectedResult: 'Timeout feedback message or retry button shown.',
        actualResult: 'UI hangs indefinitely with no response.',
        severity: 'HIGH',
        priority: 'HIGH',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.issueKey).toBeDefined();
    expect(res.body.data.status).toBe('OPEN');
    createdIssueId = res.body.data.id;
  });

  it('should allow ADMIN to assign developer to the issue', async () => {
    // Get developer id
    const usersRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const developerUser = usersRes.body.data.find((u) => u.email === 'developer@bugtrack.ai');

    const res = await request(app)
      .patch(`/api/issues/${createdIssueId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assigneeId: developerUser.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assigneeId).toBe(developerUser.id);
    expect(res.body.data.status).toBe('ASSIGNED');
  });

  it('should allow DEVELOPER to transition status to IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/issues/${createdIssueId}/status`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('should allow DEVELOPER to move issue to READY_FOR_TESTING', async () => {
    const res = await request(app)
      .patch(`/api/issues/${createdIssueId}/status`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ status: 'READY_FOR_TESTING' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('READY_FOR_TESTING');
  });

  it('should allow QA TESTER to fail regression verification and auto-reopen issue', async () => {
    const res = await request(app)
      .post(`/api/issues/${createdIssueId}/verification`)
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        result: 'FAILED',
        testNotes: 'Regression test failed on Firefox: button still hangs under 3G throttling.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verification.result).toBe('FAILED');
    expect(res.body.data.issue.status).toBe('REOPENED');
  });

  it('should allow QA TESTER to pass verification and auto-close issue', async () => {
    // 1. Move back to READY_FOR_TESTING
    await request(app)
      .patch(`/api/issues/${createdIssueId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'READY_FOR_TESTING' });

    // 2. Submit PASSED verification
    const res = await request(app)
      .post(`/api/issues/${createdIssueId}/verification`)
      .set('Authorization', `Bearer ${testerToken}`)
      .send({
        result: 'PASSED',
        testNotes: 'Re-tested with network timeout handler: prompt properly notifies user after 8s.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verification.result).toBe('PASSED');
    expect(res.body.data.issue.status).toBe('CLOSED');
  });
});
