import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatDate(date: string | Date | null | undefined, pattern = 'dd MMMM yyyy'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return format(d, pattern, { locale: id });
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '--:--';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return '--:--';
  return format(d, 'HH:mm');
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return format(d, 'dd MMM yyyy, HH:mm', { locale: id });
}

export function relativeDayLabel(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isToday(d)) return 'Hari ini';
  if (isYesterday(d)) return 'Kemarin';
  return formatDate(d);
}

export function todayKey(date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function greetByHour(hour = new Date().getHours()): string {
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
}

export function formatDistance(meter: number | null | undefined): string {
  if (meter == null) return '-';
  if (meter < 1000) return `${Math.round(meter)}m`;
  return `${(meter / 1000).toFixed(1)}km`;
}

export function formatCoordinates(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null) return '-';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

export function labelStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    cancelled: 'Dibatalkan',
    syncing: 'Mengirim...',
    failed: 'Gagal Kirim',
    in_progress: 'Proses',
    done: 'Selesai',
  };
  return map[status] ?? capitalize(status);
}

export function timeAgoMinutes(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

