import { print_info, print_success } from '@mosteast/print_helper';
import { readdir } from 'fs-extra';
import { keyBy, merge, range } from 'lodash';
import { resolve } from 'path';
import { pwd } from 'shelljs';
import { Invalid_argument } from '../../error/invalid_argument';
import { Invalid_connection_config } from '../../error/invalid_connection_config';
import { Invalid_state } from '../../error/invalid_state';
import { N_db_type } from '../../rds/connection';
import { T_config_database, T_database, T_field, T_migration_module, T_table } from '../../rds/database';
import { last_migration_ } from '../../type';
import { key_replace } from '../../util/obj';
import { Connection_postgres, T_config_connection_postgres } from './connection_postgres';

const e = require('pg-escape');

export interface T_config_database_postgres extends T_config_database {
  dialect: N_db_type.postgres
}

/**
 * Connection with selected database
 */
export class Database_postgres extends Connection_postgres implements T_database {

  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection_postgres = merge(Connection_postgres.def, {
    migration: {
      file_dir: resolve(pwd().toString(), 'migration'),
      migration_file_suffix: '.m',
    },
    state: {
      table_name: 'dbface_state',
      ensure_database: true,
    },
  });

  config!: T_config_database_postgres;

  static adapt_field(field_like: T_field | any): T_field {
    const f: T_field | any = key_replace(field_like, { field: 'name', null: 'nullable' });
    f.nullable = f.nullable === 'yes' ? true : false;
    return f;
  }

  validate_config() {
    super.validate_config();
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}'); }
    if ( ! this.config.migration?.file_dir) { throw new Invalid_connection_config('Required configs: {migration.file_dir}'); }
    if ( ! this.config.state?.table_name) { throw new Invalid_connection_config('Required configs: {state.table_name}'); }
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
    await this.query(`insert into "${name}" ("key", "value") values ($1, $2) on conflict ("key") do update set "value" = $2`, [ key, value ]);
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
      order by 1,2;`, [ name ]);

    const row = def.rows[0];

    if ( ! row) {
      return null;
    }

    const q_fields = await this.query<T_field[]>(`
      select a.attname                                             as field,
             t.typname || '(' || a.atttypmod || ')'                as type,
             case when a.attnotnull = 't' then 'yes' else 'no' end as null,
             case when r.contype = 'p' then 'pri' else '' end      as key,
             (select substring(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '(.*)')
                from pg_catalog.pg_attrdef d
                where d.adrelid = a.attrelid
                  and d.adnum = a.attnum
                  and a.atthasdef)                                 as default,
             ''                                                    as extras
        from pg_class c
               join pg_attribute a on a.attrelid = c.oid
               join pg_type t on a.atttypid = t.oid
               left join pg_catalog.pg_constraint r on c.oid = r.conrelid
          and r.conname = a.attname
        where c.relname = $1
          and a.attnum > 0
      
        order by a.attnum`, [ name ]);

    row.fields = keyBy(q_fields.rows.map(Database_postgres.adapt_field), 'name');
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

  async migration_list_all(): Promise<string[]> {
    const dir: string = this.get_config().migration?.file_dir as string;
    const suffix = this.get_config().migration?.migration_file_suffix;
    const re = new RegExp(`.+${suffix}\.(?:js|ts)$`);
    const files = (await readdir(dir)).filter(it => re.test(it));
    return files;
  }

  async migration_list_all_ids(): Promise<number[]> {
    const r = await this.migration_list_all();
    return r.map(it => +it.split('.')[0]);
  }

  /**
   * Run migration
   */
  async migration_run(step?: number): Promise<void>
  async migration_run(opt?: IN_migration_run): Promise<void>
  async migration_run(a?: any): Promise<void> {
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
    let last_id = await this.state_get(last_migration_) ?? 0;
    const all = await this.migration_list_all_ids();
    const all_len = all.length;
    let ids, names;

    if (Math.abs(step as number) > all_len) {
      throw new Invalid_argument(`Invalid {step}, migration files count: ${all_len}`);
    }

    if (step == 0) {
      ids = all.filter(it => it > last_id);
      names = await this.migration_get_files(ids);
    } else {
      ids = range(last_id + 1, last_id + step + 1);
      names = await this.migration_get_files(ids);
    }

    print_info('Running migrations:');
    for (const it of names) {
      print_info('● ', it, '...');
      const module: T_migration_module = await import(resolve(dir, it));
      if ( ! module.forward || ! module.backward) {
        throw new Invalid_state('A migration module (file) should contains these methods: `forward()`, `backward()`. You can define them in a plain object and `module.exports` it.');
      }

      if (step as number >= 0) {
        await module.forward(this);
        last_id++;
      } else {
        await module.backward(this);
        last_id--;
      }

      await this.state_set(last_migration_, last_id);
      print_success('  Done.');
    }
  }

  migration_last(): Promise<number> {
    throw new Error('Method not implemented.');
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

export interface IN_migration_run {step?: number}