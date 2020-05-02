import { ls } from 'shelljs'
import { Connection } from '../connection/connection'
import { list_child_dirs } from '../util/path'

export class Migration {
  constructor(public con: Connection) {}

  async run(step: number) {
    const c = this.con
    const cm = c.get_config().migration
    const rdb = await c.query(`select * from ${cm.table_name}`)
    const rfile = list_child_dirs(cm.file_dir)
    console.log(rdb, rfile)
  }
}
