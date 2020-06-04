import { Pool as Mysql_pool } from 'mysql2/promise';
import { Pool as Pg_pool, PoolConfig } from 'pg';

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

export const migration_log_ = 'migration_log';
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

export type T_raw_config = PoolConfig

export interface T_migration_config {
  file_dir?: string
  migration_file_suffix?: string
}

export interface T_state_config {
  table_name?: string
  ensure_database?: boolean
}

export enum N_dialect {mysql = 'mysql', postgres = 'postgres'}

export interface T_config_connection {
  dialect?: N_dialect
  host?: string
  port?: number
  user?: string
  password?: string
  uri?: string
  migration?: T_migration_config
  state?: T_state_config
  log?: boolean | Function | T_opt_log
}

export interface T_opt_log {
  logger?: Function
  log_params?: boolean
}

export interface T_opt_query<T_params = any> {
  sql?: string
  params?: T_params
  log?: boolean | Function | T_opt_log
}

/**
 * Connection interface
 */
export interface T_connection {
  pool?: Pg_pool | Mysql_pool
  config?: T_config_connection;
  raw_config?: any;

  set_config(conf: T_config_connection): void,

  get_config(): T_config_connection

  /**
   * Convert `config` to "raw config" (e.g. mysql2 or pg config)
   */
  adapt_config(): void

  /**
   * Validate connection configuration
   */
  validate_config(): void

  /**
   * Connect to database server
   */
  connect(): Promise<void>

  /**
   * Close connection
   */
  close(): Promise<void>

  /**
   * Make a sql query
   * @param sql
   * @param params
   */
  query<T = any, T_params = any>(opt: T_opt_query): Promise<T>

  query<T = any, T_params = any>(sql: string, params?: T_params, opt?: T_opt_query): Promise<T>

  /**
   * Kill connection by database
   * @param database
   */
  kill(database: string): Promise<void>

  /**
   * Drop database by name
   */
  database_drop(name: string): Promise<void>

  /**
   * Pick one database
   * Can be used to check whether a  database exists.
   */
  database_pick(name: string): Promise<T_row_database>

  /**
   * List database
   * Like "show databases" in mysql or "\l" in postgres
   */
  database_list(): Promise<T_result<T_row_database>>

  /**
   * Create database
   */
  database_create(name: string): Promise<T_row_database>

  /**
   * Ensure database
   * Create database if not exists
   */
  database_ensure(name: string): Promise<T_row_database>

  /**
   * Test connection
   */
  ping(): Promise<boolean>

  /**
   * Get database server version info
   */
  server_version(): Promise<string>
}

export interface T_result<T = any> {
  rows: T[]
  count?: number
}

export interface T_config_database extends T_config_connection {
  database: string
  state?: T_state_config & { ensure_database?: boolean }
}

export interface T_database_meta {
  name?: string
  table?: { [name: string]: T_table }
}

export interface T_database extends T_connection {
  meta: T_database_meta

  /**
   * Get database config
   */
  get_config(): T_config_database

  /**
   * Refresh database meta info
   */
  refresh_meta(): Promise<T_database_meta>

  /**
   * Get database structure, which contains info about database, all the tables and columns
   */
  inspect(): Promise<T_database_meta>

  /**
   * Create necessary system table and data
   */
  state_init(): Promise<void>

  /**
   * Delete system table and data
   */
  state_destroy(): Promise<void>

  /**
   * Reset system table and data
   */
  state_reset(): Promise<void>

  /**
   * Ensure system state table's existence
   */
  state_ensure_table(): Promise<void>

  /**
   * Drop system state table
   */
  state_drop_table(): Promise<void>

  /**
   * Set system state item
   */
  state_set(key: string, value: any): Promise<void>

  /**
   * Remove a system state item
   */
  state_unset(key: string): Promise<void>

  /**
   * Get system state item
   */
  state_get<T = any>(key: string): Promise<T | undefined>

  /**
   * Count table number
   */
  table_count(): Promise<number>

  /**
   * Create testing table with preset columns
   * @param name
   */
  table_create_test(name: string): Promise<void>

  /**
   * Drop one table
   * @param table
   */
  table_drop(name: string): Promise<void>

  /**
   * Drop all tables from current database
   */
  table_drop_all(): Promise<void>

  /**
   * Get all tables' info
   */
  table_list(): Promise<T_table[]>

  /**
   * Get all table names
   */
  table_list_names(): Promise<string[]>

  /**
   * Get one table info
   * @param name
   */
  table_pick(name: string): Promise<T_table | null>

  /**
   * Get one column info
   */
  column_pick(table: string, name: string): Promise<T_column>

  /**
   * Create a new column
   */
  column_create(table: string, structure: T_column): Promise<void>

  /**
   * Rename a column
   */
  column_rename(table: string, from: string, to: string): Promise<void>

  /**
   * Rename a column
   */
  column_update_type(table: string, name: string, type: T_column_type, type_params?: any): Promise<void>

  /**
   * Update not null constraint
   */
  column_update_nullable(table: string, name: string, nullable: boolean): Promise<void>

  /**
   * Update unique constraint
   */
  column_update_unique(table: string, name: string, unique: boolean): Promise<void>

  /**
   * Update default value
   */
  column_update_default(table: string, name: string, def: any): Promise<void>

  /**
   * Creating necessary tables and datum for migration.
   * --> 2
   */
  migration_log(): Promise<number[] | undefined>

  /**
   * Run migration of n steps
   */
  migration_go(step?: number): Promise<void>

  /**
   * List all migration file names
   * --> ['1.create_xx.m.ts', '2.create_xx.m.ts', '3.create_xx.m.ts']
   */
  migration_list_all(): Promise<string[]>

  /**
   * List all migration ids (files' numeric prefix)
   * --> [1, 2, 3]
   */
  migration_list_all_ids(): Promise<number[]>

  /**
   * Get migration file paths by ids
   * @param ids
   * @example
   * [1, 3] --> ['1.create_xx.m.ts', '3.create_xx.m.ts']
   */
  migration_get_files(ids: number[]): Promise<string[]>
}

export interface T_table<Model = any> {
  name: string
  /**
   * Column definition
   */
  columns?: T_column_map
  /**
   * Primary key
   */
  pk?: T_key_primary

  /**
   * Unique keys
   */
  uks?: T_key_unique_map

  /**
   * Foreign keys
   */
  fks?: T_key_foreign_map
}

export interface T_key_primary {
  /**
   * key name
   */
  key: string
  columns: T_columns
}

export interface T_key_foreign_map {
  [key_name: string]: T_key_foreign
}

export interface T_key_foreign<Source = any, Target = any> {
  /**
   * Key name
   */
  key: string
  /**
   * Foreign source (e.g. order.user_id)
   */
  source: { column: keyof Source },

  /**
   * Foreign target (e.g. user.id)
   */
  target: { table: string, column: keyof Target },
}

export interface T_key_unique {
  /**
   * Key name
   */
  key: string
  columns: T_columns
}

export interface T_key_unique_map<Model = any> {
  [key_name: string]: T_key_unique
}

export type T_columns<Model = any> = (keyof Model)[]

export interface T_column_map {[name: string]: T_column}

export interface T_column_common {
  /**
   * Indicates if this column is a primary key.
   * Same can be achieved when @PrimaryColumn decorator is used.
   */
  primary?: boolean;
  /**
   * Specifies if this column will use auto increment (sequence, generated identity, rowid).
   * Note that in some databases only one column in entity can be marked as generated, and it must be a primary column.
   */
  generated?: boolean | 'increment' | 'uuid' | 'rowid';
  /**
   * Specifies if column's value must be unique or not.
   */
  unique?: boolean;
  /**
   * Indicates if column's value can be set to NULL.
   */
  nullable?: boolean;
  /**
   * Default database value.
   * Note that default value is not supported when column type is 'json' of mysql.
   */
  default?: any;
  /**
   * Column comment. Not supported by all database types.
   */
  comment?: string;
  /**
   * Indicates if this column is an array.
   * Can be simply set to true or array length can be specified.
   * Supported only by postgres.
   */
  array?: boolean;
  /**
   * Specifies a value transformer that is to be used to (un)marshal
   * this column when reading or writing to the database.
   */
  transformer?: T_value_transformer | T_value_transformer[];
}

export interface T_column extends T_column_common {
  /**
   * Column type. Must be one of the value from the ColumnTypes class.
   */
  type?: T_column_type;
  /**
   * Column name in the database.
   */
  name?: string;
  /**
   * Column type's length. Used only on some column types.
   * For example type = "string" and length = "100" means that ORM will create a column with type varchar(100).
   */
  length?: string | number;
  /**
   * Column type's display width. Used only on some column types in MySQL.
   * For example, INT(4) specifies an INT with a display width of four digits.
   */
  width?: number;
  /**
   * Indicates if column's value can be set to NULL.
   */
  nullable?: boolean;

  /**
   * Default database value.
   */
  default?: any;
  /**
   * Indicates if this column is a primary key.
   * Same can be achieved when @PrimaryColumn decorator is used.
   */
  primary?: boolean;

  /**
   * Specifies if column's value must be unique or not.
   */
  unique?: boolean;
  /**
   * Column comment. Not supported by all database types.
   */
  comment?: string;
  /**
   * The precision for a decimal (exact numeric) column (applies only for decimal column), which is the maximum
   * number of digits that are stored for the values.
   */
  precision?: number | null;
  /**
   * The scale for a decimal (exact numeric) column (applies only for decimal column), which represents the number
   * of digits to the right of the decimal point and must not be greater than precision.
   */
  scale?: number;
  /**
   * Puts UNSIGNED attribute on to numeric column. Works only for MySQL.
   */
  unsigned?: boolean;
  /**
   * Defines a column character set.
   * Not supported by all database types.
   */
  charset?: string;
  /**
   * Defines a column collation.
   */
  collation?: string;
  /**
   * Array of possible enumerated values.
   */
  enum?: (string | number)[] | Object;
  /**
   * Exact name of enum
   */
  enum_name?: string;
  // /**
  //  * Return type of HSTORE column.
  //  * Returns value as string or as object.
  //  */
  // hstore_type?: 'object' | 'string';
  // /**
  //  * Indicates if this column is an array.
  //  * Can be simply set to true or array length can be specified.
  //  * Supported only by postgres.
  //  */
  // array?: boolean;
  // /**
  //  * Spatial Feature Type (Geometry, Point, Polygon, etc.)
  //  */
  // spatial_feature_type?: string;
  // /**
  //  * SRID (Spatial Reference ID (EPSG code))
  //  */
  // srid?: number;
}

/**
 * Column types used for @PrimaryGeneratedColumn() decorator.
 */
export declare type PrimaryGeneratedColumnType = 'int' | 'int2' | 'int4' | 'int8' | 'integer' | 'tinyint' | 'smallint' | 'mediumint' | 'bigint' | 'dec' | 'decimal' | 'smalldecimal' | 'fixed' | 'numeric' | 'number' | 'uuid';
/**
 * Column types where spatial properties are used.
 */
export declare type T_spatial_column_type = 'geometry' | 'geography' | 'st_geometry' | 'st_point';
/**
 * Column types where precision and scale properties are used.
 */
export declare type T_with_precision_column_type = 'float' | 'double' | 'dec' | 'decimal' | 'smalldecimal' | 'fixed' | 'numeric' | 'real' | 'double precision' | 'number' | 'datetime' | 'datetime2' | 'datetimeoffset' | 'time' | 'time with time zone' | 'time without time zone' | 'timestamp' | 'timestamp without time zone' | 'timestamp with time zone' | 'timestamp with local time zone';
/**
 * Column types where column length is used.
 */
export declare type T_with_length_column_type = 'character varying' | 'varying character' | 'char varying' | 'nvarchar' | 'national varchar' | 'character' | 'native character' | 'varchar' | 'char' | 'nchar' | 'national char' | 'varchar2' | 'nvarchar2' | 'alphanum' | 'shorttext' | 'raw' | 'binary' | 'varbinary' | 'string';
export declare type T_with_width_column_type = 'tinyint' | 'smallint' | 'mediumint' | 'int' | 'bigint';
/**
 * All other regular column types.
 */
export declare type T_simple_column_type = 'simple-array' | 'simple-json' | 'simple-enum' | 'int2' | 'integer' | 'int4' | 'int8' | 'int64' | 'unsigned big int' | 'float' | 'float4' | 'float8' | 'smallmoney' | 'money' | 'boolean' | 'bool' | 'tinyblob' | 'tinytext' | 'mediumblob' | 'mediumtext' | 'blob' | 'text' | 'ntext' | 'citext' | 'hstore' | 'longblob' | 'longtext' | 'alphanum' | 'shorttext' | 'bytes' | 'bytea' | 'long' | 'raw' | 'long raw' | 'bfile' | 'clob' | 'nclob' | 'image' | 'timetz' | 'timestamptz' | 'timestamp with local time zone' | 'smalldatetime' | 'date' | 'interval year to month' | 'interval day to second' | 'interval' | 'year' | 'seconddate' | 'point' | 'line' | 'lseg' | 'box' | 'circle' | 'path' | 'polygon' | 'geography' | 'geometry' | 'linestring' | 'multipoint' | 'multilinestring' | 'multipolygon' | 'geometrycollection' | 'st_geometry' | 'st_point' | 'int4range' | 'int8range' | 'numrange' | 'tsrange' | 'tstzrange' | 'daterange' | 'enum' | 'set' | 'cidr' | 'inet' | 'macaddr' | 'bit' | 'bit varying' | 'varbit' | 'tsvector' | 'tsquery' | 'uuid' | 'xml' | 'json' | 'jsonb' | 'varbinary' | 'hierarchyid' | 'sql_variant' | 'rowid' | 'urowid' | 'uniqueidentifier' | 'rowversion' | 'array' | 'cube';
/**
 * Any column type column can be.
 */
export declare type T_column_type = T_with_precision_column_type | T_with_length_column_type | T_with_width_column_type | T_spatial_column_type | T_simple_column_type | BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor;

/**
 * Used to marshal data when writing to the database.
 */
export interface T_value_transformer<From = any, To = any> {
  setter(value: To): From

  getter(value: From): To
}

export interface T_migration_module {
  forward(database: T_database): Promise<void>

  backward(database: T_database): Promise<void>
}

export interface IN_migration_run {
  step?: number
}