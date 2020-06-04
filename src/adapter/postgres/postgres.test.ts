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