import * as events from 'events'
import { cloneDeep, merge } from 'lodash'
import { Pool, PoolConfig, QueryConfig } from 'pg'
import { Invalid_connection_config } from '../error/invalid_connection_config'
import { Invalid_state } from '../error/invalid_state'
import { not_supported_db } from '../error/util/not_supported_db'
import { key_replacer } from '../util/obj'

export type T_db_type = 'mysql' | 'mariadb' | 'postgres'

export type T_raw_config = PoolConfig

export interface T_migration_config {
  table_name?: string
  file_dir?: string
}

export interface T_system_config {
  table_name: string
}

export interface T_config {
  type: T_db_type
  host?: string
  port?: number
  username?: string
  password?: string
  uri?: string
  migration?: T_migration_config
  system?: T_system_config
}

const default_confg: T_config = {
  type: 'postgres',
  migration: {
    table_name: 'ormx_migration',
  },
  system: {
    table_name: 'ormx_system',
  },
}

export class Connection extends events.EventEmitter {
  protected config?: T_config
  raw: Pool
  protected raw_config: T_raw_config
  closed = false

  constructor(config?: T_config) {
    super()
    if (config) { this.set_config(config) }
  }

  /**
   * Set connection config
   * @param config
   */
  set_config(config: T_config) {
    this.config = merge(default_confg, config)
    this.adapt_config()
  }

  /**
   * Get connection config
   */
  get_config(): T_config {
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
    this.raw_config = cloneDeep<T_config>(this.config)
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

    // if ( ! c.system.table_name) { throw new Invalid_connection_config('Required: `system.table_name`') }
    // if ( ! c.migration.table_name) { throw new Invalid_connection_config('Required: `migration.table_name`') }
  }

  /**
   * Connect to database/pool
   */
  async connect() {
    if (this.closed) { throw new Invalid_state('Connection has closed.') }

    this.validate_config()
    switch (this.config?.type) {
      case 'postgres':
        const { Pool } = require('pg')
        this.raw = new Pool(this.raw_config)
        break
      default:
        not_supported_db(this.config?.type)
    }

    this.listen()
    await this.init_state()
  }

  listen() {
    this.raw.on('error', (e, client) => {
      console.error(e)
    })

    this.raw.on('connect', e => {
      this.closed = false
    })
  }

  /**
   * Initialize database state
   * Creating necessary tables and datum.
   */
  async init_state() {
    await this.init_state_migration()
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async init_state_migration() {
    const c = this.config
    if ( ! c.migration) { return }
    await this.ensure_databases([ c.migration.table_name, c.system.table_name ])
  }

  /**
   * Check database exists
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

  async create_database(name: string) {
    switch (this.config.type) {
      case 'postgres':
        await this.raw.query(`create database "${name}"`)
        break
    }
  }

  async ensure_databases(name: string)
  async ensure_databases(names: string[])
  async ensure_databases(a) {
    if (typeof a === 'string') {
      a = [ a ]
    }

    for (const name of a) {
      if (await this.database_exists(name)) { continue }
      await this.create_database(name)
    }
  }

  /**
   * Close connection
   */
  async close() {
    this.closed = true

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
}


