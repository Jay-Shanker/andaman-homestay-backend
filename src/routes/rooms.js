import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const rooms = await prisma.room.findMany({ orderBy: { number: 'asc' } });
  res.json(rooms);
}));
router.get('/:id', asyncHandler(async (req, res) => {
  const room = await prisma.room.findUnique({ where: { id: req.params.id } });
  if (!room) throw createError('Room not found', 404);
  res.json(room);
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['name','basePrice','description','amenities','photos','isActive','maxGuests'];
  const data = {};
  for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
  res.json(await prisma.room.update({ where: { id: req.params.id }, data }));
}));
export default router;