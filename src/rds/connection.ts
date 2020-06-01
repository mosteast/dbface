import * as events from 'events';
import { cloneDeep, merge } from 'lodash';
import { Pool as Mysql_pool } from 'mysql2/promise';
import { Pool as Pg_pool, PoolConfig } from 'pg';
import { Connection_mysql } from '../adapter/mysql/connection_mysql';
import { Connection_postgres } from '../adapter/postgres/connection_postgres';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { T_row_database } from '../type';

export enum N_db_type {mysql = 'mysql', postgres = 'postgres'}

const env = process.env;

/**
 * Pure DB server connection (without database)
 */
export class Connection extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection = {
    host: env.dbface_host,
    port: +env.dbface_port!,
    user: env.dbface_user,
    password: env.dbface_password,
    uri: env.dbface_uri,
  };

  adapter!: Connection_mysql | Connection_postgres;
  raw_config!: T_raw_config;

  static validate_config(config: T_config_connection) {
    if (config.uri) {

    } else {
      if ( ! config.user || ! config.host || ! config.port) {
        throw new Invalid_connection_config('Required configs: {user}, {host}, {port}');
      }
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
    config = merge(Connection.def, config);
    this.adapter.set_config(config);
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

  async query<T = any, T_params = any>(opt: IN_query): Promise<T_result<T>>
  async query<T = any, T_params = any>(sql: string, params?: T_params, opt?: IN_query): Promise<T_result<T>>
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

export type T_raw_config = PoolConfig

export interface T_migration_config {
  file_dir?: string
  migration_file_suffix?: string
}

export interface T_state_config {
  table_name?: string
  ensure_database?: boolean
}

export interface T_config_connection {
  dialect?: N_db_type
  host?: string
  port?: number
  user?: string
  password?: string
  uri?: string
  migration?: T_migration_config
  state?: T_state_config
  log?: boolean | Function | T_opt_log
}

export interface T_opt_log {
  logger?: Function
  log_params?: boolean
}

export interface IN_query<T_params = any> {
  sql?: string
  params?: T_params
  log?: boolean | Function | T_opt_log
}

/**
 * Connection interface
 */
export interface T_connection {
  pool?: Pg_pool | Mysql_pool
  config?: T_config_connection;
  raw_config?: any;

  set_config(conf: T_config_connection): void,

  get_config(): T_config_connection

  /**
   * Convert `config` to "raw config" (e.g. mysql2 or pg config)
   */
  adapt_config(): void

  /**
   * Validate connection configuration
   */
  validate_config(): void

  /**
   * Connect to database server
   */
  connect(): Promise<void>

  /**
   * Close connection
   */
  close(): Promise<void>

  /**
   * Make a sql query
   * @param sql
   * @param params
   */
  query<T = any, T_params = any>(opt: IN_query): Promise<T>

  query<T = any, T_params = any>(sql: string, params?: T_params, opt?: IN_query): Promise<T>

  /**
   * Kill connection by database
   * @param database
   */
  kill(database: string): Promise<void>

  /**
   * Drop database by name
   */
  database_drop(name: string): Promise<void>

  /**
   * Pick one database
   * Can be used to check whether a  database exists.
   */
  database_pick(name: string): Promise<T_row_database>

  /**
   * List database
   * Like "show databases" in mysql or "\l" in postgres
   */
  database_list(): Promise<T_result<T_row_database>>

  /**
   * Create database
   */
  database_create(name: string): Promise<T_row_database>

  /**
   * Ensure database
   * Create database if not exists
   */
  database_ensure(name: string): Promise<T_row_database>

  /**
   * Test connection
   */
  ping(): Promise<boolean>

  /**
   * Get database server version info
   */
  server_version(): Promise<string>
}

export interface T_result<T = any> {
  rows: T[]
  count?: number
}

