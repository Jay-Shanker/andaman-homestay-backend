import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError, generateICalToken } from '../utils/helpers.js';
const router = Router();
router.get('/feeds', asyncHandler(async (req, res) => {
  const feeds = await prisma.iCalFeed.findMany({ include: { room: { select: { number: true, name: true } } } });
  const rooms = await prisma.room.findMany({ orderBy: { number: 'asc' } });
  const base = process.env.ICAL_BASE_URL || 'http://localhost:3000/api/ical';
  const exportFeeds = await Promise.all(rooms.map(async room => {
    let feed = await prisma.iCalFeed.findFirst({ where: { roomId: room.id, direction: 'export', channel: 'export' } });
    if (!feed) feed = await prisma.iCalFeed.create({ data: { roomId: room.id, channel: 'export', direction: 'export', token: generateICalToken() } });
    return { roomId: room.id, roomNumber: room.number, roomName: room.name, url: base + '/' + feed.token };
  }));
  res.json({ feeds, exportFeeds });
}));
router.post('/feeds', asyncHandler(async (req, res) => {
  const { roomId, channel, url } = req.body;
  if (!roomId || !channel || !url) throw createError('roomId, channel, url required', 400);
  const token = ('import-' + channel + '-' + roomId).slice(0, 60);
  res.json(await prisma.iCalFeed.upsert({ where: { token }, create: { roomId, channel, direction: 'import', url, token }, update: { url } }));
}));
router.get('/logs', asyncHandler(async (req, res) => {
  res.json({ logs: await prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: parseInt(req.query.limit) || 50 }) });
}));
router.post('/ical', asyncHandler(async (req, res) => {
  const feeds = await prisma.iCalFeed.findMany({ where: { direction: 'import' } });
  res.json({ message: 'Triggered sync for ' + feeds.length + ' feeds' });
}));
export default router;