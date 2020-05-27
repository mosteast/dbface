import { reload_env } from '@mosteast/env_helper';
import { resolve } from 'path';
import { Connection, T_config_connection, N_db_type } from '../../src/connection/connection';
import { Database, T_config_database } from '../../src/connection/database';

let db: Database
let con: Connection

async function reset() {
  await reload_env(__dirname + '/../connection.test.asset.env')
  const database = process.env.ormx_database
  const conf_con: T_config_connection = {
    dialect: N_db_type.postgres,
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    user: process.env.ormx_username,
    password: process.env.ormx_password,
  }

  const conf_db: T_config_database = { ...conf_con, database }

  con = new Connection(conf_con)
  db = new Database(conf_db)

  await con.databases_ensure(database)
  await db.table_drop_all()
}

beforeEach(async () => await reset())
afterEach(async () => await reset())

it('table_exists/migration_table_ensure', async () => {
  expect(await db.table_exists('a')).toBeFalsy()

  const tm = db.get_config().migration.table_name
  expect(await db.table_exists(tm)).toBeFalsy()
  await db.table_ensure_migration()
  expect(await db.table_exists(tm)).toBeTruthy()
})

it('table_list', async () => {
  expect((await db.table_list()).length).toBe(0)
  await db.table_ensure_migration()
  expect((await db.table_list()).length).toBe(1)

})

it('table_create_holder/table_drop_all', async () => {
  await db.table_create_holder(1)
  expect(await db.table_count()).toBe(1)
  await db.table_create_holder(2)
  expect(await db.table_count()).toBe(2)
  await db.table_create_holder(3)
  expect(await db.table_count()).toBe(3)
  await db.table_drop_all()
  expect((await db.table_list()).length).toBe(0)
})

it('migration_run', async () => {
  const db = new Database({
    database: process.env.ormx_database,
    dialect: N_db_type.postgres,
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    user: process.env.ormx_username,
    password: process.env.ormx_password,
    migration: { file_dir: resolve(__dirname, 'migration_dir') },
  })

  await db.table_ensure_migration()
  await db.migration_run()
})