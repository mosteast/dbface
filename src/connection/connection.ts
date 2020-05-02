import { cloneDeep } from 'lodash'
import { Pool, PoolConfig, QueryConfig } from 'pg'
import { Invalid_argument } from '../error/invalid_argument'
import { Invalid_connection_config } from '../error/invalid_connection_config'
import { key_replacer } from '../util/obj'

export type T_db_type = 'mysql' | 'mariadb' | 'postgres'

export interface T_config {
  type: T_db_type
  host?: string
  port?: number
  username?: string
  password?: string
  uri?: string
}

export class Connection {
  name?: string
  config?: T_config
  raw: Pool
  raw_config: PoolConfig

  constructor(config?: T_config) {
    if (config) { this.set_config(config) }
  }

  set_config(config: T_config) {
    this.config = config
    this.adapt_config()
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
        throw new Invalid_argument(`We currently not support database type: "${this.config?.type}"`)
    }
  }

  validate_config() {
    if ( ! this.config) { throw new Invalid_connection_config('Empty config') }
  }

  async connect() {
    this.validate_config()
    switch (this.config?.type) {
      case 'postgres':
        const { Pool } = require('pg')
        this.raw = new Pool(this.raw_config)
        break
      default:
        throw new Invalid_argument(`We currently not support database type: "${this.config?.type}"`)
    }
  }

  async close() {
    switch (this.config?.type) {
      case 'postgres':
        await this.raw.end()
        break
      default:
        throw new Invalid_argument(`We currently not support database type: "${this.config?.type}"`)
    }
  }

  async query<T>(config: QueryConfig)
  async query<T>(sql: string, params?: any)
  async query<T>(a, b?) {
    if ( ! this.raw) {
      await this.connect()
    }
    // @ts-ignore
    return this.raw.query<T>(...arguments)
  }
}


