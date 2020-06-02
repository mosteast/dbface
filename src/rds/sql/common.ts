export type T_identifier = string | [ string, string ]

export function identifier_builder({ quote }: { quote: string }): { (v: T_identifier): string } {
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