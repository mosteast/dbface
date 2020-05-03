import { Invalid_argument } from '../error/invalid_argument'
import { Invalid_connection_config } from '../error/invalid_connection_config'
import { list_child_dirs } from '../util/path'
import { Connection, T_config_connection, T_system_config } from './connection'

export interface T_config_database extends T_config_connection {
  database: string
  system?: T_system_config & { ensure_database?: boolean }
}

/**
 * Connection with selected database
 */
export class Database extends Connection<T_config_database> {
  // static def: T_config_database = merge(Connection.def, { system: { ensure_database: true } })
  config: T_config_database

  validate_config() {
    super.validate_config()
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}') }
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
        order by 1`, [ table ])

    return r.rowCount ? r : false
  }

  /**
   * Get all tables
   */
  async table_list(): Promise<{ name: string }[]> {
    const { rows } = await this.query(`
      select c.relname as name 
        from pg_catalog.pg_class c 
          left join pg_catalog.pg_namespace n on n.oid = c.relnamespace 
          where pg_catalog.pg_table_is_visible(c.oid) 
            and c.relkind = 'r' 
            and relname 
          not like 'pg_%'`)
    return rows
  }

  /**
   * Table count
   */
  async table_count(): Promise<number> {
    return (await this.table_list()).length
  }

  async table_drop(table: string) {
    await this.query(`drop table if exists "${table}"`)
  }

  /**
   * Drop all tables
   */
  async table_drop_all() {
    const list = await this.table_list()
    for (const it of list) {
      await this.table_drop(it.name)
    }
  }

  /**
   * Create migration table if not exists
   */
  async table_ensure_migration() {
    const name = this.get_config().migration.table_name

    if (await this.table_exists(name)) { return }
    await this.query(`
           create table "${name}" (
              id varchar (50) unique not null,
              step integer not null
           )`)
  }

  /**
   * Create placeholder table (mostly for testing purpose)
   */
  async table_create_holder(i: number) {
    // @ts-ignore
    await this.query(`create table ${(this.constructor).table_holder_name_build(i)} (id serial primary key)`)
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async init_state_migration() {
    const c = this.config
    if ( ! c.migration) { return }
    await this.table_ensure_migration()
  }

  /**
   * List all migrated records
   */
  async migration_list_migrated() {
    const table = this.get_config().migration.table_name
    return await this.query(`select * from ${table}`)
  }

  /**
   * List all not migrated files
   */
  async migration_list_pending() {

  }

  async migration_list_files(): Promise<string[]> {
    const dir = this.get_config().migration.file_dir
    return list_child_dirs(dir)
  }

  /**
   * Build table holder name
   */
  static table_holder_name_build(i: number) {
    return `_holder${i}`
  }

}
