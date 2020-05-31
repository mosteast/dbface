import { Database_postgres } from '../adapter/postgres/database_postgres';
import { Invalid_connection_config } from '../error/invalid_connection_config';
import { Connection, T_config_connection, T_connection, T_state_config } from './connection';

export interface T_config_database extends T_config_connection {
  database: string
  state?: T_state_config & { ensure_database?: boolean }
}

/**
 * Connection with selected database
 */
export class Database extends Connection implements T_database {
  // static def: T_config_database = merge(Connection.def, { system: { ensure_database: true } })
  config!: T_config_database;

  adapter!: Database_postgres;

  /**
   * Validate database configurations
   */
  validate_config() {
    super.validate_config();
    if ( ! this.config.database) { throw new Invalid_connection_config('Required configs: {database}'); }
  }

  /**
   * Get one table info
   * @param name
   */
  async table_pick(name: string): Promise<T_table | null> {
    return this.adapter.table_pick(name);
  }

  /**
   * Get all tables
   */
  async table_list() {
    return this.adapter.table_list();
  }

  /**
   * Table count
   */
  async table_count(): Promise<number> {
    return this.adapter.table_count();
  }

  async table_drop(table: string) {
    return this.adapter.table_drop(table);
  }

  /**
   * Drop all tables
   */
  async table_drop_all() {
    return this.adapter.table_drop_all();
  }

  /**
   * Creating necessary tables and datum for migration.
   */
  async state_init() {
    await this.adapter.state_init();
  }

  /**
   * Run migration
   */
  async migration_run(step: number = 0) {
    return this.adapter.migration_run(step);
  }

  /**
   * Last migration id
   */
  async migration_last(): Promise<number> {
    return this.adapter.migration_last();
  }

  state_get<T = any>(key: string): Promise<T | undefined> {
    return this.adapter.state_get(key);
  }

  state_set(key: string, value: any): Promise<void> {
    return this.adapter.state_set(key, value);
  }

  state_unset(key: string): Promise<void> {
    return this.adapter.state_unset(key);
  }

  state_ensure_table(): Promise<void> {
    return this.adapter.state_ensure_table();
  }

  migration_list_all(): Promise<string[]> {
    return this.adapter.migration_list_all();
  }

  migration_list_all_ids(): Promise<number[]> {
    return this.adapter.migration_list_all_ids();
  }

  state_drop_table(): Promise<void> {
    return this.adapter.state_drop_table();
  }

  state_destroy(): Promise<void> {
    return this.adapter.state_destroy();
  }

  state_reset(): Promise<void> {
    return this.adapter.state_reset();
  }

  migration_get_files(ids: number[]): Promise<string[]> {
    return Promise.resolve([]);
  }
}

export interface T_database extends T_connection {
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
   * Get one table info
   * @param name
   */
  table_pick(name: string): Promise<T_table | null>

  /**
   * Creating necessary tables and datum for migration.
   * --> 2
   */
  migration_last(): Promise<number>

  /**
   * Run migration
   */
  migration_run(step?: number): Promise<void>

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

export interface T_table {
  name: string
  fields?: { [name: string]: T_field }
}

export interface T_field_common {
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

export interface T_field extends T_field_common {
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
   * Indicates if column value is not updated by "save" operation.
   * It means you'll be able to write this value only when you first time insert the object.
   * Default value is "false".
   *
   * @deprecated Please use the `update` option instead.  Careful, it takes
   * the opposite value to readonly.
   *
   */
  readonly?: boolean;
  /**
   * Indicates if column value is updated by "save" operation.
   * If false, you'll be able to write this value only when you first time insert the object.
   * Default value is "true".
   */
  update?: boolean;
  /**
   * Indicates if column is always selected by QueryBuilder and find operations.
   * Default value is "true".
   */
  select?: boolean;
  /**
   * Indicates if column is inserted by default.
   * Default value is "true".
   */
  insert?: boolean;
  /**
   * Default database value.
   */
  default?: any;
  /**
   * ON UPDATE trigger. Works only for MySQL.
   */
  on_update?: string;
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
   * Puts ZEROFILL attribute on to numeric column. Works only for MySQL.
   * If you specify ZEROFILL for a numeric column, MySQL automatically adds the UNSIGNED attribute to this column
   */
  zerofill?: boolean;
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
  /**
   * Return type of HSTORE column.
   * Returns value as string or as object.
   */
  hstore_type?: 'object' | 'string';
  /**
   * Indicates if this column is an array.
   * Can be simply set to true or array length can be specified.
   * Supported only by postgres.
   */
  array?: boolean;
  /**
   * Spatial Feature Type (Geometry, Point, Polygon, etc.)
   */
  spatial_feature_type?: string;
  /**
   * SRID (Spatial Reference ID (EPSG code))
   */
  srid?: number;
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