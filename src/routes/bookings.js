import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateBookingRef, computeNights, parseDate, paginate, createError } from '../utils/helpers.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, source, roomId, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {};
  if (status) where.status = status;
  if (source) where.source = source;
  if (roomId) where.roomId = roomId;
  if (search) where.OR = [{ bookingRef: { contains: search } }, { guest: { name: { contains: search } } }];
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, include: { room: { select: { id: true, number: true, name: true, basePrice: true } }, guest: { select: { id: true, name: true, phone: true, email: true } }, payments: { select: { id: true, amount: true, mode: true, status: true, paidAt: true } } }, orderBy: { checkIn: 'desc' }, skip, take: parseInt(limit) }),
    prisma.booking.count({ where }),
  ]);
  res.json({ bookings, pagination: paginate(total, parseInt(page), parseInt(limit)) });
}));
router.get('/:id', asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { room: true, guest: true, payments: true } });
  if (!booking) throw createError('Booking not found', 404);
  res.json(booking);
}));
router.post('/', asyncHandler(async (req, res) => {
  const { roomId, guestId, guestName, guestPhone, guestEmail, checkIn: ci, checkOut: co, source, adults = 1, children = 0, specialRequests, internalNotes, externalId, discount = 0, overridePrice } = req.body;
  if (!roomId || !ci || !co || !source) return res.status(400).json({ error: 'roomId, checkIn, checkOut, source required' });
  const checkIn = parseDate(ci); const checkOut = parseDate(co);
  if (checkOut <= checkIn) return res.status(400).json({ error: 'Check-out must be after check-in' });
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw createError('Room not found', 404);
  const conflict = await prisma.booking.findFirst({ where: { roomId, status: { notIn: ['cancelled','no_show'] }, AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }] }, include: { guest: { select: { name: true } } } });
  if (conflict) return res.status(409).json({ error: 'Room not available', conflict: { bookingRef: conflict.bookingRef, guest: conflict.guest.name } });
  const block = await prisma.calendarBlock.findFirst({ where: { roomId, AND: [{ startDate: { lt: checkOut } }, { endDate: { gt: checkIn } }] } });
  if (block) return res.status(409).json({ error: 'Room is blocked: ' + block.reason });
  let resolvedGuestId = guestId;
  if (!resolvedGuestId) {
    if (!guestName) return res.status(400).json({ error: 'guestId or guestName required' });
    let guest = guestPhone ? await prisma.guest.findFirst({ where: { phone: guestPhone } }) : null;
    if (!guest) guest = await prisma.guest.create({ data: { name: guestName, phone: guestPhone, email: guestEmail, source } });
    resolvedGuestId = guest.id;
  }
  const nights = computeNights(checkIn, checkOut);
  const ratePerNight = overridePrice ?? room.basePrice;
  const totalAmount = ratePerNight * nights;
  const finalAmount = Math.max(0, totalAmount - parseInt(discount));
  const bookingRef = await generateBookingRef(prisma);
  const booking = await prisma.booking.create({ data: { bookingRef, roomId, guestId: resolvedGuestId, checkIn, checkOut, nights, adults: parseInt(adults), children: parseInt(children), ratePerNight, totalAmount, discount: parseInt(discount), finalAmount, source, externalId, specialRequests, internalNotes, status: 'confirmed', paymentStatus: 'pending' }, include: { room: true, guest: true } });
  res.status(201).json(booking);
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!existing) throw createError('Booking not found', 404);
  const allowed = ['status','paymentStatus','specialRequests','internalNotes','adults','children','discount'];
  const data = {};
  for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];
  if (data.status === 'checked_in')  data.checkedInAt  = new Date();
  if (data.status === 'checked_out') data.checkedOutAt = new Date();
  if (data.status === 'cancelled')   { data.cancelledAt = new Date(); data.cancelReason = req.body.cancelReason; }
  res.json(await prisma.booking.update({ where: { id: req.params.id }, data, include: { room: true, guest: true } }));
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw createError('Booking not found', 404);
  if (booking.status === 'checked_in') return res.status(400).json({ error: 'Cannot cancel checked-in booking' });
  await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body?.reason } });
  res.json({ message: 'Booking cancelled' });
}));
export default router;