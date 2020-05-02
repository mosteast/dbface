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

  /**
   * Check if table exists
   * @param table - table name
   * @param database - database name
   */
  async table_exists(table: string, database?: string): Promise<boolean> {
    database = database || this.get_config().database
    if ( ! database) { return }

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

  async table_drop(table: string) {
    await this.query(`drop table if exists "${table}"`)
  }

  /**
   * Create migration table if not exists
   */
  async migration_table_ensure() {
    const name = this.get_config().migration.table_name

    if (await this.table_exists(name)) { return }

    await this.query(`
           create table "${name}" (
              id varchar (50) unique not null,
              step integer not null
           )`)
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async init_state_migration() {
    const c = this.config
    if ( ! c.migration) { return }
    await this.migration_table_ensure()
  }
}
