/**
 * @param v
 * 'a' --> '`a`'
 * ['a', 'aa'] --> '`a` as `aa`'
 */
import { fn_builder_identifier, T_identifier } from '../../../rds/sql/common';

export const identifier = fn_builder_identifier({ quote: '"' });

export function identifiers(v: T_identifier[]) {
  return v.map(identifier).join(', ');
}

export const column = identifier;
export const columns = identifiers;

export const table = identifier;
