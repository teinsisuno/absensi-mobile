export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPin(pin: string, min = 4, max = 6): boolean {
  return /^\d+$/.test(pin) && pin.length >= min && pin.length <= max;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(slug.trim());
}

/**
 * Normalisasi input tenant → base URL API.
 * - Slug polos (contoh: "tokoa") → https://tokoa-absensi.megakomsel.com/api/v1
 * - URL lengkap / host lokal (contoh: "http://sigit-absensi.test:8000" atau
 *   "sigit-absensi.test:8000/api/v1") → dipakai apa adanya, otomatis
 *   ditambahkan "/api/v1" kalau belum ada.
 * Returns { url: '' } kalau input tidak valid.
 */
export function normalizeTenantUrl(input: string): { url: string; isSlug: boolean } {
  const raw = input.trim().toLowerCase();
  if (!raw) return { url: '', isSlug: false };

  const looksLikeUrl =
    raw.includes('://') ||
    raw.includes('.') ||
    raw.includes(':') ||
    raw.startsWith('localhost');

  if (!looksLikeUrl && isValidSlug(raw)) {
    return { url: `https://${raw}-absensi.megakomsel.com/api/v1`, isSlug: true };
  }

  // Treat sebagai URL — tambah protocol kalau belum ada
  let base = raw.includes('://') ? raw : `http://${raw}`;
  base = base.replace(/\/+$/, '');
  if (!/\/api\/v1$/.test(base)) {
    base = `${base}/api/v1`;
  }
  return { url: base, isSlug: false };
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

export function isFutureOrToday(date: string): boolean {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now;
}

export function isDateRangeValid(start: string, end: string): boolean {
  if (!start || !end) return false;
  return new Date(end) >= new Date(start);
}

