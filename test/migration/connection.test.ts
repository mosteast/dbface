import { load_env_once } from '@mosteast/env_helper';
import { Connection, N_db_type } from '../../src/connection/connection';

let con: Connection

async function reset() {
  await load_env_once(__dirname + '/../connection.test.asset.env')
  con = new Connection({
    type: N_db_type.postgres,
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    user: process.env.ormx_username,
    password: process.env.ormx_password,
  })
}

beforeEach(async () => await reset())
afterEach(async () => await reset())

it('connect', async () => {
  const r = await con.query('select datname from pg_database')
  expect(r.rowCount).toBeTruthy()
})

// it('close', async () => {
//   const con = new Connection({
//     type: 'postgres',
//     host: process.env.ormx_host,
//     port: parseInt(process.env.ormx_port),
//     username: process.env.ormx_username,
//     password: process.env.ormx_password,
//   })
// })

