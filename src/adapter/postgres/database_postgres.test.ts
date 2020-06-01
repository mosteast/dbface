import { readdir } from 'fs-extra';
import { keys } from 'lodash';
import { resolve } from 'path';
import { N_db_type } from '../../rds/connection';
import { Connection_postgres } from './connection_postgres';
import { Database_postgres, T_config_database_postgres } from './database_postgres';

jest.setTimeout(150000);

const e = process.env;

const name = 'a';

const conf: T_config_database_postgres = {
  database: e.postgres_database!,
  dialect: N_db_type.postgres,
  host: e.postgres_host,
  port: +e.postgres_port!,
  user: e.postgres_user,
  password: e.postgres_password,
  // log: { log_params: true },
  log: false,
  migration: {
    file_dir: resolve(__dirname, 'test_asset/migration'),
  },
};

let con: Connection_postgres;
let db: Database_postgres;

beforeEach(async () => {
  con = new Connection_postgres(conf);
  await con.connect();
  await con.database_ensure('a');
  db = new Database_postgres(conf);
  await db.connect();
  await db.state_reset();
});

afterEach(async () => {
  await db.table_drop_all();
});

it('table_create_test', async () => {
  await db.table_create_test(name);
  expect(await db.table_pick(name)).toBeTruthy();
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
  await db.table_drop_all();
  for (const it of tbs) { await db.table_create_test(it); }
  const r = await db.table_list_names();
  expect(r?.length).toBe(3);
  for (const it of tbs) { await db.table_drop(it); }
});

it('table_list/table_count', async () => {
  await db.table_drop_all();
  const tbs = [ 'a', 'b', 'c' ];
  for (const it of tbs) { await db.table_create_test(it); }
  const r = await db.table_list();
  expect(r?.length).toBe(3);
  expect(await db.table_pick(tbs[0])).toBeTruthy();
  expect(await db.table_pick(tbs[1])).toBeTruthy();
  expect(await db.table_pick(tbs[2])).toBeTruthy();
  expect(await db.table_pick(tbs[3])).toBeFalsy();
  expect(await db.table_count()).toBe(tbs.length);
  for (const it of tbs) { await db.table_drop(it); }
  expect(await db.table_pick(tbs[0])).toBeFalsy();
  expect(await db.table_pick(tbs[1])).toBeFalsy();
  expect(await db.table_pick(tbs[2])).toBeFalsy();
  expect(await db.table_count()).toBe(0);
});

it('table_pick', async () => {
  await db.table_create_test(name);
  const row = await db.table_pick(name);
  console.log(row);
  expect(keys(row?.fields)).toBeTruthy();
  await db.table_drop(name);
});

it('migration_list_all/migration_list_all_ids', async () => {
  const names = await db.migration_list_all();
  const ids = await db.migration_list_all_ids();
  const files = await readdir(db.get_config().migration?.file_dir!);
  for (const it of files) { expect(names.includes(it)).toBeTruthy(); }
  for (const it of files) { expect(ids.includes(+it.split('.')[0])).toBeTruthy(); }
});

it('migration_get_files', async () => {
  const files = await readdir(db.get_config().migration?.file_dir!);
  const set = [ 1, 2 ];
  const r = await db.migration_get_files(set);
  expect(r.length).toBe(set.length);
  for (const it of r) {
    expect(files.includes(it));
  }
});

it('state_init', async () => {
  await db.table_drop_all();
  const name = db.get_config().state!.table_name!;
  expect(await db.table_pick(name)).toBeFalsy();
  await db.state_init();
  expect(await db.table_pick(name)).toBeTruthy();
  await db.state_drop_table();
  expect(await db.table_pick(name)).toBeFalsy();
});

it('state_get', async () => {
  await db.state_reset();
  const key = 'a';
  await db.state_unset(key);
  expect(await db.state_get(key)).toBeFalsy();
  await db.state_set(key, 1);
  expect(await db.state_get(key)).toBe(1);
});

it('migration_run', async () => {
  await db.state_reset();
  const tbs = [ 'a', 'b' ];
  for (const it of tbs) { expect(await db.table_pick(it)).toBeFalsy(); }
  // Forward
  await db.migration_run();
  for (const it of tbs) { expect(await db.table_pick(it)).toBeTruthy(); }
  const r = await db.table_pick('a');
  expect(r?.fields!.a1).toBeTruthy();
  expect(await db.migration_log()).toEqual([ 1, 2, 3 ]);

  // Backward
  await db.migration_run(-1);
  const r2 = await db.table_pick('a');
  expect(r2?.fields!.a1).toBeFalsy();
  expect(await db.migration_log()).toEqual([ 1, 2 ]);

  await db.migration_run(1);
  const r3 = await db.table_pick('a');
  expect(r3?.fields!.a1).toBeTruthy();
  expect(await db.migration_log()).toEqual([ 1, 2, 3 ]);

  await db.migration_run(-2);
  const r4 = await db.table_pick('a');
  expect(r4?.fields!.id).toBeTruthy();
  expect(r4?.fields!.a1).toBeFalsy();
  expect(await db.table_pick('b')).toBeTruthy();
});
