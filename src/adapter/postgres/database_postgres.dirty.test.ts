import { readdir } from 'fs-extra';
import { keys } from 'lodash';
import { resolve } from 'path';
import { N_dialect } from '../../type';
import { Connection_postgres } from './connection_postgres';
import { Database_postgres, T_config_database_postgres } from './database_postgres';

jest.setTimeout(150000);

const e = process.env;

const name = 'a';

const conf: T_config_database_postgres = {
  database: e.postgres_database!,
  dialect: N_dialect.postgres,
  host: e.postgres_host,
  port: +e.postgres_port!,
  user: e.postgres_user,
  password: e.postgres_password,
  // log: { log_args: true },
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
  expect(keys(row?.columns)).toBeTruthy();
  await db.table_drop(name);
});

it('table_constraint_list', async () => {
  const t = 'a';
  await db.table_create_test(t);
  const r = await db.table_constraint_list(t);
  expect(keys(r).length).toBeTruthy();
  expect(r.pk_a).toBeTruthy();
  expect(r.pk_a.columns).toContain('id');
  expect(r.pk_a.type).toBe('primary');
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
  await db.migration_go();
  for (const it of tbs) { expect(await db.table_pick(it)).toBeTruthy(); }
  const r = await db.table_pick('a');
  expect(r?.columns!.a1).toBeTruthy();
  expect(await db.migration_log()).toEqual([ 1, 2, 3 ]);

  // Backward
  await db.migration_go(-1);
  const r2 = await db.table_pick('a');
  expect(r2?.columns!.a1).toBeFalsy();
  expect(await db.migration_log()).toEqual([ 1, 2 ]);

  await db.migration_go(1);
  const r3 = await db.table_pick('a');
  expect(r3?.columns!.a1).toBeTruthy();
  expect(await db.migration_log()).toEqual([ 1, 2, 3 ]);

  await db.migration_go(-2);
  const r4 = await db.table_pick('a');
  expect(r4?.columns!.id).toBeTruthy();
  expect(r4?.columns!.a1).toBeFalsy();
  expect(await db.table_pick('b')).toBeTruthy();
});

it('inspect/refresh_meta', async () => {
  await db.table_create_test('a');
  await db.table_create_test('b');
  const r = await db.inspect();
  expect(r.name).toBe(db.get_config().database);
  expect(r.table?.a).toBeTruthy();
  expect(r.table?.b).toBeTruthy();

  expect(db.meta).toBeFalsy();
  await db.refresh_meta();
  expect(db.meta).toBeTruthy();
});

it('column_pick', async () => {
  const t = 'b';
  await db.table_create_test(t);
  const r = await db.column_pick(t, 'id');
  expect(r?.name).toBe('id');
  expect(r?.type).toBe('integer');
  expect(r?.nullable).toBe(false);
  const r2 = await db.column_pick(t, 'int2_');
  expect(r2?.type).toBe('smallint');
  const r3 = await db.column_pick(t, 'decimal_');
  expect(r3?.type).toBe('numeric');
  expect(r3?.type_args?.precision).toBe(10);
  expect(r3?.type_args?.scale).toBe(2);
});

it('column_rename', async () => {
  const t = 'a';
  await db.table_create_test(t);
  expect(await db.column_pick(t, 'id')).toBeTruthy();
  await db.column_rename(t, 'id', 'id2');
  expect(await db.column_pick(t, 'id')).toBeFalsy();
  expect(await db.column_pick(t, 'id2')).toBeTruthy();
});

it('column_create', async () => {
  const t = 'a';
  const c1 = 'c1';
  await db.table_create_test(t);
  expect(await db.column_pick(t, c1)).toBeFalsy();
  await db.column_create(t, { name: c1, type: 'decimal', type_args: { precision: 10, scale: 2 }, unique: true, nullable: false, def: 1 });
  expect(await db.column_pick(t, c1)).toBeTruthy();
});

it('column_update_nullable', async () => {
  const t = 'a';
  const c1 = 'int_';
  await db.table_create_test(t);
  await db.column_update_nullable(t, c1, true);
  expect((await db.column_pick(t, c1))?.nullable).toBeTruthy();
  await db.column_update_nullable(t, c1, false);
  expect((await db.column_pick(t, c1))?.nullable).toBeFalsy();
});

it('column_update_unique', async () => {
  const t = 'a';
  const c1 = 'int_';
  await db.table_create_test(t);
  await db.column_update_unique(t, c1, true);
  const cons = await db.table_constraint_list(t);
  expect(cons.uk_a_int_.columns?.includes('int_')).toBeTruthy();
});

it('column_update_default', async () => {
  const t = 'a';
  const c1 = 'int_';
  await db.table_create_test(t);
  const r = await db.column_pick(t, c1);
  const old = r?.def;
  await db.column_update_default(t, c1, 1);
  const r2 = await db.column_pick(t, c1);
  expect(old).not.toBe(r2?.def);
});