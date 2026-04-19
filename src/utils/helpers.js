import dayjs from 'dayjs';
export async function generateBookingRef(prisma) {
  const year = new Date().getFullYear();
  const count = await prisma.booking.count({ where: { bookingRef: { startsWith: 'AH-' + year + '-' } } });
  return 'AH-' + year + '-' + String(count + 1).padStart(4, '0');
}
export function generateICalToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
export function parseDate(str) { return dayjs(str).startOf('day').toDate(); }
export function computeNights(checkIn, checkOut) { return Math.max(0, dayjs(checkOut).diff(dayjs(checkIn), 'day')); }
export function safeJSON(str, fallback = []) { try { return JSON.parse(str); } catch { return fallback; } }
export function paginate(total, page, limit) {
  return { total, page, limit, pages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 };
}
export function createError(message, status = 400) { const err = new Error(message); err.status = status; return err; }