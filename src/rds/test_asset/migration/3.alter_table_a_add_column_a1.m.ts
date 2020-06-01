import { T_migration_module } from '../../../type';
import { Database } from '../../database';

const migration: T_migration_module = {
  async forward(database: Database): Promise<void> {
    await database.query(`alter table "a" add "a1" int`);
  },
  async backward(database: Database): Promise<void> {
    await database.query(`alter table "a" drop "a1"`, [], { log: true });
  },
};

module.exports = migration;