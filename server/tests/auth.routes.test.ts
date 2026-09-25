// @ts-nocheck
/**
 * tests/auth.routes.test.js
 * Integration tests for /register and /login endpoints using Supertest.
 * Uses an in-memory MongoDB instance (mongodb-memory-server) so no real DB needed.
 *
 * Run:  npm test
 */

// Must set JWT_SECRET before any module load that throws on missing env var
process.env.JWT_SECRET = 'test-secret-for-jest-only';
process.env.MONGO_URI = 'mongodb://localhost/test'; // overridden by MongoMemoryServer below

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import authRouter from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/api', authRouter);

// Increase timeout for mongodb-memory-server
jest.setTimeout(30000);

// ─── DB setup ────────────────────────────────────────────────────────────────
let mongoServer;

beforeAll(async () => {
  // Dynamically import MongoMemoryServer to avoid hard dependency in production
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    // If not installed, skip integration tests gracefully
    console.warn('mongodb-memory-server not installed — skipping DB integration tests');
    return;
  }
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/register', () => {
  const validPayload = { name: 'Alice', email: 'alice@example.com', password: 'password123' };

  test('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/register').send(validPayload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/api/register').send(validPayload);
    const res = await request(app).post('/api/register').send(validPayload);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already registered/i);
  });

  test('rejects missing name (422 from validator)', async () => {
    const res = await request(app).post('/api/register').send({ email: 'x@x.com', password: 'password123' });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors[0].msg).toMatch(/name is required/i);
  });

  test('rejects invalid email (422 from validator)', async () => {
    const res = await request(app).post('/api/register').send({ name: 'Bob', email: 'not-an-email', password: 'password123' });
    expect(res.statusCode).toBe(422);
  });

  test('rejects short password (422 from validator)', async () => {
    const res = await request(app).post('/api/register').send({ name: 'Bob', email: 'bob@example.com', password: 'short' });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors[0].msg).toMatch(/8 characters/i);
  });
});

describe('POST /api/login', () => {
  beforeEach(async () => {
    // Pre-create a user
    await request(app).post('/api/register').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    });
  });

  test('logs in successfully with correct credentials', async () => {
    const res = await request(app).post('/api/login').send({ email: 'alice@example.com', password: 'password123' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('alice@example.com');
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/login').send({ email: 'alice@example.com', password: 'wrongpassword' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/api/login').send({ email: 'ghost@example.com', password: 'password123' });
    expect(res.statusCode).toBe(400);
  });

  test('rejects missing password (422 from validator)', async () => {
    const res = await request(app).post('/api/login').send({ email: 'alice@example.com' });
    expect(res.statusCode).toBe(422);
  });

  test('rejects invalid email format (422 from validator)', async () => {
    const res = await request(app).post('/api/login').send({ email: 'not-email', password: 'password123' });
    expect(res.statusCode).toBe(422);
  });
});

