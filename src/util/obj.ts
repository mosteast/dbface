/**
 * fn({a: 1, B: 2}, {B: 'b'}) ==> {a: 1, b: 2}
 * @param obj
 * @param replace
 */
export function key_replacer(obj: object, replace: object) {
  for (const key in obj) {
    const new_key = replace[key]
    if (new_key !== undefined && new_key !== null) {
      obj[new_key] = obj[key]
      delete obj[key]
    }
  }
}
