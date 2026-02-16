import { describe, expect, it } from 'vitest';
import { decodeSharePayload, encodeSharePayload } from './payload';

describe('share payload encode/decode', () => {
  it('encodes and decodes valid payload', () => {
    const encoded = encodeSharePayload({
      name: 'hckim',
      level: 12,
      xp: 1840,
      date: '2026-02-16',
      badge: 'track_a_complete',
    });

    expect(decodeSharePayload(encoded)).toEqual({
      name: 'hckim',
      level: 12,
      xp: 1840,
      date: '2026-02-16',
      badge: 'track_a_complete',
    });
  });

  it('returns null when encoded payload is malformed', () => {
    expect(decodeSharePayload('this-is-not-base64url')).toBeNull();
  });

  it('rejects oversize payload', () => {
    expect(() =>
      encodeSharePayload({
        name: 'x'.repeat(25),
      }),
    ).toThrow();
  });
});
