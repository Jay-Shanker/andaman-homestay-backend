import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const { search } = req.query;
  const where = {};
  if (search) where.OR = [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }];
  const guests = await prisma.guest.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { bookings: true } }, bookings: { orderBy: { checkOut: 'desc' }, take: 1, select: { checkOut: true, finalAmount: true, source: true } } } });
  res.json(guests.map(g => ({ ...g, stayCount: g._count.bookings, lastStay: g.bookings[0]?.checkOut, lastSource: g.bookings[0]?.source })));
}));
router.get('/:id', asyncHandler(async (req, res) => {
  const guest = await prisma.guest.findUnique({ where: { id: req.params.id }, include: { bookings: { include: { room: true, payments: true }, orderBy: { checkIn: 'desc' } } } });
  if (!guest) throw createError('Guest not found', 404);
  res.json(guest);
}));
router.post('/', asyncHandler(async (req, res) => {
  const { name, phone, email, nationality, idType, idNumber, notes, tags, source } = req.body;
  if (!name) throw createError('name is required', 400);
  res.status(201).json(await prisma.guest.create({ data: { name, phone, email, nationality, idType, idNumber, notes, tags: JSON.stringify(tags || []), source } }));
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name','phone','email','nationality','idType','idNumber','notes','tags','source'];
  const data = {};
  for (const k of allowed) if (req.body[k] !== undefined) data[k] = k === 'tags' ? JSON.stringify(req.body[k]) : req.body[k];
  res.json(await prisma.guest.update({ where: { id: req.params.id }, data }));
}));
export default router;