import { load_env_once } from '@mosteast/env_helper'
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
})
