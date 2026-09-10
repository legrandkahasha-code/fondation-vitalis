/** Aligné sur backend/src/common/utils/whatsapp.util.ts */
export const DEFAULT_WHATSAPP_MESSAGE =
  'Bonjour Vitalis Center EUP, je souhaite obtenir des informations sur vos formations professionnelles certifiées.';

const PLACEHOLDER_DIGITS = new Set(['243810000000', '243000000000']);

export function normalizeWhatsappDigits(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  let digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (!digits) return null;

  if (digits.startsWith('0')) {
    digits = `243${digits.slice(1)}`;
  } else if (digits.length === 9) {
    digits = `243${digits}`;
  }

  if (digits.length < 11 || digits.length > 15) return null;
  if (digits.startsWith('243') && digits.length !== 12) return null;
  if (PLACEHOLDER_DIGITS.has(digits)) return null;
  if (/0{6,}/.test(digits)) return null;

  return digits;
}

export function toWhatsappE164(raw: string | null | undefined): string | null {
  const digits = normalizeWhatsappDigits(raw);
  return digits ? `+${digits}` : null;
}

export function buildWhatsappUrl(
  raw: string | null | undefined,
  message?: string | null,
): string | null {
  const digits = normalizeWhatsappDigits(raw);
  if (!digits) return null;
  const text = (message && String(message).trim()) || DEFAULT_WHATSAPP_MESSAGE;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
