/** Convert ImapFlow values to JSON while retaining UID mappings and integer precision. */
export function serializeImapValue(_key: string, value: unknown): unknown {
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export function cloneImapResultForJson(value: unknown): any {
  return JSON.parse(JSON.stringify(value, serializeImapValue));
}
