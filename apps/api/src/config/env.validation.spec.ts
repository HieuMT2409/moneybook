import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = validateEnv(valid);
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRES_IN).toBe('1d');
  });

  it('coerces PORT from string to number', () => {
    expect(validateEnv({ ...valid, PORT: '4000' }).PORT).toBe(4000);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_SECRET: valid.JWT_SECRET })).toThrow(/DATABASE_URL/);
  });
});
