import { N_db_type } from '../../connection/connection';
import { Connection_mysql, T_config_connection_mysql } from './connection_mysql';

const e = process.env;

const conf: T_config_connection_mysql = {
  type: N_db_type.mysql,
  host: e.mysql_host,
  username: 'root',
  password: e.mysql_password,
};

it('database_list', async () => {
  const con = new Connection_mysql();
  con.set_config(conf);
  await con.connect();
  await con.query('show databases');
});