import { set } from 'lodash';
import { columns } from '../../../build/src/adapter/postgres/sql/common';
import { T_column, T_column_type, T_opt_query } from '../../type';
import { key_replace } from '../../util/obj';

export class Postgres {
  static sql_describe_columns(o: { table: string, select?: string[], column?: string }): T_opt_query {
    return {
      args: [ o.table, o.column ].filter(it => it),
      sql: `
        select ${o.select ? columns(o.select) : '*'}
          from information_schema.columns
          where 
            table_name = $1
            ${o.column ? `and column_name = $2` : ''}
            and table_schema not in ('pg_catalog', 'information_schema');`,
    };
  }

  static sql_column_definition(o: T_column): T_opt_query {
    let type_part = '';

    switch (o.type) {
      case 'decimal':
        break;
    }

    return {
      sql: `
        "${o.name}" ${o.type}`,
    };
  }

  static adapt_column(column_like: T_column | any): T_column {
    const row = key_replace<any>(column_like, {
      column_name: 'name', data_type: 'type', is_nullable: 'nullable',
      character_set_name: 'charset', collation_name: 'collation',
      column_default: 'default',
    });

    row.nullable = row.nullable?.toLowerCase() === 'yes' ? true : false;

    if (([ 'character varying', 'character' ] as T_column_type[]).includes(row.type)) {
      if (row.character_maximum_length) { set(row, 'type_args.length', row.character_maximum_length); }
    }

    if (([ 'decimal', 'numeric' ] as T_column_type[]).includes(row.type)) {
      if (row.numeric_precision) { set(row, 'type_args.precision', row.numeric_precision); }
      if (row.numeric_scale) { set(row, 'type_args.scale', row.numeric_scale); }
    }

    if (([ 'timestamp', 'date', 'time' ] as T_column_type[]).includes(row.type)) {
      if (row.datetime_precision) { set(row, 'type_args.precision', row.datetime_precision); }
    }

    if (([ 'interval' ] as T_column_type[]).includes(row.type)) {
      if (row.inteval_precision) { set(row, 'type_args.precision', row.inteval_precision); }
    }

    return row;
  }
}