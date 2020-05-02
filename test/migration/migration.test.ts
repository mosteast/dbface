import { load_env_once } from '@mosteast/env_helper'
import { resolve } from 'path'
import { Connection } from '../../src/connection/connection'
import { Migration } from '../../src/migration/migration'

beforeEach(async () => {
  await load_env_once(resolve(__dirname, '../connection.test.asset.env'))
})

it('run', async () => {
  const con = new Connection({
    type: 'postgres',
    host: process.env.ormx_host,
    port: parseInt(process.env.ormx_port),
    username: process.env.ormx_username,
    password: process.env.ormx_password,
    migration: { file_dir: resolve(__dirname, 'migration_dir') },
  })

  const m = new Migration(con)
  await m.run(1)
})
