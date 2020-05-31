import { readdir, readFile } from 'fs-extra';
import { resolve } from 'path';
import { Invalid_connection_config } from '../../error/invalid_connection_config';
import { Invalid_state } from '../../error/invalid_state';
import { N_db_type } from '../../rds/connection';
import { T_config_database, T_database, T_field, T_table } from '../../rds/database';
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
  config!: T_config_database_postgres;

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

    await this.query(e(`
      create table if not exists "%I" (
        id serial primary key, 
        smallint_ smallint,
        int_ int,
        bigint_ bigint,
        int2_ int2,
        int4_ int4,
        int8_ int8,
        decimal_ decimal(10, 2),
        numeric_ numeric,
        float_ float,
        real_ real,
        varchar_ varchar, 
        timestamp_ timestamp, 
        interval_ interval, 
        not_null_ int not null)`, [ name ]));
  }

  /**
   * Get one table info
   * @param name
   */
  async table_pick(name: string): Promise<T_table | null> {
    const def = await this.query<T_table>(`
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
            and c.relname = $1
      order by 1,2;`.trim(), [ name ]);

    const row = def.rows[0];

    if ( ! row) {
      return null;
    }

    const q_fields = await this.query<T_field[]>(`
      SELECT a.attname                                             AS field,
             t.typname || '(' || a.atttypmod || ')'                AS type,
             CASE WHEN a.attnotnull = 't' THEN 'YES' ELSE 'NO' END AS null,
             CASE WHEN r.contype = 'p' THEN 'PRI' ELSE '' END      AS key,
             (SELECT substring(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '(.*)')
                FROM pg_catalog.pg_attrdef d
                WHERE d.adrelid = a.attrelid
                  AND d.adnum = a.attnum
                  AND a.atthasdef)                                 AS default,
             ''                                                    as extras
        FROM pg_class c
               JOIN pg_attribute a ON a.attrelid = c.oid
               JOIN pg_type t ON a.atttypid = t.oid
               LEFT JOIN pg_catalog.pg_constraint r ON c.oid = r.conrelid
          AND r.conname = a.attname
        WHERE c.relname = $1
          AND a.attnum > 0
      
        ORDER BY a.attnum`.trim(), [ name ]);

    row.fields = q_fields.rows;
    return row;
  }

  /**
   * List only table names
   * @param name
   */
  async table_list_names(): Promise<string[]> {
    const r = await this.query<T_table>(`
      select c.relname as name 
        from pg_catalog.pg_class c 
          left join pg_catalog.pg_namespace n on n.oid = c.relnamespace 
          where pg_catalog.pg_table_is_visible(c.oid)
            and c.relkind = 'r'
            and relname not like 'pg_%'`);

    return r.rows.map(it => it.name);
  }

  /**
   * Get all tables
   */
  async table_list(): Promise<T_table[]> {
    const list = await this.table_list_names();
    const r = [];

    for (const it of list) {
      const row = await this.table_pick(it);
      if (row) {
        r.push(row);
      }
    }

    return r;
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
   * Drop migration table
   */
  async table_drop_migration(): Promise<void> {
    const name = this.get_config().migration?.table_name as string;
    await this.query(`drop table if exists "${name}"`);
  }

  /**
   * Truncate migration table
   */
  async table_clear_migration(): Promise<void> {
    const name = this.get_config().migration?.table_name as string;
    await this.query(`truncate "${name}"`);
  }

  /**
   * Create migration table if not exists
   */
  async table_ensure_migration(): Promise<void> {
    const name = this.get_config().migration?.table_name as string;
    await this.query(`
           create table if not exists "${name}" (
              id varchar (50) unique not null,
              step integer not null
           )`);
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async migration_init_state(): Promise<void> {
    const c = this.config;
    if ( ! c.migration) { return; }
    await this.table_ensure_migration();
  }

  /**
   * List all migrated records
   */
  async migration_list_migrated() {
    const table = this.get_config().migration?.table_name;
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
    return [];
  }

  async migration_list_files(): Promise<string[]> {
    const dir: string = this.get_config().migration?.file_dir as string;
    const suffix = this.get_config().migration?.migration_file_suffix;
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
      const path = resolve(this.get_config().migration?.file_dir as string, diff[i]);
      const modu = require(path);
      await modu.forward();
    }
  }

  /**
   * Read migration file by name (only file name)
   */
  async migration_file_read(file_name: string): Promise<Buffer> {
    return readFile(resolve(this.get_config().migration?.file_dir as string, file_name));
  }
}
