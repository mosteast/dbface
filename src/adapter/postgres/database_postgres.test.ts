import { N_db_type } from '../../connection/connection';
import { Connection_postgres } from './connection_postgres';
import { Database_postgres, T_config_database_postgres } from './database_postgres';

const e = process.env;

const conf: T_config_database_postgres = {
  database: e.postgres_database,
  dialect: N_db_type.postgres,
  host: e.postgres_host,
  port: +e.postgres_port,
  user: e.postgres_user,
  password: e.postgres_password,
  log: { log_params: true },
};

let con: Connection_postgres;
let db: Database_postgres;

beforeEach(async () => {
  con = new Connection_postgres(conf);
  await con.connect();
  await con.database_ensure('a');
  db = new Database_postgres(conf);
  await db.connect();
});

it('table_pick/table_drop', async () => {
  const name = 'a';
  await db.table_create_test(name);
  const r = await db.table_pick(name);
  expect(r?.name).toBe(name);
  await db.table_drop(name);
  expect(await db.table_pick(name)).toBeFalsy();
});

it('table_list', async () => {
  const tbs = [ 'a', 'b', 'c' ];
  for (const it of tbs) { await db.table_create_test(it); }
  const r = await db.table_list();
  expect(r?.length).toBe(3);
  expect(await db.table_pick(tbs[0])).toBeTruthy();
  expect(await db.table_pick(tbs[1])).toBeTruthy();
  expect(await db.table_pick(tbs[2])).toBeTruthy();
  expect(await db.table_pick(tbs[3])).toBeFalsy();
  for (const it of tbs) { await db.table_drop(it); }
  expect(await db.table_pick(tbs[0])).toBeFalsy();
  expect(await db.table_pick(tbs[1])).toBeFalsy();
  expect(await db.table_pick(tbs[2])).toBeFalsy();
});

it('table_create', async () => {

});