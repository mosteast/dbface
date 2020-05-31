export interface T_object {
  [key: string]: any
}

/**
 * Error level
 *
 * Always modify this with cation, since different level could
 * means different logic and action.
 */
export enum E_level {
  internal = 'internal',
  external = 'external',
}

export const table_migration = 'dbface_migration';
export const table_state = 'dbface_system';

/**
 * Single database row returned from database after list database (like "show database")
 */
export interface T_row_database {
  name?: string
  encoding?: string
  collate?: string
  owner?: string // postgres only
}