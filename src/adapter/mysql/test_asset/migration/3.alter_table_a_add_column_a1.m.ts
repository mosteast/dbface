import { T_database, T_migration_module } from '../../../../type';

const migration: T_migration_module = {
  async forward(database: T_database): Promise<void> {
    await database.query(`alter table a add a1 int(11)`);
  },
  async backward(database: T_database): Promise<void> {
    await database.query(`alter table a drop a1`, [], { log: true });
  },
};

module.exports = migration;