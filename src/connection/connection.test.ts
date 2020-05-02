import { load_env_once } from '@mosteast/env_helper'
import { Invalid_state } from '../error/invalid_state'
import { Connection, T_config_connection } from './connection'

let con: Connection

async function reset() {
  await load_env_once(__dirname + '/connection.test.asset.env')
  con = new Connection({
    type: 'postgres',
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    username: process.env.ormx_username,
    password: process.env.ormx_password,
  })
}

beforeEach(async () => await reset())
afterEach(async () => await reset())

it('connect', async () => {
  const r = await con.query('select datname from pg_database')
  expect(r.rowCount).toBeTruthy()
  // await expect(con.table_exists(con.get_config().system.table_name)).resolves.toBeTruthy()
  // await expect(con.table_exists(con.get_config().migration.table_name)).resolves.toBeTruthy()
})

it('close', async () => {
  const con = new Connection({
    type: 'postgres',
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    username: process.env.ormx_username,
    password: process.env.ormx_password,
  })

  await con.close()
  await expect(con.query('select datname from pg_database')).rejects.toThrow(Invalid_state)
})

