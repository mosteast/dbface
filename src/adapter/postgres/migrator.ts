import { merge } from 'lodash';
import { T_field, T_field_map, T_table } from '../../type';

export class Migrator {
  /**
   * Diff two table structure
   * @param n - new
   * @param o - old
   */
  static diff(n: T_table, o?: T_table): T_migrator_actions {
    const actions: T_migrator_actions = [];
    if (o) {
      if (n.name != o.name) {
        actions.push({
          action: 'table_rename',
          table: n.name,
          to: n.name,
        } as T_migrator_action_table_rename);
      }

      for (const it in o.primaries!) {
        // todo
      }

      // Possible rename columns
      const renames = [];
      const of: T_field_map = o.fields! || {}; // old fields
      const nf: T_field_map = n.fields! || {}; // new fields
      const mf: T_field_map = merge(of, nf); // merged fields

      for (const key in mf) {
        const field: T_field = of[key];
        if (field) {
          if (field.type != nf[key].type) {
            actions.push({
              action: 'column_update_type',
            } as T_migrator_action_column_update_type);
          }
        }
      }
    } else {
      const row: T_migrator_action_table_create = {
        action: 'table_create',
        table: n.name,
        fields: n.fields!,
      };

      actions.push(row);
    }

    return actions;
  }
}

export type T_migrator_action_name =
  'table_create' | 'table_drop' | 'table_rename' | 'table_update_unique' | 'table_update_primary' |
  'column_create' | 'column_drop' | 'column_rename' |
  'column_update_type' | 'column_update_null' | 'column_update_default' |
  'column_update_unique' | 'column_update_null' | 'column_update_default'

export type T_migrator_actions = T_migrator_action[]

export interface T_migrator_action {
  action: T_migrator_action_name

  [key: string]: any
}

export interface T_migrator_action_table extends T_migrator_action {
  /**
   * Table name
   */
  table: string
}

export interface T_migrator_action_table_create extends T_migrator_action_table {
  action: 'table_create',
  /**
   * Field structure
   */
  fields: T_field_map
}

export interface T_migrator_action_table_drop extends T_migrator_action_table {
  action: 'table_drop',
}

export interface T_migrator_action_table_rename extends T_migrator_action_table {
  action: 'table_rename',
  /**
   * new name
   */
  to: string
}

export interface T_migrator_action_table_update_unique extends T_migrator_action_table {
  action: 'table_update_unique' | 'table_update_primary'
  /**
   * Field group as unique
   */
  unique_fields?: string[]

  /**
   * Key name
   */
  key?: string
}

export interface T_migrator_action_table_update_primary extends T_migrator_action_table_update_unique {
  action: 'table_update_primary'
}

export interface T_migrator_action_column extends T_migrator_action_table {
  /**
   * Column name
   */
  column: string
}

export interface T_migrator_action_column_update_type extends T_migrator_action_table {
  action: 'column_update_type',
  /**
   * Column name
   */
  column: string
  /**
   * New type
   */
  to: string
  /**
   * Type params
   */
  params?: any[]
}

