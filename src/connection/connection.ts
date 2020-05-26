import * as events from 'events';
import { cloneDeep, merge } from 'lodash';
import { Pool as Mysql_pool } from 'mysql2/promise';
import { resolve } from 'path';
import { Pool as Pg_pool, PoolConfig } from 'pg';
import { pwd } from 'shelljs';
import { Connection_mysql } from '../adapter/mysql/connection_mysql';
import { Connection_postgres } from '../adapter/postgres/connection_postgres';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { T_row_database, table_migration, table_system } from '../type';

export enum N_db_type {mysql = 'mysql', postgres = 'postgres'}

const env = process.env;

/**
 * Pure DB server connection (without database)
 */
export class Connection extends events.EventEmitter implements T_connection {
  /**
   * Default configuration as a base to merge
   */
  static def: T_config_connection | any = {
    type: env.ormx_type,
    host: env.ormx_type,
    port: env.ormx_port,
    username: env.ormx_username,
    password: env.ormx_password,
    uri: env.ormx_uri,
    migration: {
      table_name: table_migration,
      file_dir: resolve(pwd().toString(), 'database/migration'),
      migration_file_suffix: '.m',
    },
    system: {
      table_name: table_system,
      ensure_database: true,
    },
  };

  adapter: Connection_mysql | Connection_postgres;
  raw_config: T_raw_config;

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
    if ( ! c.system.table_name) { throw new Invalid_connection_config('Required: `system.table_name`'); }

    const m = c.migration;
    if (m) {
      if ( ! m.table_name) { throw new Invalid_connection_config('Required: `migration.table_name`'); }
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

  async query<T = any, T_params = any>(opt: IN_query): Promise<T>
  async query<T = any, T_params = any>(sql: string, params: T_params): Promise<T>
  async query(a, b?) {
    return this.adapter.query(a, b);
  }

  /**
   * Check if database exists
   * @param name
   */
  async database_pick(name: string): Promise<T_row_database> {
    return this.adapter.database_pick(name);

  }

  async database_list(): Promise<T_row_database[]> {
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
  async databases_ensure(name: string): Promise<T_row_database> {
    return this.adapter.databases_ensure(name);
  }

  ping(): Promise<boolean> {
    return this.adapter.ping();
  }

  server_version(): Promise<string> {
    return this.adapter.server_version();
  }
}

export type T_raw_config = PoolConfig

export interface T_migration_config {
  table_name?: string
  file_dir?: string
  migration_file_suffix?: string
}

export interface T_system_config {
  table_name?: string
  ensure_database?: boolean
}

export interface T_config_connection {
  type: N_db_type
  host?: string
  port?: number
  username?: string
  password?: string
  uri?: string
  migration?: T_migration_config
  system?: T_system_config
  log?: boolean | Function | T_opt_log
}

export interface T_opt_log {
  logger?: Function
  log_params?: boolean
}

export interface IN_query<T_params = any> {
  sql?: string
  params?: T_params
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

  query<T = any, T_params = any>(sql: string, params?: T_params): Promise<T>

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
  database_list(): Promise<T_row_database[]>

  /**
   * Create database
   */
  database_create(name: string): Promise<T_row_database>

  /**
   * Ensure database
   * Create database if not exists
   */
  databases_ensure(name: string): Promise<T_row_database>

  /**
   * Test connection
   */
  ping(): Promise<boolean>

  /**
   * Get database server version info
   */
  server_version(): Promise<string>
}
