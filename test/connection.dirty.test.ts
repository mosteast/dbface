import { Connection, N_db_type, T_config_connection } from '../src/rds/connection';

it('can connect database', async () => {
  const conf: T_config_connection = {
    dialect: N_db_type.mysql,
    user: 'root',
    password: process.env.mysql_password,
  };
  const c = new Connection(conf);

});