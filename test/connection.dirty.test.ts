import { Connection, N_db_type, T_config_connection } from '../src/connection/connection';

it('can connect database', async () => {
  const conf: T_config_connection = {
    type: N_db_type.mysql,
    username: 'root',
    password: process.env.mysql_password,
  };
  const c = new Connection(conf);

});