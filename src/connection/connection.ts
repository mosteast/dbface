import { cloneDeep } from 'lodash'
import { Pool, PoolConfig, QueryConfig } from 'pg'
import { Invalid_argument } from '../error/invalid_argument'
import { Invalid_connection_config } from '../error/invalid_connection_config'

export type T_db_type = 'mysql' | 'mariadb' | 'postgres'

export interface T_config {
  type?: T_db_type
  host?: string
  port?: number
  username?: string
  password?: string
  uri?: string
}

export class Connection {
  name?: string
  config?: T_config
  type: T_db_type
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
    const c = this.raw_config = cloneDeep<T_config>(this.config)
    switch (this.type) {
      case 'postgres':
        this.raw_config.connectionString = c.uri
        // @ts-ignore
        delete this.raw_config.uri
        break
      default:
        throw new Invalid_argument(`We currently not support "${this.type}"`)
    }
  }

  validate_config() {
    if ( ! this.config) { throw new Invalid_connection_config('Empty config') }
  }

  connect() {
    this.validate_config()
    switch (this.type) {
      case 'postgres':
        const { Pool } = require('pg')
        this.raw = new Pool(this.raw_config)
        break
      default:
        throw new Invalid_argument(`We currently not support "${this.type}"`)
    }
  }

  async close() {
    switch (this.type) {
      case 'postgres':
        await this.raw.end()
        break
      default:
        throw new Invalid_argument(`We currently not support "${this.type}"`)
    }
  }

  async query<T>(config: QueryConfig)
  async query<T>(sql: string, params?: any)
  async query<T>(a, b?) {
    // @ts-ignore
    return this.raw.query<T>(...arguments)
  }
}


