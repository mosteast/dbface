import { readdir, readFile } from 'fs-extra';
import { resolve } from 'path';
import { N_db_type } from '../../connection/connection';
import { T_config_database, T_database, T_table } from '../../connection/database';
import { Invalid_connection_config } from '../../error/invalid_connection_config';
import { Invalid_state } from '../../error/invalid_state';
import { Connection_postgres } from './connection_postgres';

const e = require('pg-escape');

export interface T_config_database_postgres extends T_config_database {
  dialect: N_db_type.postgres
}

/**
 * Connection with selected database
 */
export class Database_postgres extends Connection_postgres implements T_database {
  // static def: T_config_database = merge(Connection.def, { system: { ensure_database: true } })
  config: T_config_database_postgres;

  validate_config() {
    super.validate_config();
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}'); }
  }

  /**
   * Create testing table
   */
  async table_create_test(name: string) {
    const env = process.env.NODE_ENV;
    if (env !== 'testing') { throw new Invalid_state(`Invalid NODE_ENV ${env}, testing table will only be created in testing environment`); }

    await this.query(e(`create table if not exists "%I" (id serial primary key)`, [ name ]));
  }

  /**
   * Get one table info
   * @param table
   */
  async table_pick(table: string): Promise<T_table> {
    const r = await this.query<T_table>(`
      select c.relname as name 
        from pg_catalog.pg_class c 
          left join pg_catalog.pg_namespace n on n.oid = c.relnamespace 
          where pg_catalog.pg_table_is_visible(c.oid) 
            and c.relkind = 'r' 
            and relname = $1
            and relname 
          not like 'pg_%' limit 1`, [ table ]);

    return r.rows[0];
  }

  /**
   * Get all tables
   */
  async table_list(): Promise<T_table[]> {
    const r = await this.query<T_table>(`
      select n.nspname as "schema",
        c.relname as "name",
        case c.relkind when 'r' then 'table' when 'v' then 'view' when 'm' then 'materialized view' when 'i' then 'index' when 's' then 'sequence' when 's' then 'special' when 'f' then 'foreign table' when 'p' then 'partitioned table' when 'i' then 'partitioned index' end as "type",
        pg_catalog.pg_get_userbyid(c.relowner) as "owner"
      from pg_catalog.pg_class c
           left join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r','p','')
            and n.nspname <> 'pg_catalog'
            and n.nspname <> 'information_schema'
            and n.nspname !~ '^pg_toast'
        and pg_catalog.pg_table_is_visible(c.oid)
      order by 1,2;`.trim());

    return r.rows;
  }

  /**
   * Count table number
   */
  async table_count(): Promise<number> {
    return (await this.table_list()).length;
  }

  /**
   * Drop one table
   * @param table
   */
  async table_drop(table: string) {
    await this.query(e(`drop table if exists "%I"`, table));
  }

  /**
   * Drop all tables
   */
  async table_drop_all() {
    const r = await this.table_list();
    for (const it of r) {
      await this.table_drop(it.name);
    }
  }

  /**
   * Create migration table if not exists
   */
  async table_ensure_migration() {
    const name = this.get_config().migration.table_name;

    if (await this.table_pick(name)) { return; }
    await this.query(`
           create table "${name}" (
              id varchar (50) unique not null,
              step integer not null
           )`);
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async migration_init_state() {
    const c = this.config;
    if ( ! c.migration) { return; }
    await this.table_ensure_migration();
  }

  /**
   * List all migrated records
   */
  async migration_list_migrated() {
    const table = this.get_config().migration.table_name;
    const { rows } = await this.query(`select * from ${table}`);

    return rows;
  }

  /**
   * List all not migrated files
   */
  async migration_list_pending(): Promise<string[]> {
    const db = await this.migration_list_migrated();
    const files = await this.migration_list_files();
    for (const [ i, it ] of files.entries()) {
      if (db.includes(it)) {
        continue;
      }

      return files.slice(i, files.length);
    }
  }

  async migration_list_files(): Promise<string[]> {
    const dir = this.get_config().migration.file_dir;
    const suffix = this.get_config().migration.migration_file_suffix;
    const re = new RegExp(`.+${suffix}\.(?:js|ts)$`);
    return (await readdir(dir)).filter(it => re.test(it));
  }

  /**
   * Run migration
   */
  async migration_run(step: number = 0) {
    const diff = await this.migration_list_pending();
    if ( ! step) { step = diff.length; }

    let i = step;

    for (let i = 0; i < step; i++) {
      if (step - i < 1) { return; }
      const path = resolve(this.get_config().migration.file_dir, diff[i]);
      const modu = require(path);
      await modu.forward();
    }
  }

  /**
   * Read migration file by name (only file name)
   */
  async migration_file_read(file_name: string): Promise<Buffer> {
    return readFile(resolve(this.get_config().migration.file_dir, file_name));
  }
}
