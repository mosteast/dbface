import { Database} from '../../../../rds/database';
import { T_database, T_migration_module } from '../../../../type';

const migration: T_migration_module = {
  async forward(database: T_database): Promise<void> {
    await database.query(`create table if not exists b (id serial)`);
  },
  async backward(database: T_database): Promise<void> {
    await database.database_drop('b');
  },
};

module.exports = migration;