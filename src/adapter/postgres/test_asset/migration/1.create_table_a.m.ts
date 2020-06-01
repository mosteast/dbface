import { Database} from '../../../../rds/database';
import { T_migration_module } from '../../../../type';

const migration: T_migration_module = {
  async forward(database: Database): Promise<void> {
    await database.query(`create table if not exists "a" (id serial)`);
  },
  async backward(database: Database): Promise<void> {
    await database.database_drop('a');
  },
};

module.exports = migration;