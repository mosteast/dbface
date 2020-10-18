import { column, columns, trans_identifier, trans_identifiers, table } from './common';

it('identifier', async () => {
  expect(trans_identifier('a')).toBe('`a`');
  expect(trans_identifier([ 'a', 'aa' ])).toBe('`a` as `aa`');

  expect(column('a')).toBe('`a`');
  expect(column([ 'a', 'aa' ])).toBe('`a` as `aa`');
  expect(table('a')).toBe('`a`');
  expect(table([ 'a', 'aa' ])).toBe('`a` as `aa`');
});

it('identifiers', async () => {
  expect(trans_identifiers([ 'a' ])).toBe('`a`');
  expect(trans_identifiers([ [ 'a', 'aa' ] ])).toBe('`a` as `aa`');
  expect(trans_identifiers([ 'a', 'aa' ])).toBe('`a`, `aa`');
  expect(trans_identifiers([ [ 'a', 'aa' ], [ 'b', 'bb' ] ])).toBe('`a` as `aa`, `b` as `bb`');
  expect(trans_identifiers([ [ 'a', 'aa' ], 'b' ])).toBe('`a` as `aa`, `b`');

  expect(columns([ 'a' ])).toBe('`a`');
  expect(columns([ [ 'a', 'aa' ] ])).toBe('`a` as `aa`');
  expect(columns([ 'a', 'aa' ])).toBe('`a`, `aa`');
  expect(columns([ [ 'a', 'aa' ], [ 'b', 'bb' ] ])).toBe('`a` as `aa`, `b` as `bb`');
  expect(columns([ [ 'a', 'aa' ], 'b' ])).toBe('`a` as `aa`, `b`');
});
