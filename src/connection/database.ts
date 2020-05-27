import { Database_postgres } from '../adapter/postgres/database_postgres';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { Connection, T_config_connection, T_system_config } from './connection';

export interface T_config_database extends T_config_connection {
  database: string
  system?: T_system_config & { ensure_database?: boolean }
}

/**
 * Connection with selected database
 */
export class Database extends Connection {
  // static def: T_config_database = merge(Connection.def, { system: { ensure_database: true } })
  config: T_config_database;

  adapter: Database_postgres;

  validate_config() {
    super.validate_config();
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}'); }
  }

  /**
   * Check if table exists
   * @param table - table name
   * @param database - database name
   */
  async table_exists(table: string): Promise<boolean> {
    const r = await this.query(`
      select c.relname as name 
        from pg_catalog.pg_class c 
          left join pg_catalog.pg_namespace n on n.oid = c.relnamespace 
          where pg_catalog.pg_table_is_visible(c.oid) 
            and c.relkind = 'r' 
            and relname = $1
            and relname 
          not like 'pg_%'
        order by 1`, [ table ]);

    return r.rowCount ? r : false;
  }

  /**
   * Get all tables
   */
  async table_list() {
    return this.adapter.table_list();
  }

  /**
   * Table count
   */
  async table_count(): Promise<number> {
    return this.adapter.table_count();
  }

  async table_drop(table: string) {
    return this.adapter.table_drop(table);
  }

  /**
   * Drop all tables
   */
  async table_drop_all() {
    return this.adapter.table_drop_all();
  }

  /**
   * Create migration table if not exists
   */
  async table_ensure_migration() {
    await this.adapter.table_ensure_migration();
  }

  /**
   * Create placeholder table (mostly for testing purpose)
   */
  async table_create_holder(i: number) {
    await this.adapter.table_create_holder(i);
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async init_state_migration() {
    await this.adapter.init_state_migration();
  }

  /**
   * List all migrated records
   */
  async migration_list_migrated() {
    await this.adapter.migration_list_migrated();
  }

  /**
   * List all not migrated files
   */
  async migration_list_pending(): Promise<string[]> {
    return await this.adapter.migration_list_pending();
  }

  async migration_list_files(): Promise<string[]> {
    return this.adapter.migration_list_files();
  }

  /**
   * Run migration
   */
  async migration_run(step: number = 0) {
    return this.adapter.migration_run();
  }

  /**
   * Read migration file by name (only file name)
   */
  async migration_file_read(file_name: string) {
    return this.adapter.migration_file_read(file_name);
  }

  /**
   * Build table holder name
   */
  static table_holder_name_build(i: number) {
    return `_holder${i}`;
  }
}
