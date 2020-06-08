import { set } from 'lodash';
import { T_column, T_column_type, T_column_type_args, T_constraint_type, T_opt_query } from '../../type';
import { key_replace } from '../../util/obj';

export class Postgres {
  static sql_describe_columns(o: { table: string, column?: string, has_constraint?: boolean }): T_opt_query {
    return {
      args: [ o.table, o.column ].filter(it => it),
      // ${o.with_constraint ? `inner join`}
      sql: `
select cons.table_schema as schema,
       cons.constraint_name,
       cons.constraint_type,
       cols.*
from information_schema.columns cols
       left join information_schema.constraint_column_usage uses
                 on cols.table_name = uses.table_name and
                    cols.column_name = uses.column_name
       left join information_schema.table_constraints cons
                  on uses.table_name = cons.table_name and
                     uses.table_schema = cons.table_schema and
                     uses.constraint_name = cons.constraint_name
where cols.table_name = $1
    and cols.table_schema not in ('pg_catalog', 'information_schema')
    ${o.column ? `and cols.column_name = $2` : ''}
    ${o.has_constraint ? `and cons.constraint_name is not null` : ''}
;`,

    };
  }

  static sql_column_create(o: { table: string, column: T_column }): T_opt_query {
    const { table, column: { name, type, def, type_args, nullable, unique } } = o;
    return {
      sql: `alter table "${table}" add "${name}" ${this.sql_part_column_type(type!, type_args)}${nullable ? ' null' : ' not null'}${def ? ` default '${def}'` : ''}${unique ? ' unique' : ''}`,
    };
  }

  static sql_part_column_type(type: T_column_type, args?: T_column_type_args): string {
    let sql: string = type.toString();

    if (args) {
      if (args.precision || args.scale) {
        sql += `(${args.precision}${args.scale ? `,${args.scale}` : ''})`;
      } else if (args.length) {
        sql += `(${args.length})`;
      }
    }

    return sql;
  }

  /**
   * PRIMARY KEY --> primary
   * FOREIGN KEY --> foreign
   * UNIQUE --> unique
   * CHECK --> check
   */
  static adapt_constraint_name(name: string): T_constraint_type {
    const map: { [key: string]: T_constraint_type } = {
      'PRIMARY KEY': 'primary',
      'UNIQUE': 'unique',
      'FOREIGN KEY': 'foreign',
      'CHECK': 'check',
    };

    return map[name.toUpperCase()] ?? name;
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
    const row: any = key_replace<T_column>(column_like, {
      column_name: 'name', data_type: 'type', is_nullable: 'nullable',
      character_set_name: 'charset', collation_name: 'collation',
      column_default: 'def',
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