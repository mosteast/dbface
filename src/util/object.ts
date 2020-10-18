/**
 * fn({a: 1, B: 2}, {B: 'b'}) ==> {a: 1, b: 2}
 * @param obj
 * @param replace
 */
export function key_replace<T = any>(obj: any, replace: { [key: string]: keyof T }): T {
  for (const key in obj) {
    const new_key = replace[key];
    if (new_key !== undefined && new_key !== null) {
      obj[new_key] = obj[key];
      delete obj[key];
    }
  }

  return obj;
}
