import { existsSync } from 'node:fs';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { ENV_FILE } from '../database/database.config';

export function jwtOptions(): JwtModuleOptions {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const secret = process.env.JWT_SECRET;
  if (!secret || !/^[a-f0-9]{128}$/i.test(secret)) {
    throw new Error(
      'JWT_SECRET must be a securely generated 64-byte hexadecimal secret.',
    );
  }
  if (process.env.JWT_EXPIRES_IN !== '30m') {
    throw new Error('JWT_EXPIRES_IN must be 30m.');
  }
  return {
    secret,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '30m',
      issuer: 'sgms',
      audience: 'sgms-api',
    },
    verifyOptions: {
      algorithms: ['HS256'],
      issuer: 'sgms',
      audience: 'sgms-api',
    },
  };
}
