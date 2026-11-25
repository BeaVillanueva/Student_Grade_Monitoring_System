import { randomBytes } from 'node:crypto';
import { jwtOptions } from './auth.config';

describe('JWT configuration fails closed', () => {
  const previous = {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRES_IN,
  };
  afterEach(() => {
    if (previous.secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.secret;
    if (previous.expiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = previous.expiry;
  });
  it('rejects weak secrets', () => {
    process.env.JWT_SECRET = 'weak';
    process.env.JWT_EXPIRES_IN = '30m';
    expect(() => jwtOptions()).toThrow('JWT_SECRET must be');
  });
  it('requires the approved token lifetime', () => {
    process.env.JWT_SECRET = randomBytes(64).toString('hex');
    process.env.JWT_EXPIRES_IN = '7d';
    expect(() => jwtOptions()).toThrow('JWT_EXPIRES_IN must be 30m');
  });
});
