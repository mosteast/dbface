import { Migrator, T_migrator_action_table_create } from './migrator';

it('diff', async () => {
  const r1 = Migrator.diff({ name: 'a' }, { name: 'b' });
  expect(r1).toHaveLength(1);
  expect(r1[0].action).toBe('table_rename');

  const r2 = Migrator.diff({ name: 'a', fields: { f1: { type: 'int' } } });
  expect(r2).toHaveLength(1);
  const a2: T_migrator_action_table_create = r2[0] as T_migrator_action_table_create;
  expect(a2.action).toBe('table_create');
  expect(a2.table).toBeTruthy();
  expect(a2.fields).toBeTruthy();
});