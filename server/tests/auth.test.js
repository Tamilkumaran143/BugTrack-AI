import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Authentication API Suite', () => {
  it('should reject unauthenticated request to protected endpoint', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it.each([
    { role: 'ADMIN', email: 'admin@bugtrack.ai', password: 'Admin@123' },
    { role: 'TESTER', email: 'tester@bugtrack.ai', password: 'Tester@123' },
    { role: 'DEVELOPER', email: 'developer@bugtrack.ai', password: 'Developer@123' },
  ])('should successfully log in the $role account', async ({ role, email, password }) => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe(role);
    expect(res.body.data.token).toBeDefined();
  });

  it('should report live backend and database health without exposing secrets', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
    expect(typeof res.body.geminiConfigured).toBe('boolean');
    expect(typeof res.body.fixAssistantSourceSharingEnabled).toBe('boolean');
    expect(JSON.stringify(res.body)).not.toContain('GEMINI_API_KEY');
    expect(JSON.stringify(res.body)).not.toContain('JWT_SECRET');
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@bugtrack.ai',
        password: 'WrongPassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should register a new user with chosen role and skills', async () => {
    const testEmail = `newtester_${Date.now()}@bugtrack.ai`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Automated Test User',
        email: testEmail,
        password: 'Password@123',
        role: 'TESTER',
        skills: 'Jest, Supertest, Vitest, API Testing',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe('TESTER');
    expect(res.body.data.token).toBeDefined();
  });

  it('should prevent public self-registration as an administrator', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Unauthorized Admin',
        email: `unauthorized_admin_${Date.now()}@bugtrack.ai`,
        password: 'Password@123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should validate registration inputs before writing a user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Invalid', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return current user profile via /api/auth/me with valid Bearer token', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@bugtrack.ai',
        password: 'Admin@123',
      });

    const token = loginRes.body.data.token;

    // 2. Fetch /me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('admin@bugtrack.ai');
    expect(meRes.body.data.role).toBe('ADMIN');
  });
});
