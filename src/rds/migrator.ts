import { merge } from 'lodash';
import { T_column, T_column_map, T_table } from '../type';

export class Migrator {
  /**
   * Diff two table structure
   * @param to - new
   * @param from - old
   */
  static diff(to: T_table, from?: T_table): T_migrator_actions {
    const actions: T_migrator_actions = [];
    const table = from?.name;
    let common: any = { table };

    if (from) {
      if (to.name != table) {
        actions.push({
          ...common,
          action: 'table_rename',
          to: to.name,
        } as T_migrator_action_table_rename);

        common.table = to.name; // change to new table name for following actions
      }

      for (const it in from.pk!) {
        // todo
      }

      // Possible rename columns
      const ofs: T_column_map = from.columns! || {}; // old columns
      const nfs: T_column_map = to.columns! || {}; // new columns
      const mfs: T_column_map = merge({}, ofs, nfs); // merged columns

      for (const key in mfs) {
        common.column = key;
        const of: T_column = ofs[key];
        const nf: T_column = nfs[key];
        if (of) { // existing column
          if (of.type !== nf.type) {
            actions.push({
              ...common,
              action: 'column_update_type',
              to: nf.type,
            } as T_migrator_action_column_update_type);
          }

          if (of.nullable !== nf.nullable) {
            actions.push({
              ...common,
              action: 'column_update_nullable',
              nullable: nf.nullable,
            } as T_migrator_action_column_update_nullable);
          }
        }
      }
    } else {
      actions.push({
        table: to.name,
        action: 'table_create',
        columns: to.columns!,
      } as T_migrator_action_table_create);
    }

    return actions;
  }
}

export type T_migrator_action_name =
  'table_create' | 'table_drop' | 'table_rename' | 'table_update_unique' | 'table_update_primary' |
  'column_create' | 'column_drop' | 'column_rename' |
  'column_update_type' | 'column_update_nullable' | 'column_update_default' |
  'column_update_unique'

export type T_migrator_actions = T_migrator_action[]

export interface T_migrator_action {
  action: T_migrator_action_name
  /**
   * Table name
   */
  table: string
}

export interface T_migrator_action_table extends T_migrator_action {}

export interface T_migrator_action_table_create extends T_migrator_action_table {
  action: 'table_create',
  /**
   * column structure
   */
  columns: T_column_map
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
   * column group as unique
   */
  unique_columns?: string[]

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

export interface T_migrator_action_column_update_type extends T_migrator_action_column {
  action: 'column_update_type',
  /**
   * New type
   */
  to: string
  // /**
  //  * Type params
  //  */
  // params?: any[]
}

export interface T_migrator_action_column_update_nullable extends T_migrator_action_column {
  action: 'column_update_nullable',
  /**
   * Nullable
   */
  nullable: boolean
}

