import { readdirSync } from 'fs'

export function list_child_dirs(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).filter(it => it.isDirectory()).map(it => it.name)
}
