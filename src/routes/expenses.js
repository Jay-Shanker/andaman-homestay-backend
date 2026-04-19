import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.from || req.query.to) { where.date = {}; if (req.query.from) where.date.gte = new Date(req.query.from); if (req.query.to) where.date.lte = new Date(req.query.to); }
  if (req.query.category) where.category = req.query.category;
  const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
  res.json({ expenses, total: expenses.reduce((s, e) => s + e.amount, 0) });
}));
router.post('/', asyncHandler(async (req, res) => {
  const { category, description, amount, date, roomId, notes } = req.body;
  if (!category || !description || !amount) throw createError('category, description, amount required', 400);
  res.status(201).json(await prisma.expense.create({ data: { category, description, amount: parseInt(amount), date: date ? new Date(date) : new Date(), roomId, notes } }));
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}));
export default router;