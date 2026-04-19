import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import dayjs from 'dayjs';
const router = Router();
router.get('/summary', asyncHandler(async (req, res) => {
  const period = req.query.period || 'month';
  const now = dayjs();
  let from, to;
  if (period === 'today') { from = now.startOf('day'); to = now.endOf('day'); }
  else if (period === 'week') { from = now.startOf('week'); to = now.endOf('week'); }
  else if (period === 'year') { from = now.startOf('year'); to = now.endOf('year'); }
  else { from = now.startOf('month'); to = now.endOf('month'); }
  const [revenue, expenses, bookingCount, channelBreakdown] = await Promise.all([
    prisma.payment.aggregate({ where: { status: 'completed', paidAt: { gte: from.toDate(), lte: to.toDate() } }, _sum: { amount: true }, _count: { id: true } }),
    prisma.expense.aggregate({ where: { date: { gte: from.toDate(), lte: to.toDate() } }, _sum: { amount: true } }),
    prisma.booking.count({ where: { status: { notIn: ['cancelled','no_show'] }, createdAt: { gte: from.toDate(), lte: to.toDate() } } }),
    prisma.booking.groupBy({ by: ['source'], where: { status: { notIn: ['cancelled','no_show'] }, createdAt: { gte: from.toDate(), lte: to.toDate() } }, _sum: { finalAmount: true }, _count: { id: true } }),
  ]);
  const totalRevenue = revenue._sum.amount || 0;
  const totalExpenses = expenses._sum.amount || 0;
  res.json({ period, from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD'), revenue: totalRevenue, expenses: totalExpenses, profit: totalRevenue - totalExpenses, bookings: bookingCount, avgBookingValue: bookingCount ? Math.round(totalRevenue / bookingCount) : 0, byChannel: channelBreakdown });
}));
router.get('/transactions', asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, from, to, mode } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { status: 'completed' };
  if (from || to) { where.paidAt = {}; if (from) where.paidAt.gte = new Date(from); if (to) where.paidAt.lte = new Date(to); }
  if (mode) where.mode = mode;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({ where, skip, take: parseInt(limit), orderBy: { paidAt: 'desc' }, include: { booking: { include: { guest: { select: { name: true } }, room: { select: { name: true, number: true } } } } } }),
    prisma.payment.count({ where }),
  ]);
  res.json({ payments, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
}));
export default router;