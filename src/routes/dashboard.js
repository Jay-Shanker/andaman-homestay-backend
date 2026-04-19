import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import dayjs from 'dayjs';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const today = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();
  const weekAgo = dayjs().subtract(7,'day').toDate();
  const monthStart = dayjs().startOf('month').toDate();
  const monthEnd = dayjs().endOf('month').toDate();
  const [rooms, todayCheckins, todayCheckouts, activeBookings, pendingEnquiries, todayRevenue, weekRevenue, monthRevenue, recentBookings] = await Promise.all([
    prisma.room.findMany({ orderBy: { number: 'asc' }, include: { bookings: { where: { status: { in: ['confirmed','checked_in'] }, checkIn: { lte: todayEnd }, checkOut: { gte: today } }, include: { guest: { select: { name: true } } }, take: 1 }, blocks: { where: { startDate: { lte: todayEnd }, endDate: { gte: today } }, take: 1 } } }),
    prisma.booking.findMany({ where: { status: 'confirmed', checkIn: { gte: today, lte: todayEnd } }, include: { guest: { select: { name: true, phone: true } }, room: { select: { name: true, number: true, basePrice: true } } } }),
    prisma.booking.findMany({ where: { status: 'checked_in', checkOut: { gte: today, lte: todayEnd } }, include: { guest: { select: { name: true } }, room: { select: { name: true, number: true } }, payments: true } }),
    prisma.booking.count({ where: { status: { in: ['checked_in','confirmed'] }, checkIn: { lte: todayEnd }, checkOut: { gte: today } } }),
    prisma.enquiry.count({ where: { status: { in: ['new','replied'] } } }),
    prisma.payment.aggregate({ where: { status: 'completed', paidAt: { gte: today, lte: todayEnd } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'completed', paidAt: { gte: weekAgo } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'completed', paidAt: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } }),
    prisma.booking.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { guest: { select: { name: true } }, room: { select: { name: true, number: true } } } }),
  ]);
  const roomStatus = rooms.map(room => {
    const b = room.bookings[0]; const bl = room.blocks[0];
    let status = 'available';
    if (b?.status === 'checked_in') status = 'occupied';
    else if (b?.status === 'confirmed') status = 'reserved';
    else if (bl) status = 'blocked';
    return { id: room.id, number: room.number, name: room.name, price: room.basePrice, status, guest: b?.guest?.name || null, source: b?.source || null, checkIn: b?.checkIn || null, checkOut: b?.checkOut || null };
  });
  const revenueByDay = await Promise.all(Array.from({ length: 7 }, (_, i) => {
    const d = dayjs().subtract(6 - i, 'day');
    return prisma.payment.aggregate({ where: { status: 'completed', paidAt: { gte: d.startOf('day').toDate(), lte: d.endOf('day').toDate() } }, _sum: { amount: true } }).then(r => ({ date: d.format('ddd'), amount: r._sum.amount || 0, isToday: i === 6 }));
  }));
  const channelRevenue = await prisma.booking.groupBy({ by: ['source'], where: { createdAt: { gte: monthStart, lte: monthEnd }, status: { not: 'cancelled' } }, _sum: { finalAmount: true }, _count: { id: true } });
  res.json({ today: dayjs().format('YYYY-MM-DD'), rooms: roomStatus, occupancy: { activeRooms: activeBookings, totalRooms: rooms.length, rate: Math.round((activeBookings / rooms.length) * 100) }, checkins: todayCheckins, checkouts: todayCheckouts, enquiries: { pending: pendingEnquiries }, revenue: { today: todayRevenue._sum.amount || 0, week: weekRevenue._sum.amount || 0, month: monthRevenue._sum.amount || 0 }, revenueByDay, channelRevenue: channelRevenue.map(c => ({ source: c.source, amount: c._sum.finalAmount || 0, bookings: c._count.id })), recentBookings });
}));
export default router;