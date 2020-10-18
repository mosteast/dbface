import { print_info, print_success } from '@mosteast/print_helper';
import { readdir } from 'fs-extra';
import { cloneDeep, keyBy } from 'lodash';
import { resolve } from 'path';
import { Invalid_argument } from '../../error/invalid_argument';
import { Invalid_state } from '../../error/invalid_state';
import { def_database_postgres } from '../../rds/constant/defaults';
import { database_validate_config } from '../../rds/utility/config';
import { IN_migration_run, migration_log_, N_dialect, T_column, T_column_type, T_config_database, T_constraint_type, T_constraints, T_database, T_database_meta, T_migration_module, T_table } from '../../type';
import { key_replace } from '../../util/object';
import { Connection_postgres } from './connection_postgres';
import { Postgres } from './postgres';

const e = require('pg-escape');

export interface T_config_database_postgres extends T_config_database {
  dialect: N_dialect.postgres
}

/**
 * Connection with selected database
 */
export class Database_postgres extends Connection_postgres implements T_database {

  meta!: T_database_meta;

  /**
   * Default configuration as a base to merge
   */
  static def: T_config_database_postgres = def_database_postgres;

  config!: T_config_database_postgres;

  async refresh_meta(): Promise<T_database_meta> {
    return this.meta = await this.inspect();
  }

  async inspect(): Promise<T_database_meta> {
    const r: T_database_meta = {
      name: this.get_config().database,
      table: keyBy<T_table>(await this.table_list(), 'name'),
    };
    return r;
  }

  validate_config() {
    super.validate_config();
    database_validate_config(this.config);
  }

  adapt_config(): void {
    super.adapt_config();
    const copy: any = cloneDeep(this.raw_config);
    delete copy.migration;

    this.raw_config = copy;
    key_replace(this.raw_config, { uri: 'connectionString' });
  }

  get_config(): T_config_database_postgres {
    return super.get_config() as T_config_database_postgres;
  }

  async state_get<T = any>(key: string): Promise<T | undefined> {
    const name = this.get_config().state!.table_name;
    const r = await this.query(`select * from "${name}" where "key" = $1`, [ key ]);
    const row = r.rows[0];
    if (row) {
      return row.value;
    }
  }

  async state_set(key: string, value: any): Promise<void> {
    const name = this.get_config().state!.table_name;
    await this.query(`insert into "${name}" ("key", "value") values ($1, $2) on conflict ("key") do update set "value" = $2`, [ key, JSON.stringify(value) ]);
  }

  async state_unset(key: string): Promise<void> {
    const name = this.get_config().state!.table_name;
    await this.query(`delete from "${name}" where "key" = $1`, [ key ]);
  }

  /**
   * Creating necessary system data
   */
  async state_init(): Promise<void> {
    const c = this.config;
    if ( ! c.migration) { return; }
    await this.state_ensure_table();
  }

  async state_destroy(): Promise<void> {
    await this.state_drop_table();
  }

  async state_reset(): Promise<void> {
    await this.state_destroy();
    await this.state_init();
  }

  async state_ensure_table(): Promise<void> {
    const name = this.get_config().state!.table_name;
    await this.query(`
      create table if not exists "${name}" (
        "key" varchar(64) primary key ,
        "value" jsonb)`);
  }

  async state_drop_table(): Promise<void> {
    const name = this.get_config().state!.table_name!;
    await this.table_drop(name);
  }

  /**
   * Create testing table
   */
  async table_create_test(name: string) {
    const env = process.env.NODE_ENV;
    if (env !== 'testing') { throw new Invalid_state(`Invalid NODE_ENV ${env}, testing table will only be created in testing environment`); }

    await this.query(e(`
      create table if not exists "%I" (
        id serial, 
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
        not_null_ int not null,
        constraint pk_${name} primary key (id)
        )`, [ name ]));
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
      order by 1,2;`, [ name ]);

    const row = def.rows[0];

    if ( ! row) {
      return null;
    }

    const q = Postgres.sql_describe_columns({ table: name });
    const r = await this.query<T_column[]>(q);

    if ( ! r.count) {
      return null;
    }

    row.columns = keyBy(r.rows.map(Postgres.adapt_column), 'name');
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

  async table_constraint_list(table: string): Promise<T_constraints> {
    const r = await this.query(`
      select a.table_name      as table,
           a.table_schema    as schema,
           a.table_catalog   as catalog,
           a.constraint_name as name,
           a.constraint_type as type,
           b.column_name     as column
      from information_schema.table_constraints a
             left join information_schema.constraint_column_usage b
                        on a.table_name = b.table_name and
                           a.table_schema = b.table_schema and
                           a.constraint_name = b.constraint_name
      where a.table_name = $1
      and b.column_name is not null;`, [ table ]);

    const rows = r.rows;
    const map: T_constraints = {};

    for (const it of rows) {
      const con = map[it.name] = map[it.name] || it;
      con.type = Postgres.adapt_constraint_name(con.type as T_constraint_type);
      con.columns = con.columns || [];
      con.columns!.push(it.column);
    }

    return map;
  }

  async column_pick(table: string, name: string): Promise<T_column | null> {
    const r = await this.query(Postgres.sql_describe_columns({ table, column: name }));
    if ( ! r.count) { return null; }
    const it = r.rows[0];
    return Postgres.adapt_column(it);
  }

  async column_create(table: string, column: T_column): Promise<void> {
    await this.query(Postgres.sql_column_create({ table, column }));
  }

  async column_rename(table: string, from: string, to: string): Promise<void> {
    await this.query(`alter table "${table}" rename "${from}" to "${to}"`);
  }

  async column_update_type(table: string, name: string, type: T_column_type, type_args?: any): Promise<void> {
    await this.query(`alter table "${table}" alter "${name}" type ${type}`);
  }

  async column_update_nullable(table: string, name: string, nullable: boolean): Promise<void> {
    await this.query(`alter table "${table}" alter "${name}" ${nullable ? 'drop not null' : 'set not null'}`);
  }

  async column_update_unique(table: string, name: string, unique: boolean, key_name?: string): Promise<void> {
    key_name = key_name || `uk_${table}_${name}`;
    let sql = `alter table "${table}"` +
      (unique ?
        ` add constraint "${key_name}" unique("${name}")` :
        ` drop constraint "${key_name}"`);
    await this.query(sql);
  }

  async column_update_default(table: string, name: string, def: any): Promise<void> {
    await this.query(`alter table "${table}" alter "${name}" set default '${def}'`);
  }

  async migration_list_all(): Promise<string[]> {
    const dir: string = this.get_config().migration?.file_dir as string;
    const suffix = this.get_config().migration?.migration_file_suffix;
    const re = new RegExp(`.+${suffix}\.(?:js|ts)$`);
    const files = (await readdir(dir)).filter(it => re.test(it));
    return files;
  }

  async migration_list_all_ids(): Promise<number[]> {
    const r = await this.migration_list_all();
    if ( ! r.length) { return [];}
    return r.map(it => +it.split('.')[0]).sort();
  }

  /**
   * Run migration
   */
  async migration_go(step?: number): Promise<void>
  async migration_go(opt?: IN_migration_run): Promise<void>
  async migration_go(a?: any): Promise<void> {
    let opt: IN_migration_run = { step: 0 };

    if (a) {
      switch (typeof a) {
        case 'number':
          opt = { step: a };
          break;
        case 'object':
          opt = { ...opt, ...a };
          break;
        default:
          throw new Invalid_argument(`Invalid migration options: ${JSON.stringify(a)}`);
      }
    }

    let { step } = opt;

    const dir = this.get_config().migration?.file_dir!;
    let log: number[] = await this.state_get(migration_log_) ?? [];
    const all = await this.migration_list_all_ids();
    const all_len = all.length;
    let ids, names;

    if (Math.abs(step!) > all_len) {
      throw new Invalid_argument(`Invalid {step}, migration files count: ${all_len}`);
    }

    const pending = all.filter(it => ! log.includes(it)).sort();

    if (step == 0) {
      ids = pending;
      names = await this.migration_get_files(ids);
    } else {
      if (step! > 0) {
        ids = pending.slice(0, step);
      } else {
        ids = log.slice((log.length + step!), log.length);
      }
      names = await this.migration_get_files(ids);
    }

    print_info('Running migrations:');
    for (const [ i, it ] of ids.entries()) {
      const name = names[i];
      print_info('● ', name, '...');
      const module: T_migration_module = await import(resolve(dir, name));
      if ( ! module.forward || ! module.backward) {
        throw new Invalid_state('A migration module (file) should contains these methods: `forward()`, `backward()`. You can define them in a plain object and `module.exports` it.');
      }

      if (step! >= 0) {
        await module.forward(this);
        log.push(it);
      } else {
        await module.backward(this);
        log.pop();
      }

      await this.state_set(migration_log_, log);
      print_success('  Done.');
    }
  }

  async migration_log(): Promise<number[] | undefined> {
    return this.state_get(migration_log_);
  }

  async migration_get_files(ids: number[]): Promise<string[]> {
    const r: string[] = [];
    const files = await this.migration_list_all();

    for (const it of files) {
      const id = +it.split('.')[0];
      if (ids.includes(id)) {
        r.push(it);
      }
    }

    if (r.length !== ids.length) {
      throw new Invalid_argument({ ids });
    }

    return r;
  }
}
