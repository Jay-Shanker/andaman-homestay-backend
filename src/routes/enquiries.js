import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const where = req.query.status ? { status: req.query.status } : {};
  res.json(await prisma.enquiry.findMany({ where, orderBy: { createdAt: 'desc' } }));
}));
router.post('/', asyncHandler(async (req, res) => {
  const { name, phone, email, source, roomPref, checkIn, checkOut, guests: g, message } = req.body;
  if (!name) throw createError('name is required', 400);
  res.status(201).json(await prisma.enquiry.create({ data: { name, phone, email, source: source || 'direct', roomPref, message, checkIn: checkIn ? new Date(checkIn) : null, checkOut: checkOut ? new Date(checkOut) : null, guests: g ? parseInt(g) : null } }));
}));
router.patch('/:id', asyncHandler(async (req, res) => {
  const { status, convertedTo, message } = req.body;
  res.json(await prisma.enquiry.update({ where: { id: req.params.id }, data: { status, convertedTo, message } }));
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.enquiry.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));
export default router;