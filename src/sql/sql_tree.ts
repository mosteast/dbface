import { isArray, merge } from 'lodash';
import { N_db_type } from '../rds/connection';
import { Invalid_sql_tree_syntax } from '../error/invalid_sql_tree_syntax';

export type T_node = (T_node | string | number)[]

export interface T_opt_sql_tree {dialect: N_db_type}

export class Sql_tree {
  root: T_node;
  opt: T_opt_sql_tree = { dialect: N_db_type.postgres };

  constructor(node: T_node, opt?: T_opt_sql_tree) {
    this.root = node;
    this.set_opt(opt);
  }

  set_opt(opt: T_opt_sql_tree) {
    if ( ! opt) {return;}
    this.opt = merge(this.opt, opt);
  }

  build(n?: T_node, state?): string {
    n = n || this.root;
    state = state || {};
    let r = '';

    switch ((n[0] as string).toLowerCase()) {
      case 'select':
        r += 'select ';
        const $1 = n[1];
        if ( ! isArray($1)) { throw new Invalid_sql_tree_syntax(`Invalid syntax: select [${$1}] ...`); }
        r += $1.map(identifier_postgres).join(', ');
        break;
      case 'select distinct':
        break;
    }

    return r;
  }
}

function identifier_postgres(name: string): string {
  return '"' + name + '"';
}