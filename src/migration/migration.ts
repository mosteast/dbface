import { Database } from '../connection/database'
import { Invalid_connection_config } from '../error/invalid_connection_config'
import { list_child_dirs } from '../util/path'

export class Migration {
  constructor(public con: Database) {}

  async run(step: number) {
    const c = this.con
    const cm = c.get_config().migration
    await c.table_ensure_migration()
    const dir = cm.file_dir
    if ( ! dir) { throw new Invalid_connection_config(`Invalid migration files path: "${dir}"`) }

    const rdb = await c.query(`select * from ${cm.table_name}`)
    const rfile = list_child_dirs(cm.file_dir)
    console.log(rdb, rfile)
  }
}
