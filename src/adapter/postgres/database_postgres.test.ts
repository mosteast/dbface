import { N_db_type } from '../../connection/connection';
import { Connection_postgres } from './connection_postgres';
import { Database_postgres, T_config_database_postgres } from './database_postgres';

const e = process.env;

const conf: T_config_database_postgres = {
  database: e.postgres_database,
  dialect: N_db_type.postgres,
  host: e.postgres_host,
  port: +e.postgres_port,
  user: e.postgres_user,
  password: e.postgres_password,
  log: { log_params: true },
};

let con: Connection_postgres;
let db: Database_postgres;

beforeEach(async () => {
  con = new Connection_postgres();
  con.set_config(conf);
  await con.connect();
  await con.databases_ensure('a');
});

it('table_create', async () => {

});