import { resolve } from 'path';
import { N_dialect } from '../../type';
import { Connection_mysql } from './connection_mysql';
import { Database_mysql, T_config_database_mysql } from './database_mysql';

const e = process.env;

const conf: T_config_database_mysql = {
  database: e.mysql_database!,
  dialect: N_dialect.mysql,
  host: e.mysql_host,
  port: +e.mysql_port!,
  user: e.mysql_user,
  password: e.mysql_password,
  // log: { log_params: true },
  log: false,
  migration: {
    file_dir: resolve(__dirname, 'test_asset/migration'),
  },
};

let con: Connection_mysql;
let db: Database_mysql;

beforeEach(async () => {
  con = new Connection_mysql(conf);
  await con.connect();
  await con.database_ensure('a');
  // db = new Database_mysql(conf);
  // await db.connect();
  // await db.state_reset();
});

it('can connect', async () => {
  expect(await con.ping()).toBeTruthy();
});

it('database_create', async () => {
  const name = 'a';
  await con.database_drop(name);
  expect((await con.database_create(name)).name).toBe(name);
});

it('database_pick', async () => {
  const name = 'a';
  await con.database_drop(name);
  await con.database_create(name);
  expect((await con.database_pick(name)).name).toBe(name);
});

it('database_drop', async () => {
  const name = 'a';
  await con.database_ensure(name);
  expect((await con.database_pick(name))).toBeTruthy();
  await con.database_drop(name);
  expect((await con.database_pick(name))).toBeFalsy();
});