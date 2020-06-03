import * as events from 'events';
import { cloneDeep, merge, pick } from 'lodash';
import { QueryOptions } from 'mysql2';
import { createPool, Pool, PoolOptions } from 'mysql2/promise';
import { Connection } from '../../rds/connection';
import { def_connection_mysql } from '../../rds/constant/defaults';
import { connection_validate_config } from '../../rds/utility/config';
import { N_dialect, T_config_connection, T_connection, T_opt_query, T_result, T_row_database } from '../../type';

export interface T_config_connection_mysql extends T_config_connection {
  dialect: N_dialect.mysql
}

export class Connection_mysql extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection_mysql = def_connection_mysql;

  pool!: Pool;
  raw_config!: PoolOptions;
  config!: T_config_connection_mysql;

  constructor(config?: T_config_connection) {
    super();
    if (config) { this.set_config(config); }
  }

  async connect(): Promise<void> {
    if ( ! this.pool) {
      this.pool = createPool(this.raw_config);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  get_config(): T_config_connection {
    return this.config;
  }

  set_config(config: T_config_connection): void {
    this.config = merge({}, (this.constructor as typeof Connection_mysql).def, config);
    this.adapt_config();
  }

  adapt_config(): void {
    const conf = pick(cloneDeep(this.config), [ 'user', 'password', 'host', 'port' ] as (keyof T_config_connection_mysql)[]);
    this.raw_config = conf;
  }

  validate_config(): void {
    connection_validate_config(this.config);
  }

  async ping() {
    return !! await this.server_version();
  }

  async server_version(): Promise<string> {
    const r: any = await this.query('select version() as version');
    return r.rows[0].version;
  }

  async database_create(name: string): Promise<T_row_database> {
    await this.query(`create database ??`, [ name ]);
    return this.database_pick(name);
  }

  async database_drop(name: string): Promise<void> {
    await this.query(`drop database if exists ??`, [ name ]);
  }

  async database_list(): Promise<T_result<T_row_database>> {
    return this.query(`
select schema_name as \`name\`, default_character_set_name as \`encoding\`, default_collation_name as \`collate\`
from information_schema.schemata`.trim());
  }

  async database_pick(name: string): Promise<T_row_database> {
    const r: any = await this.query(`
select schema_name as \`name\`, default_character_set_name as \`encoding\`, default_collation_name as \`collate\`
from information_schema.schemata
where schema_name = ?`.trim(), [ name ]);
    return r.rows[0];
  }

  async database_ensure(name: string): Promise<T_row_database> {
    const exist = await this.database_pick(name);
    if (exist) { return exist; }

    return await this.database_create(name);
  }

  async query<T = any, T_params = any>(opt: T_opt_query<T_params>): Promise<T_result<T>>;
  async query<T = any, T_params = any>(sql: string, params?: T_params, opt?: T_opt_query<T_params>): Promise<T_result<T>>
  async query<T = any, T_params = any>(a: any, b?: any, c?: any) {
    let opt: T_opt_query = {};
    if (typeof a === 'string') {
      opt = merge({}, opt, c);
      opt.sql = a;
      opt.params = b;
    } else {
      opt = a;
    }

    Connection.log(this, opt);
    const r = await this.pool.query({ sql: opt.sql, values: opt.params } as QueryOptions);
    return { rows: r[0] };
  }

  kill(database: string): Promise<void> {
    // todo: use SHOW PROCESSLIST to kill a connection

    return this.close();
  }
}
