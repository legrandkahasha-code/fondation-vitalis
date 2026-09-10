import {
  buildWhatsappUrl,
  DEFAULT_WHATSAPP_MESSAGE,
  normalizeWhatsappDigits,
  toWhatsappE164,
} from './whatsapp.util';

describe('whatsapp.util', () => {
  describe('normalizeWhatsappDigits', () => {
    it.each([
      ['+243 843 010 337', '243843010337'],
      ['243843010337', '243843010337'],
      ['00 243 843 010 337', '243843010337'],
      ['0843 010 337', '243843010337'],
      ['0943 010 337', '243943010337'],
      ['843010337', '243843010337'],
      ['(243) 843-010-337', '243843010337'],
    ])('normalise %s', (input, expected) => {
      expect(normalizeWhatsappDigits(input)).toBe(expected);
    });

    it.each([
      [null],
      [undefined],
      [''],
      ['   '],
      ['+243 ...'],
      ['081234567'],
      ['+243 81 000 0000'],
      ['000000000'],
    ])('rejette %s', (input) => {
      expect(normalizeWhatsappDigits(input as string)).toBeNull();
    });
  });

  it('toWhatsappE164 ajoute le préfixe +', () => {
    expect(toWhatsappE164('0843 010 337')).toBe('+243843010337');
  });

  it('buildWhatsappUrl encode le message', () => {
    const url = buildWhatsappUrl('+243 843 010 337', 'Bonjour Vitalis');
    expect(url).toBe(
      `https://wa.me/243843010337?text=${encodeURIComponent('Bonjour Vitalis')}`,
    );
  });

  it('buildWhatsappUrl utilise le message par défaut', () => {
    const url = buildWhatsappUrl('843010337', '');
    expect(url).toContain(encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE));
  });

  it('buildWhatsappUrl retourne null si le numéro est invalide', () => {
    expect(buildWhatsappUrl('+243 81 000 0000')).toBeNull();
  });
});
