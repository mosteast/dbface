import * as events from 'events';
import { cloneDeep, merge } from 'lodash';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { N_dialect, T_config_connection, T_connection, T_opt_log, T_opt_query, T_raw_config, T_result, T_row_database } from '../type';
import { def_connection } from './constant/defaults';

/**
 * Pure DB server connection (without database)
 */
export class Connection extends events.EventEmitter implements T_connection {

  adapter!: T_connection;
  raw_config!: T_raw_config;

  static log(ins: T_connection, { sql, params, log }: T_opt_query) {
    log = log || ins.config?.log as T_opt_log;
    if (log) {
      switch (typeof log) {
        case 'function':
          log = { logger: log };
          break;
        case 'boolean':
          log = {};
          break;
      }

      if ( ! log?.logger) {
        log.logger = (...args: any) => console.info('●', ...args);
      }

      let param_part = '';
      if (log.log_params) {
        param_part = '\n-- ' + JSON.stringify(params || []);
      }

      log.logger(sql?.trim(), param_part);
    }
  }

  constructor(config?: T_config_connection) {
    super();
    if (config) { this.set_config(config); }
  }

  /**
   * Set connection config
   * @param config
   */
  set_config(config: T_config_connection) {
    const { dialect } = config = merge(def_connection, config);
    let con;
    switch (dialect) {
      case N_dialect.mysql:
        const Mysql = require('../adapter/mysql/connection_mysql').Connection_mysql;
        con = new Mysql(config);
        break;
      case N_dialect.postgres:
        const Postgres = require('../adapter/postgres/connection_postgres').Connection_postgres;
        con = new Postgres(config);
        break;
      default:
        throw new Invalid_connection_config(`Invalid dialect: "${dialect}"`);
    }

    this.adapter = con;
  }

  /**
   * Get connection config
   */
  get_config(): T_config_connection {
    return this.adapter.get_config();
  }

  /**
   * Get adapted raw connection config
   */
  get_raw_config(): T_raw_config {
    return cloneDeep(this.raw_config);
  }

  /**
   * Get raw connection
   */
  get_raw() {
    return this.adapter.pool;
  }

  /**
   * Convert `config` to "raw config" (e.g. mysql2 or pg config)
   */
  adapt_config() {
    this.adapter.adapt_config();
  }

  /**
   * Config validation
   */
  validate_config() {
    const c = this.adapter.config;
    if ( ! c) { throw new Invalid_connection_config('Empty config'); }
    if ( ! c.state?.table_name) { throw new Invalid_connection_config('Required: `system.table_name`'); }

    const m = c.migration;
    if (m) {
      if ( ! m.file_dir) { throw new Invalid_connection_config('Required: `migration.file_dir`'); }
    }

    this.adapter.validate_config();
  }

  /**
   * Connect to database/pool
   */
  async connect() {
    await this.adapter.connect();
  }

  /**
   * Close connection
   */
  async close() {
    await this.adapter.close();
  }

  async query<T = any, T_params = any>(opt: T_opt_query): Promise<T_result<T>>
  async query<T = any, T_params = any>(sql: string, params?: T_params, opt?: T_opt_query): Promise<T_result<T>>
  async query(a: any, b?: any, c?: any) {
    return this.adapter.query(a, b, c);
  }

  /**
   * Check if database exists
   * @param name
   */
  async database_pick(name: string): Promise<T_row_database> {
    return this.adapter.database_pick(name);

  }

  async database_list(): Promise<T_result<T_row_database>> {
    return this.adapter.database_list();
  }

  async database_create(name: string): Promise<T_row_database> {
    return this.adapter.database_create(name);
  }

  async database_drop(name: string) {
    return this.adapter.database_drop(name);
  }

  /**
   * Create database if not exists
   * @param name
   */
  async database_ensure(name: string): Promise<T_row_database> {
    return this.adapter.database_ensure(name);
  }

  ping(): Promise<boolean> {
    return this.adapter.ping();
  }

  server_version(): Promise<string> {
    return this.adapter.server_version();
  }

  kill(database: string): Promise<void> {
    return this.adapter.kill(database);
  }
}