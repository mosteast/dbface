import { Postgres } from './postgres';

it('sql_describe_columns', async () => {
  const table = 'ttt';
  const column = 'ccc';
  const r = Postgres.sql_describe_columns({ table });
  expect(r.args[0]).toBe(table);
  expect(r.args[1]).toEqual(undefined);
  expect(r.sql).toContain('select *');
  const r2 = Postgres.sql_describe_columns({ table, column });
  expect(r2.args[0]).toBe(table);
  expect(r2.args[1]).toBe(column);
  const r3 = Postgres.sql_describe_columns({ table, column, select: [ 'a', 'b', 'c' ] });
  expect(r3.sql).not.toContain('select *');
});

it('sql_column_type', async () => {
  expect(Postgres.sql_part_column_type('decimal')).toBe('decimal');
  expect(Postgres.sql_part_column_type('decimal', { precision: 10 })).toBe('decimal(10)');
  expect(Postgres.sql_part_column_type('decimal', { precision: 10, scale: 2 })).toBe('decimal(10,2)');
  expect(Postgres.sql_part_column_type('varchar')).toBe('varchar');
  expect(Postgres.sql_part_column_type('varchar', { length: 10 })).toBe('varchar(10)');
});

it('sql_column_create', async () => {
  const a = Postgres.sql_column_create({ table: 'a', column: { name: 'a1', type: 'decimal', type_args: { precision: 10 }, nullable: true } });
  expect(a.sql).toBe('alter table "a" add "a1" decimal(10) null');

  const b = Postgres.sql_column_create({ table: 'a', column: { name: 'a1', type: 'decimal', type_args: { precision: 10 }, nullable: true, default_value: 1 } });
  expect(b.sql).toBe('alter table "a" add "a1" decimal(10) null default $1');
  expect(b.args[0]).toBe(1);

  const c = Postgres.sql_column_create({ table: 'a', column: { name: 'a1', type: 'decimal', type_args: { precision: 10 }, nullable: false, unique: true } });
  expect(c.sql).toBe('alter table "a" add "a1" decimal(10) not null unique');
});