import { Database_postgres } from '../adapter/postgres/database_postgres';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { Connection, T_config_connection, T_connection, T_system_config } from './connection';

export interface T_config_database extends T_config_connection {
  database: string
  system?: T_system_config & { ensure_database?: boolean }
}

/**
 * Connection with selected database
 */
export class Database extends Connection implements T_database {
  // static def: T_config_database = merge(Connection.def, { system: { ensure_database: true } })
  config: T_config_database;

  adapter: Database_postgres;

  /**
   * Validate database configurations
   */
  validate_config() {
    super.validate_config();
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}'); }
  }

  /**
   * Get one table info
   * @param name
   */
  async table_pick(name: string): Promise<T_table> {
    return this.adapter.table_pick(name);
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
   * Creating necessary tables and datum for migration.
   */
  async migration_init_state() {
    await this.adapter.migration_init_state();
  }

  /**
   * List all migrated records
   */
  async migration_list_migrated() {
    return this.adapter.migration_list_migrated();
  }

  /**
   * List all not migrated files
   */
  async migration_list_pending(): Promise<string[]> {
    return this.adapter.migration_list_pending();
  }

  async migration_list_files(): Promise<string[]> {
    return this.adapter.migration_list_files();
  }

  /**
   * Run migration
   */
  async migration_run(step: number = 0) {
    return this.adapter.migration_run(step);
  }

  /**
   * Read migration file by name (only file name)
   */
  async migration_file_read(file_name: string): Promise<Buffer> {
    return this.adapter.migration_file_read(file_name);
  }
}

export interface T_database extends T_connection {
  table_count(): Promise<number>

  table_drop(name: string): Promise<void>

  table_drop_all(): Promise<void>

  table_ensure_migration(): Promise<void>

  table_list(): Promise<T_table[]>

  table_pick(name: string): Promise<T_table>

  migration_init_state(): Promise<void>

  migration_file_read(file_name: string): Promise<Buffer>

  migration_list_files(): Promise<string[]>

  migration_list_migrated(): Promise<any[]>

  migration_list_pending(): Promise<any[]>

  migration_run(step?: number): Promise<void>
}

export interface T_table {
  name: string
}