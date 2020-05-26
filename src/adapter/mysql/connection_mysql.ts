import * as events from 'events';
import { createPool, Pool } from 'mysql2/promise';
import { IN_query, N_db_type, T_config_connection, T_connection } from '../../connection/connection';
import { T_row_database } from '../../type';

export interface T_config_connection_mysql extends T_config_connection {
  type: N_db_type.mysql
}

export class Connection_mysql extends events.EventEmitter implements T_connection {
  pool: Pool;
  config: T_config_connection_mysql;

  constructor() {
    super();

  }

  adapt_config(): void {}

  async connect(): Promise<void> {
    if ( ! this.pool) {
      this.pool = createPool(this.config);
    }
  }

  async ping() {
    return !! await this.server_version();
  }

  async server_version(): Promise<string> {
    const r = await this.query('select version()');
    return r.rows[0].version;
  }

  database_create(name: string): Promise<T_row_database> {
    return Promise.resolve(undefined);
  }

  database_drop(name: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  database_list(): Promise<T_row_database[]> {
    return Promise.resolve([]);
  }

  database_pick(name: string): Promise<T_row_database> {
    return Promise.resolve(undefined);
  }

  databases_ensure(name: string): Promise<T_row_database> {
    return Promise.resolve(undefined);
  }

  get_config(): T_config_connection {
    return undefined;
  }

  set_config(conf: T_config_connection): void {

  }

  validate_config(): void {
  }

  close(): Promise<void> {
    return Promise.resolve(undefined);
  }

  async query<T = any, T_params = any>(opt: IN_query<T_params>): Promise<T>;
  async query<T = any, T_params = any>(sql: string, params?: T_params): Promise<T>;
  async query<T = any, T_params = any>(a, b?) {
    let opt: IN_query = {};
    if (typeof a === 'string') {
      opt.sql = a;
      opt.params = b;
    } else {
      opt = a;
    }

    return this.pool.query({ sql: opt.sql, values: opt.params });
  }
}