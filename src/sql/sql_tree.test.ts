import { N_db_type } from '../connection/connection';
import { Sql_tree } from './sql_tree';

it('parse select', async () => {
  const tree = new Sql_tree([ 'select', [ 'c1', 'c2', 'c3' ], 'from', 't1' ], { dialect: N_db_type.postgres });
  expect(tree.build()).toBe('select "c1", "c2", "c3" from "t1"');
});