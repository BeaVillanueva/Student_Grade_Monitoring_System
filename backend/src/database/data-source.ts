import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config';

// CLI migrations use the DDL account; the application uses the DML-only account.
export default new DataSource(databaseOptions('migration'));
