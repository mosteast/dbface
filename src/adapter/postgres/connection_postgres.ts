import * as events from 'events';
import { cloneDeep, merge, pick } from 'lodash';
import { Pool, PoolClient, PoolConfig, QueryConfig } from 'pg';
import { Connection} from '../../rds/connection';
import { def_connection_postgres } from '../../rds/constant/defaults';
import { connection_validate_config } from '../../rds/utility/config';
import { N_dialect, T_config_connection, T_connection, T_opt_query, T_result, T_row_database } from '../../type';
import { key_replace } from '../../util/obj';

const e = require('pg-escape');

export class Connection_postgres extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection_postgres = def_connection_postgres;

  pool!: Pool;
  raw_config!: PoolConfig;
  config!: T_config_connection_postgres;

  protected client!: PoolClient;

  constructor(config?: T_config_connection) {
    super();
    if (config) { this.set_config(config); }
  }

  async connect(): Promise<void> {
    if ( ! this.pool) {
      const conf = this.raw_config;
      // If is pure connection
      if (this.constructor.name === Connection_postgres.name) {
        delete conf.database; // delete database option to prevent database not exist exception
      }

      this.pool = new Pool(conf);
    }

    this.client = await this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  get_config(): T_config_connection {
    return this.config;
  }

  set_config(config: T_config_connection): void {
    this.config = merge((this.constructor as typeof Connection_postgres).def, config);
    this.adapt_config();
  }

  adapt_config(): void {
    const conf: PoolConfig = pick(cloneDeep(this.config), [ 'user', 'password', 'host', 'port', 'uri' ] as (keyof T_config_connection_postgres)[]) as PoolConfig;
    this.raw_config = conf;
    key_replace(this.raw_config, { uri: 'connectionString' });
  }

  validate_config(): void {
    connection_validate_config(this.config);
  }

  async ping() {
    return !! await this.server_version();
  }

  async server_version(): Promise<string> {
    const r = await this.query('select version()');
    return r.rows[0].version;
  }

  async kill(database: string) {
    await this.query(`
      SELECT 
         pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE
         pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()`, [ database ]);
  }

  async database_create(name: string): Promise<T_row_database> {
    await this.query(e(`create database "%I"`, name));
    return this.database_pick(name);
  }

  async database_drop(name: string): Promise<void> {
    await this.query(e(`drop database if exists "%I"`, name));
  }

  async database_list(): Promise<T_result<T_row_database>> {
    return this.query(`
select d.datname as "name",
       pg_catalog.pg_get_userbyid(d.datdba) as "owner",
       pg_catalog.pg_encoding_to_char(d.encoding) as "encoding",
       d.datcollate as "collate"
from pg_catalog.pg_database d
order by 1;`);
  }

  async database_pick(name: string): Promise<T_row_database> {
    const r = await this.query(`
select d.datname as "name",
       pg_catalog.pg_get_userbyid(d.datdba) as "owner",
       pg_catalog.pg_encoding_to_char(d.encoding) as "encoding",
       d.datcollate as "collate"
from pg_catalog.pg_database d
where d.datname = $1
limit 1`, [ name ]);

    return r.rows[0];
  }

  async database_ensure(name: string): Promise<T_row_database> {
    const exist = await this.database_pick(name);
    if (exist) { return exist; }

    return await this.database_create(name);
  }

  async query<T = any, T_params = any>(opt: T_opt_query<T_params>): Promise<T_result<T>>;
  async query<T = any, T_params = any>(sql: string, params?: T_params, opt?: T_opt_query<T_params>): Promise<T_result<T>>;
  async query<T = any, T_params = any>(a: any, b?: any, c?: any) {
    let opt: T_opt_query = {};
    if (typeof a === 'string') {
      opt = merge(opt, c);
      opt.sql = a;
      opt.params = b;
    } else {
      opt = a;
    }

    Connection.log(this, opt);
    const r = await this.client.query({ text: opt.sql, values: opt.params } as QueryConfig);
    return key_replace<T_result<T>>(r, { rowCount: 'count' });
  }
}

export interface T_config_connection_postgres extends T_config_connection {
  dialect: N_dialect.postgres
}