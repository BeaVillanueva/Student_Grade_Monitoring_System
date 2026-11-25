import * as mysql2 from 'mysql2';

// XAMPP's global SQL mode is permissive. Configure ONLY SGMS pool sessions.
// The connection event queues this statement before TypeORM's first query.
export const sgmsMysqlDriver: {
  createPool(options: mysql2.PoolOptions): mysql2.Pool;
} = {
  ...mysql2,
  createPool(options: mysql2.PoolOptions) {
    const pool = mysql2.createPool(options);
    pool.on('connection', (connection) => {
      connection.query(
        "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ZERO_DATE,NO_ZERO_IN_DATE,NO_ENGINE_SUBSTITUTION', time_zone = '+00:00'",
        (error) => {
          if (error) connection.destroy();
        },
      );
    });
    return pool;
  },
};
