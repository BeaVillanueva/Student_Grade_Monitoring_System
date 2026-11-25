import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { sgmsMysqlDriver } from './mysql-driver';
import {
  User,
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  AuditLog,
} from './entities';
import { InitialSgmsSchema1795564800000 } from './migrations/1795564800000-InitialSgmsSchema';

export const ENV_FILE = resolve(__dirname, '../../.env');
export const ENTITIES = [
  User,
  Subject,
  Enrollment,
  Grade,
  GradeInquiry,
  AuditLog,
];

export function databaseOptions(
  mode: 'runtime' | 'migration' = 'runtime',
): DataSourceOptions {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const env = process.env;
  if (
    env.DB_TYPE !== 'mariadb' ||
    env.DB_HOST !== '127.0.0.1' ||
    env.DB_PORT !== '3306' ||
    env.DB_DATABASE !== 'student_grade_monitoring_db'
  ) {
    throw new Error(
      'Database configuration must target the approved local SGMS database.',
    );
  }
  if (env.DB_SYNCHRONIZE !== 'false') {
    throw new Error('DB_SYNCHRONIZE must be false; use explicit migrations.');
  }
  const username =
    mode === 'migration' ? env.DB_MIGRATION_USERNAME : env.DB_USERNAME;
  const password =
    mode === 'migration' ? env.DB_MIGRATION_PASSWORD : env.DB_PASSWORD;
  const expected = mode === 'migration' ? 'sgms_migrator' : 'sgms_app';
  if (username !== expected || !password || password.length < 24) {
    throw new Error('Dedicated SGMS credentials are missing or invalid.');
  }
  return {
    type: 'mariadb',
    driver: sgmsMysqlDriver,
    host: '127.0.0.1',
    port: 3306,
    database: 'student_grade_monitoring_db',
    username,
    password,
    entities: ENTITIES,
    migrations: [InitialSgmsSchema1795564800000],
    migrationsTableName: 'sgms_migrations',
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    migrationsTransactionMode: 'none',
    logging: false,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    connectTimeout: 5000,
    multipleStatements: false,
  };
}
