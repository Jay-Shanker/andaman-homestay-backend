import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
const router = Router();
router.get('/booking/:bookingId', asyncHandler(async (req, res) => {
  res.json(await prisma.payment.findMany({ where: { bookingId: req.params.bookingId }, orderBy: { paidAt: 'desc' } }));
}));
router.post('/', asyncHandler(async (req, res) => {
  const { bookingId, amount, mode, reference, notes } = req.body;
  if (!bookingId || !amount || !mode) throw createError('bookingId, amount, mode required', 400);
  const payment = await prisma.payment.create({ data: { bookingId, amount: parseInt(amount), mode, reference, notes, status: 'completed' } });
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { payments: true } });
  const totalPaid = booking.payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) + parseInt(amount);
  const paymentStatus = totalPaid >= booking.finalAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
  await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus } });
  res.status(201).json(payment);
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.payment.delete({ where: { id: req.params.id } });
  res.json({ message: 'Payment deleted' });
}));
export default router;