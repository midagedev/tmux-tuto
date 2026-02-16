import { z } from 'zod';

const MAX_PAYLOAD_SIZE = 1024;

const sharePayloadSchema = z.object({
  name: z.string().trim().min(1).max(24).optional(),
  level: z.number().int().min(1).max(999).optional(),
  xp: z.number().int().min(0).max(999999).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  badge: z.string().trim().min(1).max(64).optional(),
});

export type SharePayload = z.infer<typeof sharePayloadSchema>;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encodeSharePayload(payload: SharePayload) {
  const parsed = sharePayloadSchema.parse(payload);
  const json = JSON.stringify(parsed);

  if (json.length > MAX_PAYLOAD_SIZE) {
    throw new Error('share payload too large');
  }

  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeSharePayload(encoded: string | null): SharePayload | null {
  if (!encoded) {
    return null;
  }

  if (encoded.length > MAX_PAYLOAD_SIZE * 2) {
    return null;
  }

  try {
    const bytes = base64UrlToBytes(encoded);
    const raw = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(raw);
    return sharePayloadSchema.parse(parsed);
  } catch {
    return null;
  }
}
