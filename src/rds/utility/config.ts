import { Invalid_connection_config } from '../../error/invalid_connection_config';
import { T_config_connection, T_config_database } from '../../type';

export function connection_validate_config(config: T_config_connection) {
  if (config.uri) {

  } else {
    if ( ! config.user || ! config.host || ! config.port) {
      throw new Invalid_connection_config('Required configs: {user & host & port}');
    }
  }
}

export function database_validate_config(config: T_config_database) {
  if ( ! config.database || ! config.migration?.file_dir || ! config.state?.table_name) { throw new Invalid_connection_config('Required configs: {database & migration.file_dir & state.table_name}'); }
}
