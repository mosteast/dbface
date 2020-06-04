import { columns } from '../../../build/src/adapter/postgres/sql/common';
import { T_column, T_opt_query } from '../../type';
import { key_replace } from '../../util/obj';

export class Postgres {
  static sql_describe_columns(o: { table: string, select?: string[], column?: string }): T_opt_query {
    return {
      params: [ o.table, o.column ].filter(it => it),
      sql: `
        select ${o.select ? columns(o.select) : '*'}
          from information_schema.columns
          where 
            table_name = $1
            ${o.column ? `and column_name = $2` : ''}
            and table_schema not in ('pg_catalog', 'information_schema');`,
    };
  }

  static adapt_column(column_like: T_column | any): T_column {
    const row = key_replace<any>(column_like, {
      column_name: 'name', data_type: 'type', is_nullable: 'nullable',
      character_set_name: 'charset', collation_name: 'collation',
      numeric_precision: 'precision', numeric_scale: 'scale',
      column_default: 'default',
    });

    row.nullable = row.nullable?.toLowerCase() === 'yes' ? true : false;
    return row;
  }
}