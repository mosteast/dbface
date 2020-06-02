import { N_dialect } from '../../type';
import { Connection_postgres, T_config_connection_postgres } from './connection_postgres';

jest.setTimeout(15000);

const e = process.env;

const name = 'a';

const conf: T_config_connection_postgres = {
  dialect: N_dialect.postgres,
  host: e.postgres_host,
  port: +e.postgres_port!,
  user: e.postgres_user,
  password: e.postgres_password,
  log: { log_params: true },
};

let con: Connection_postgres;

beforeEach(async () => {
  con = new Connection_postgres();
  con.set_config(conf);
  await con.connect();
  await con.kill(name);
});

it('can connect', async () => {
  expect(await con.ping()).toBeTruthy();
});

it('database_create', async () => {
  await con.database_drop(name);
  expect((await con.database_create(name)).name).toBe(name);
});

it('database_pick', async () => {
  await con.database_drop(name);
  await con.database_create(name);
  expect((await con.database_pick(name)).name).toBe(name);
});

it('database_drop', async () => {
  await con.database_ensure(name);
  expect((await con.database_pick(name))).toBeTruthy();
  await con.database_drop(name);
  expect((await con.database_pick(name))).toBeFalsy();
});