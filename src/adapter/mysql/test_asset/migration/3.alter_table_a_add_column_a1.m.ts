import { Database, T_migration_module } from '../../../../rds/database';

const migration: T_migration_module = {
  async forward(database: Database): Promise<void> {
    await database.query(`alter table a add a1 int(11)`);
  },
  async backward(database: Database): Promise<void> {
    await database.query(`alter table a drop a1`, [], { log: true });
  },
};

module.exports = migration;