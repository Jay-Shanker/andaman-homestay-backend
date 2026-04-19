import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import dayjs from 'dayjs';

const router = Router();

router.get('/:token', asyncHandler(async (req, res) => {
  const feed = await prisma.iCalFeed.findUnique({ where: { token: req.params.token } });
  if (!feed) return res.status(404).send('Feed not found');

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { roomId: feed.roomId, status: { notIn: ['cancelled','no_show'] }, checkOut: { gte: dayjs().subtract(30,'day').toDate() } },
      include: { guest: { select: { name: true } } },
    }),
    prisma.calendarBlock.findMany({ where: { roomId: feed.roomId, endDate: { gte: new Date() } } }),
  ]);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Andaman Homestay//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const b of bookings) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:booking-' + b.id + '@andamanhomestay');
    lines.push('DTSTART;VALUE=DATE:' + dayjs(b.checkIn).format('YYYYMMDD'));
    lines.push('DTEND;VALUE=DATE:' + dayjs(b.checkOut).format('YYYYMMDD'));
    lines.push('SUMMARY:BLOCKED - ' + b.guest.name);
    lines.push('DESCRIPTION:Ref: ' + b.bookingRef);
    lines.push('END:VEVENT');
  }

  for (const bl of blocks) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:block-' + bl.id + '@andamanhomestay');
    lines.push('DTSTART;VALUE=DATE:' + dayjs(bl.startDate).format('YYYYMMDD'));
    lines.push('DTEND;VALUE=DATE:' + dayjs(bl.endDate).format('YYYYMMDD'));
    lines.push('SUMMARY:BLOCKED - ' + bl.reason);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.send(lines.join('\r\n'));
}));

export default router;
