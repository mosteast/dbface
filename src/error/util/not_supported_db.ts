import { Invalid_argument } from '../invalid_argument'

export function not_supported_db(type: string) {
  throw new Invalid_argument(`We currently not support database type: "${type}"`)
}
