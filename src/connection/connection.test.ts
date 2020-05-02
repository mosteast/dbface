import { load_env_once } from '@mosteast/env_helper'
import { Invalid_state } from '../error/invalid_state'
import { Connection } from './connection'

beforeEach(async () => {
  await load_env_once(__dirname + '/connection.test.asset.env')
})

it('connect', async () => {
  const con = new Connection({
    type: 'postgres',
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    username: process.env.ormx_username,
    password: process.env.ormx_password,
  })

  const r = await con.query('select datname from pg_database')
  expect(r.rowCount).toBeTruthy()
  await expect(con.database_exists(con.get_config().system.table_name)).resolves.toBeTruthy()
  await expect(con.database_exists(con.get_config().migration.table_name)).resolves.toBeTruthy()
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
