import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

// Explicit, one-time local provisioning; never run on application startup.
const envFile = new URL('../.env', import.meta.url);
const database = 'student_grade_monitoring_db';
const accounts = ['sgms_app', 'sgms_migrator'];
let connection;
try {
  for (const path of [
    '/SGMS/',
    '/SGMS/backend/package.json',
    '/SGMS/backend/.env',
  ]) {
    const response = await fetch(`http://127.0.0.1${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 403)
      throw new Error('Apache must deny every SGMS probe with HTTP 403.');
  }
  if (existsSync(envFile))
    throw new Error('Refusing to overwrite an existing .env file.');
  connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: process.env.SGMS_ADMIN_PASSWORD ?? '',
    connectTimeout: 5000,
  });
  const [databases] = await connection.execute(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [database],
  );
  const [users] = await connection.execute(
    'SELECT User FROM mysql.user WHERE User IN (?, ?)',
    accounts,
  );
  if (databases.length || users.length)
    throw new Error(
      'SGMS database or account already exists; refusing to modify it.',
    );
  const appPassword = randomBytes(32).toString('hex');
  const migrationPassword = randomBytes(32).toString('hex');
  await connection.query(
    'CREATE DATABASE `student_grade_monitoring_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  );
  await connection.query("CREATE USER 'sgms_app'@'127.0.0.1' IDENTIFIED BY ?", [
    appPassword,
  ]);
  await connection.query(
    "CREATE USER 'sgms_migrator'@'127.0.0.1' IDENTIFIED BY ?",
    [migrationPassword],
  );
  await connection.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON `student_grade_monitoring_db`.* TO 'sgms_app'@'127.0.0.1'",
  );
  await connection.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON `student_grade_monitoring_db`.* TO 'sgms_migrator'@'127.0.0.1'",
  );
  writeFileSync(
    envFile,
    [
      'NODE_ENV=development',
      'HOST=127.0.0.1',
      'PORT=3000',
      'DB_TYPE=mariadb',
      'DB_HOST=127.0.0.1',
      'DB_PORT=3306',
      `DB_DATABASE=${database}`,
      'DB_USERNAME=sgms_app',
      `DB_PASSWORD=${appPassword}`,
      'DB_SYNCHRONIZE=false',
      'DB_MIGRATION_USERNAME=sgms_migrator',
      `DB_MIGRATION_PASSWORD=${migrationPassword}`,
      'JWT_SECRET=',
      'JWT_EXPIRES_IN=30m',
      '',
    ].join('\n'),
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Apache probes: 403. Created isolated SGMS database and two local, schema-scoped accounts.',
  );
  console.log(
    'Generated credentials saved to ignored backend/.env; no administrator credentials stored.',
  );
} catch (error) {
  // Driver errors may include SQL containing secrets. Never print those details.
  console.error(
    error.code
      ? `Provisioning failed (${error.code}); no automatic cleanup attempted.`
      : error.message,
  );
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
