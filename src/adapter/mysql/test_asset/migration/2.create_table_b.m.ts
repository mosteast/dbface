import { Database, T_migration_module } from '../../../../rds/database';

const migration: T_migration_module = {
  async forward(database: Database): Promise<void> {
    await database.query(`create table if not exists b (id serial)`);
  },
  async backward(database: Database): Promise<void> {
    await database.database_drop('b');
  },
};

module.exports = migration;