import * as events from 'events'
import { cloneDeep, merge } from 'lodash'
import { resolve } from 'path'
import { Pool, PoolConfig, QueryConfig } from 'pg'
import { pwd } from 'shelljs'
import { Invalid_connection_config } from '../error/invalid_connection_config'
import { not_supported_db } from '../error/util/not_supported_db'
import { key_replacer } from '../util/obj'

export type T_db_type = 'mysql' | 'mariadb' | 'postgres'

export type T_raw_config = PoolConfig

export interface T_migration_config {
  table_name?: string
  file_dir?: string
}

export interface T_system_config {
  table_name?: string
  ensure_database?: boolean
}

export interface T_config_connection {
  type: T_db_type
  host?: string
  port?: number
  username?: string
  password?: string
  uri?: string
  migration?: T_migration_config
  system?: T_system_config
}

/**
 * Pure DB server connection (without database)
 */
export class Connection<Config extends T_config_connection = T_config_connection> extends events.EventEmitter {
  static def: T_config_connection | any = {
    type: 'postgres',
    migration: {
      table_name: 'ormx_migration',
      file_dir: resolve(pwd().toString(), 'database/migration'),
    },
    system: {
      table_name: 'ormx_system',
      ensure_database: true,
    },
  }
  protected config?: Config
  raw: Pool
  protected raw_config: T_raw_config

  constructor(config?: Config) {
    super()
    if (config) { this.set_config(config) }
  }

  /**
   * Set connection config
   * @param config
   */
  set_config(config: Config) {
    // @ts-ignore
    this.config = merge(this.constructor.def, config)
    this.adapt_config()
  }

  /**
   * Get connection config
   */
  get_config(): Config {
    return cloneDeep(this.config)
  }

  /**
   * Get adapted raw connection config
   */
  get_raw_config(): T_raw_config {
    return cloneDeep(this.raw_config)
  }

  /**
   * Get raw connection
   */
  get_raw() {
    return this.raw
  }

  /**
   * Convert `config` to "raw config" (e.g. mysql2 or pg config)
   */
  adapt_config() {
    this.raw_config = cloneDeep<Config>(this.config)
    switch (this.config?.type) {
      case 'postgres':
        key_replacer(this.raw_config, { uri: 'connectionString', username: 'user' })
        break
      default:
        not_supported_db(this.config?.type)
    }
  }

  /**
   * Config validation
   */
  validate_config() {
    const c = this.config
    if ( ! c) { throw new Invalid_connection_config('Empty config') }
    if ( ! c.system.table_name) { throw new Invalid_connection_config('Required: `system.table_name`') }

    const m = c.migration
    if (m) {
      if ( ! m.table_name) { throw new Invalid_connection_config('Required: `migration.table_name`') }
      if ( ! m.file_dir) { throw new Invalid_connection_config('Required: `migration.file_dir`') }
    }
  }

  /**
   * Connect to database/pool
   */
  async connect() {
    this.validate_config()
    switch (this.config?.type) {
      case 'postgres':
        const { Pool } = require('pg')
        this.raw = new Pool(this.raw_config)
        break
      default:
        not_supported_db(this.config?.type)
    }

    await this.init_state()
  }

  /**
   * Close connection
   */
  async close() {
    switch (this.config?.type) {
      case 'postgres':
        await this.raw?.end()
        break
      default:
        not_supported_db(this.config?.type)
    }
    this.raw = null
  }

  async query<T>(config: QueryConfig)
  async query<T>(sql: string, params?: any)
  async query<T>(a, b?) {
    if ( ! this.raw) { await this.connect() }
    // @ts-ignore
    return this.raw.query<T>(...arguments)
  }

  /**
   * Initialize database state
   * Creating necessary tables and datum.
   */
  async init_state() {}

  /**
   * Check if database exists
   * @param name
   */
  async database_exists(name: string): Promise<boolean> {
    let r = false

    switch (this.config.type) {
      case 'postgres':
        const a = await this.query(`select datname from pg_database where datname = '${name}'`)
        r = a.rowCount ? a : false
        break
    }

    return r
  }

  async database_create(name: string) {
    await this.query(`create database ${name}`)
  }

  async database_drop(name: string) {
    await this.query(`drop database if exists "${name}"`)
  }

  /**
   * Create database if not exists
   * @param name
   */
  async databases_ensure(name: string)
  async databases_ensure(names: string[])
  async databases_ensure(a) {
    if (typeof a === 'string') {
      a = [ a ]
    }

    for (const name of a) {
      if (await this.database_exists(name)) { continue }
      await this.database_create(name)
    }
  }
}