// @ts-nocheck
/**
 * tests/validate.middleware.test.js
 * Unit tests for the shared validate() middleware helper.
 */
import express from 'express';
import request from 'supertest';
import { body } from 'express-validator';
import validate from '../middleware/validate';

function buildApp(validations) {
  const app = express();
  app.use(express.json());
  app.post('/test', validate(validations), (req, res) => res.json({ ok: true }));
  return app;
}

describe('validate middleware', () => {
  test('calls next() when all validations pass', async () => {
    const app = buildApp([body('name').notEmpty()]);
    const res = await request(app).post('/test').send({ name: 'Alice' });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('returns 422 when a validation fails', async () => {
    const app = buildApp([body('name').notEmpty().withMessage('Name required')]);
    const res = await request(app).post('/test').send({ name: '' });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].msg).toBe('Name required');
  });

  test('returns all errors when multiple validations fail', async () => {
    const app = buildApp([
      body('name').notEmpty().withMessage('Name required'),
      body('email').isEmail().withMessage('Email invalid'),
    ]);
    const res = await request(app).post('/test').send({ name: '', email: 'bad' });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });
});

