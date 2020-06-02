/**
 * @param v
 * 'a' --> '`a`'
 * ['a', 'aa'] --> '`a` as `aa`'
 */
import { identifier_builder, T_identifier } from '../../../rds/sql/common';

export const identifier = identifier_builder({ quote: '`' });

export function identifiers(v: T_identifier[]) {
  return v.map(identifier).join(', ');
}

export const column = identifier;
export const columns = identifiers;

export const table = identifier;