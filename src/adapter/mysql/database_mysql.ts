import { print_info, print_success } from '@mosteast/print_helper';
import { readdir } from 'fs-extra';
import { cloneDeep, keyBy, merge, pick } from 'lodash';
import { resolve } from 'path';
import { Invalid_argument } from '../../error/invalid_argument';
import { Invalid_state } from '../../error/invalid_state';
import { N_db_type } from '../../rds/connection';
import { Database, T_config_database, T_database, T_field, T_migration_module, T_table } from '../../rds/database';
import { migration_log_ } from '../../type';
import { key_replace } from '../../util/obj';
import { Connection_mysql } from './connection_mysql';

export interface T_config_database_mysql extends T_config_database {
  dialect: N_db_type.mysql
}

/**
 * Connection with selected database
 */
export class Database_mysql extends Connection_mysql implements T_database {

  /**
   * Default configuration as a base to merge
   */
  static def: T_config_database_mysql = merge(Connection_mysql.def, Database.def, {} as T_config_database_mysql);

  config!: T_config_database_mysql;

  static adapt_field(field_like: T_field | any): T_field {
    const f: T_field | any = key_replace(field_like, { field: 'name', null: 'nullable' });
    f.nullable = f.nullable === 'YES' ? true : false;
    return f;
  }

  validate_config() {
    super.validate_config();
    Database.validate_config(this.config);
  }

  adapt_config(): void {
    super.adapt_config();
    const parent: any = cloneDeep(this.raw_config);
    const conf = pick(cloneDeep(this.config), [ 'database' ] as (keyof T_config_database_mysql)[]);
    this.raw_config = merge(parent, conf);
  }

  async state_get<T = any>(key: string): Promise<T | undefined> {
    const name = this.get_config().state!.table_name;
    const r = await this.query(`select * from \`${name}\` where "key" = ?`, [ key ]);
    const row = r.rows[0];
    if (row) {
      return row.value;
    }
  }

  async state_set(key: string, value: any): Promise<void> {
    const name = this.get_config().state!.table_name;
    value = JSON.stringify(value);
    await this.query(`insert into \`${name}\` (\`key\`, \`value\`) values (?, ?) on conflict (\`key\`) do update set \`value\` = ?`, [ key, value, value ]);
  }

  async state_unset(key: string): Promise<void> {
    const name = this.get_config().state!.table_name;
    await this.query(`delete from \`${name}\` where \`key\` = ?`, [ key ]);
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
      create table if not exists \`${name}\` (
        \`key\` varchar(64) primary key,
        \`value\` json)`);
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

    await this.query(`
      create table if not exists \`${name}\` (
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
        not_null_ int not null)`);
  }

  /**
   * Get one table info
   * @param name
   */
  async table_pick(name: string): Promise<T_table | null> {
    const row: T_table = { name };
    const q_fields = await this.query<T_field[]>(`desc \`${name}\``);
    row.fields = keyBy(q_fields.rows.map(Database_mysql.adapt_field), 'name');
    return row;
  }

  /**
   * List only table names
   * @param name
   */
  async table_list_names(): Promise<string[]> {
    const r = await this.query<T_table>(`show tables`);
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
    await this.query(`drop table if exists ??`, table);
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
    return r.map(it => +it.split('.')[0]).sort();
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

export interface IN_migration_run {
  step?: number
}