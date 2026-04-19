import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
const router = Router();
router.get('/availability', asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date();
  const to   = req.query.to   ? new Date(req.query.to)   : new Date(Date.now() + 30 * 86400000);
  const rooms = await prisma.room.findMany({ where: req.query.roomId ? { id: req.query.roomId } : {}, orderBy: { number: 'asc' } });
  const result = await Promise.all(rooms.map(async room => {
    const [bookings, blocks] = await Promise.all([
      prisma.booking.findMany({ where: { roomId: room.id, status: { notIn: ['cancelled','no_show'] }, AND: [{ checkIn: { lt: to } }, { checkOut: { gt: from } }] }, select: { id: true, bookingRef: true, checkIn: true, checkOut: true, status: true, source: true, guest: { select: { name: true } } } }),
      prisma.calendarBlock.findMany({ where: { roomId: room.id, AND: [{ startDate: { lt: to } }, { endDate: { gt: from } }] } }),
    ]);
    return { room: { id: room.id, number: room.number, name: room.name, price: room.basePrice }, bookings, blocks };
  }));
  res.json({ from, to, rooms: result });
}));
router.post('/block', asyncHandler(async (req, res) => {
  const { roomId, startDate, endDate, reason, notes } = req.body;
  if (!roomId || !startDate || !endDate || !reason) throw createError('roomId, startDate, endDate, reason required', 400);
  const conflict = await prisma.booking.findFirst({ where: { roomId, status: { notIn: ['cancelled','no_show'] }, AND: [{ checkIn: { lt: new Date(endDate) } }, { checkOut: { gt: new Date(startDate) } }] }, include: { guest: { select: { name: true } } } });
  if (conflict) return res.status(409).json({ error: 'Conflicts with booking ' + conflict.bookingRef });
  res.status(201).json(await prisma.calendarBlock.create({ data: { roomId, reason, notes, startDate: new Date(startDate), endDate: new Date(endDate), syncedTo: '[]' }, include: { room: true } }));
}));
router.get('/blocks', asyncHandler(async (req, res) => {
  res.json(await prisma.calendarBlock.findMany({ where: { endDate: { gte: new Date() } }, include: { room: { select: { number: true, name: true } } }, orderBy: { startDate: 'asc' } }));
}));
router.delete('/block/:id', asyncHandler(async (req, res) => {
  await prisma.calendarBlock.delete({ where: { id: req.params.id } });
  res.json({ message: 'Block removed' });
}));
export default router;