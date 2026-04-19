import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createError } from '../utils/helpers.js';
import dayjs from 'dayjs';
const router = Router();
const TEMPLATES = {
  confirmation: (b) => "Booking Confirmed - Andaman Homestay\n\nHi " + b.guestName + "\nRef: " + b.bookingRef + "\nRoom: " + b.roomName + "\nCheck-in: " + dayjs(b.checkIn).format('D MMM YYYY') + " (after 11 AM)\nCheck-out: " + dayjs(b.checkOut).format('D MMM YYYY') + " (by 10 AM)\nNights: " + b.nights + "\nTotal: Rs." + b.finalAmount,
  enquiry_reply: (name) => "Andaman Homestay - Rates\n\nHi " + name + "\n\nOur Rooms:\nStandard (x3) - Rs.1900/night\nDeluxe (x1) - Rs.2200/night\nSea View (x1) - Rs.2500/night\n\nAll include WiFi, AC, Parking\n\nPlease share your dates to confirm!",
  directions: (name) => "How to reach Andaman Homestay\n\nHi " + name + "\n\nAddress: Port Blair, A&N Islands 744101\n\nFrom Airport (5km): Taxi ~15 mins Rs.200\nFrom Jetty (3km): Auto ~10 mins Rs.80\n\nGoogle Maps: https://maps.app.goo.gl/JS4jRpmw6QtmP3gw8",
  followup: (name) => "Thank you for staying with us!\n\nHi " + name + "\n\nIt was a pleasure hosting you at Andaman Homestay!\n\nWe would love your review on Booking.com or Airbnb.\n\nCome back soon - mention this message for 10% discount!",
};
router.get('/templates', (req, res) => { res.json({ templates: Object.keys(TEMPLATES) }); });
router.post('/preview', asyncHandler(async (req, res) => {
  const { template, bookingId, guestName } = req.body;
  if (!template || !TEMPLATES[template]) throw createError('Unknown template: ' + template, 400);
  let data = { guestName: guestName || 'Guest' };
  if (bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { guest: true, room: true } });
    if (booking) data = { guestName: booking.guest.name, bookingRef: booking.bookingRef, roomName: booking.room.name, checkIn: booking.checkIn, checkOut: booking.checkOut, nights: booking.nights, finalAmount: booking.finalAmount };
  }
  const fn = TEMPLATES[template];
  const preview = (template === 'enquiry_reply' || template === 'directions' || template === 'followup') ? fn(data.guestName) : fn(data);
  res.json({ preview });
}));
router.post('/send', asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) throw createError('phone and message required', 400);
  if (!process.env.TWILIO_ACCOUNT_SID) {
    return res.json({ sent: false, message: 'Twilio not configured. Send manually.', whatsappUrl: 'https://wa.me/' + phone.replace(/\D/g,'') + '?text=' + encodeURIComponent(message) });
  }
  const twilio = (await import('twilio')).default;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  let p = phone.replace(/\s/g,'').replace(/^0/,'');
  if (!p.startsWith('+')) p = '+91' + p.replace(/^91/,'');
  const result = await client.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: 'whatsapp:' + p, body: message });
  res.json({ sent: true, sid: result.sid });
}));
export default router;