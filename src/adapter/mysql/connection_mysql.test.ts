import { N_db_type } from '../../rds/connection';
import { Connection_mysql, T_config_connection_mysql } from './connection_mysql';

const e = process.env;

const conf: T_config_connection_mysql = {
  dialect: N_db_type.mysql,
  host: e.mysql_host,
  port: +e.mysql_port,
  user: e.mysql_user,
  password: e.mysql_password,
  log: { log_params: true },
};

let con: Connection_mysql;

beforeEach(async () => {
  con = new Connection_mysql();
  con.set_config(conf);
  await con.connect();
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