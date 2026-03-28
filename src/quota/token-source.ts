export const TOKEN_SOURCE_VALUES = ["secretStorage", "settings", "environment"] as const;

export type TokenSource = (typeof TOKEN_SOURCE_VALUES)[number];

export function isTokenSource(value: string): value is TokenSource {
  return (TOKEN_SOURCE_VALUES as readonly string[]).includes(value);
}
