/*
 |--------------------------------------------------------------------------
 | Transform sql holes (like identifier or values)
 |--------------------------------------------------------------------------
 */

export type T_identifier = string | [ string, string ]
export type T_value = any

/**
 * Build identifier transformer
 * @param quote
 */
export function fn_builder_identifier({ quote }: { quote: string }): { (v: T_identifier): string } {
  return function identifier(v: T_identifier): string {
    switch (typeof v) {
      case 'string':
        return `${quote}${v}${quote}`;
        break;
      default:
        return `${identifier(v[0])} as ${identifier(v[1])}`;
    }
  };
}

/**
 * Build value transformer
 * @param quote
 */
export function fn_builder_value({ quote }: { quote: string }): { (v: T_value): string } {
  return function (v: T_value) {
    switch (typeof v) {
      case 'string':
        return quote + v + quote;
        break;
      case 'number':
        return v.toString();
      default:
        return quote + v + JSON.stringify(v);
    }
  };
}
