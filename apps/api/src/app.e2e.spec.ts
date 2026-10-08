import './testing/test-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { PrismaService } from './prisma/prisma.service';

// No database needed: PrismaService is replaced by a stub. This verifies DI wiring, the global
// JWT guard, validation, the response envelope and that the Swagger document builds.
describe('App (HTTP, no database)', () => {
  let app: INestApplication;
  let openApi: ReturnType<typeof configureApp>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: async () => undefined,
        $disconnect: async () => undefined,
        $queryRaw: async () => [{ '?column?': 1 }],
        user: { findUnique: async () => null },
      })
      .compile();

    app = moduleRef.createNestApplication();
    openApi = configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public and uses the success envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'ok' }) }));
  });

  it.each(['/accounts', '/transactions', '/dashboard', '/reports/net-worth', '/budgets', '/debts', '/recurring', '/todos', '/push/public-key'])(
    'GET %s without a token -> 401',
    async (path) => {
      const res = await request(app.getHttpServer()).get(path).expect(401);
      expect(res.body.success).toBe(false);
    },
  );

  it('rejects a forged token', async () => {
    await request(app.getHttpServer()).get('/accounts').set('Authorization', 'Bearer not.a.jwt').expect(401);
  });

  it('POST /auth/register validates input and lists every problem', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'nope', password: '123', name: '' })
      .expect(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects unknown properties (mass-assignment protection)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@b.com', password: 'x', isAdmin: true })
      .expect(400);
    expect(JSON.stringify(res.body.errors)).toContain('isAdmin');
  });

  it('documents the main routes in OpenAPI', () => {
    const paths = Object.keys(openApi.paths);
    for (const p of ['/auth/login', '/transactions', '/transfers', '/budgets', '/debts/{id}/payments', '/reports/cash-flow', '/dashboard']) {
      expect(paths).toContain(p);
    }
  });
});
