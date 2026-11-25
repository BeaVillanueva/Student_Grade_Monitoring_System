import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

try {
  const response = await fetch('http://127.0.0.1/SGMS/backend/.env', {
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
  });
  if (response.status !== 403)
    throw new Error('Apache protection must return HTTP 403.');
  const file = new URL('../.env', import.meta.url);
  const content = readFileSync(file, 'utf8');
  const match = content.match(/^JWT_SECRET=([^\r\n]*)\r?$/m);
  if (!match) throw new Error('JWT_SECRET placeholder is missing.');
  if (match[1]) {
    if (!/^[a-f0-9]{128}$/i.test(match[1]))
      throw new Error(
        'Existing JWT secret has an unexpected format; refusing overwrite.',
      );
    console.log('Existing strong JWT secret preserved.');
  } else {
    writeFileSync(
      file,
      content.replace(
        /^JWT_SECRET=\r?$/m,
        `JWT_SECRET=${randomBytes(64).toString('hex')}`,
      ),
      { mode: 0o600 },
    );
    console.log(
      'JWT secret configured in ignored .env; other credentials preserved.',
    );
  }
} catch {
  console.error(
    'JWT secret configuration failed. Check Apache protection and the local .env template.',
  );
  process.exitCode = 1;
}
