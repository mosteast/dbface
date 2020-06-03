import { merge } from 'lodash';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { N_dialect, T_config_connection, T_config_database, T_database, T_database_meta, T_table } from '../type';
import { Connection } from './connection';
import { def_database } from './constant/defaults';

/**
 * Connection with selected database
 */
export class Database extends Connection implements T_database {
  meta!: T_database_meta;

  pool?: import('pg').Pool | import('mysql2/promise').Pool | undefined;
  config!: T_config_database;
  adapter!: T_database;

  async refresh_meta(): Promise<T_database_meta> {
    return this.meta = await this.adapter.refresh_meta();
  }

  get_config(): T_config_database {
    return super.get_config() as T_config_database;
  }

  async inspect(): Promise<T_database_meta> {
    return this.adapter.inspect();
  }

  /**
   * Validate database configurations
   */
  validate_config() {
    super.validate_config();
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}'); }
  }

  /**
   * Set connection config
   * @param config
   */
  set_config(config: T_config_connection) {
    const { dialect } = config = merge({}, def_database, config);
    let con: T_database;
    switch (dialect) {
      case N_dialect.mysql:
        const Mysql = require('../adapter/mysql/database_mysql').Database_mysql;
        con = new Mysql(config);
        break;
      case N_dialect.postgres:
        const Postgres = require('../adapter/postgres/database_postgres').Database_postgres;
        con = new Postgres(config);
        break;
      default:
        throw new Invalid_connection_config(`Invalid dialect: "${dialect}"`);
    }

    this.adapter = con;
  }

  /**
   * Get one table info
   * @param name
   */
  async table_pick(name: string): Promise<T_table | null> {
    return this.adapter.table_pick(name);
  }

  /**
   * Get all tables
   */
  async table_list() {
    return this.adapter.table_list();
  }

  /**
   * Table count
   */
  async table_count(): Promise<number> {
    return this.adapter.table_count();
  }

  async table_drop(table: string) {
    return this.adapter.table_drop(table);
  }

  /**
   * Drop all tables
   */
  async table_drop_all() {
    return this.adapter.table_drop_all();
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async state_init() {
    await this.adapter.state_init();
  }

  /**
   * Run migration
   */
  async migration_go(step: number = 0) {
    return this.adapter.migration_go(step);
  }

  /**
   * Last migration id
   */
  async migration_log(): Promise<number[] | undefined> {
    return this.adapter.migration_log();
  }

  state_get<T = any>(key: string): Promise<T | undefined> {
    return this.adapter.state_get(key);
  }

  state_set(key: string, value: any): Promise<void> {
    return this.adapter.state_set(key, value);
  }

  state_unset(key: string): Promise<void> {
    return this.adapter.state_unset(key);
  }

  state_ensure_table(): Promise<void> {
    return this.adapter.state_ensure_table();
  }

  migration_list_all(): Promise<string[]> {
    return this.adapter.migration_list_all();
  }

  migration_list_all_ids(): Promise<number[]> {
    return this.adapter.migration_list_all_ids();
  }

  state_drop_table(): Promise<void> {
    return this.adapter.state_drop_table();
  }

  state_destroy(): Promise<void> {
    return this.adapter.state_destroy();
  }

  state_reset(): Promise<void> {
    return this.adapter.state_reset();
  }

  migration_get_files(ids: number[]): Promise<string[]> {
    return this.adapter.migration_get_files(ids);
  }

  table_create_test(name: string): Promise<void> {
    return this.adapter.table_create_test(name);
  }

  table_list_names(): Promise<string[]> {
    return this.adapter.table_list_names();
  }

}

