import { Migrator, T_migrator_action_column_update_nullable, T_migrator_action_column_update_type, T_migrator_action_table_create } from './migrator';

it('diff', async () => {
  const r1 = Migrator.diff({ name: 'a' }, { name: 'b' });
  expect(r1).toHaveLength(1);
  expect(r1[0].action).toBe('table_rename');

  const r2 = Migrator.diff({ name: 'a', columns: { f1: { type: 'int' } } });
  expect(r2).toHaveLength(1);
  const a2: T_migrator_action_table_create = r2[0] as T_migrator_action_table_create;
  expect(a2.action).toBe('table_create');
  expect(a2.table).toBeTruthy();
  expect(a2.columns).toBeTruthy();

  const r3 = Migrator.diff({ name: 'a', columns: { f1: { type: 'int' } } }, { name: 'a', columns: { f1: { type: 'text' } } });
  expect(r3).toHaveLength(1);
  const a3: T_migrator_action_column_update_type = r3[0] as T_migrator_action_column_update_type;
  expect(a3.action).toBe('column_update_type');
  expect(a3.to).toBe('int');

  const r4 = Migrator.diff({ name: 'a', columns: { f1: { nullable: false } } }, { name: 'a', columns: { f1: { nullable: true } } });
  expect(r4).toHaveLength(1);
  const a4: T_migrator_action_column_update_nullable = r4[0] as T_migrator_action_column_update_nullable;
  expect(a4.action).toBe('column_update_nullable');
  expect(a4.nullable).toBe(false);

  const r5 = Migrator.diff({ name: 'a', columns: { f1: { nullable: false } } }, { name: 'a', columns: { f1: { nullable: true } } });
  expect(r5).toHaveLength(1);
  const a5: T_migrator_action_column_update_nullable = r5[0] as T_migrator_action_column_update_nullable;
  expect(a5.action).toBe('column_update_nullable');
  expect(a5.nullable).toBe(false);
});