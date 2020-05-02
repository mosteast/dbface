import { reload_env } from '@mosteast/env_helper'
import { Connection, T_config_connection } from './connection'
import { Database, T_config_database } from './database'

let db: Database
let con: Connection

async function reset() {
  await reload_env(__dirname + '/connection.test.asset.env')
  const database = process.env.ormx_database
  const conf_con: T_config_connection = {
    type: 'postgres',
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    username: process.env.ormx_username,
    password: process.env.ormx_password,
  }

  const conf_db: T_config_database = { ...conf_con, database }

  con = new Connection(conf_con)
  db = new Database(conf_db)

  await con.databases_ensure(database)
}

beforeEach(async () => await reset())
afterEach(async () => await reset())

it('table_exists/migration_table_ensure', async () => {
  expect(await db.table_exists('a')).toBeFalsy()

  const tm = db.get_config().migration.table_name
  expect(await db.table_exists(tm)).toBeFalsy()
  await db.migration_table_ensure()
  expect(await db.table_exists(tm)).toBeTruthy()
  await db.table_drop(tm)
})
