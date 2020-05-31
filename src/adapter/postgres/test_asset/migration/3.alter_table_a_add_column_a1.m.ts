import { T_migration_module } from '../../../../rds/database';
import { Database_postgres } from '../../database_postgres';

const migration: T_migration_module = {
  async forward(database: Database_postgres): Promise<void> {
    await database.query(`alter table "a" add "a1" int`);
  },
  async backward(database: Database_postgres): Promise<void> {
    await database.query(`alter table "a" drop "a1"`, [], { log: true });
  },
};

module.exports = migration;