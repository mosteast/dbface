import { keys } from 'lodash'
import { Invalid_argument } from '../invalid_argument'

export function require_all(args: object) {
  const lack = []

  for (const key in args) {
    const value = args[key]
    if (value === undefined) {
      lack.push(key)
    }
  }

  if (lack.length) {
    throw new Invalid_argument(`Required: {${lack.join('&')}}`)
  }
}

export function require_any(args: object) {
  let valid = false

  for (const key in args) {
    const value = args[key]
    if (value !== undefined) {
      valid = true
      break
    }
  }

  if ( ! valid) {
    throw new Invalid_argument(`Required: {${keys(args).join('|')}}`)
  }
}
