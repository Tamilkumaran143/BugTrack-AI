import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Authentication API Suite', () => {
  it('should reject unauthenticated request to protected endpoint', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should successfully log in demo admin user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@bugtrack.ai',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('admin@bugtrack.ai');
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.token).toBeDefined();
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
