import { EID_common } from '@mosteast/common_eid';
import { Invalid_argument } from './invalid_argument';

export class Invalid_sql_tree_syntax extends Invalid_argument {
  eid = EID_common.invalid_argument;
}
