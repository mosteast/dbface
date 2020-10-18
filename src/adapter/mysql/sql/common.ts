/**
 * @param v
 * 'a' --> '`a`'
 * ['a', 'aa'] --> '`a` as `aa`'
 */
import { fn_builder_identifier, T_identifier } from '../../../rds/sql/common';

export const trans_identifier = fn_builder_identifier({ quote: '`' });

export function trans_identifiers(v: T_identifier[]) {
  return v.map(trans_identifier).join(', ');
}

export const trans_value = function () {};

export const column = trans_identifier;
export const columns = trans_identifiers;
export const table = trans_identifier;
export const value = trans_value;
