import { Database } from '../connection/database'
import { list_child_dirs } from '../util/path'

export class Migration {
  constructor(public con: Database) {}

  async run(step: number) {
    const c = this.con
    const cm = c.get_config().migration
    await c.table_ensure_migration()

    const rdb = await c.query(`select * from ${cm.table_name}`)
    console.log(cm.file_dir)
    const rfile = list_child_dirs(cm.file_dir)
    console.log(rdb, rfile)
  }
}
