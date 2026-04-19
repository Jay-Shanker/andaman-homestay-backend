import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('andaman@2026', 12);
  await prisma.user.upsert({
    where:  { email: 'owner@andamanhomestay.com' },
    update: {},
    create: { name: 'Homestay Owner', email: 'owner@andamanhomestay.com', passwordHash, role: 'owner' },
  });
  console.log('Owner created');

  const roomDefs = [
    { number: 1, name: 'Room 1',          type: 'standard', basePrice: 1900, description: 'Standard room', amenities: '["WiFi","AC","Attached Bath","TV","Parking"]' },
    { number: 2, name: 'Room 2',          type: 'standard', basePrice: 1900, description: 'Standard room', amenities: '["WiFi","AC","Attached Bath","TV","Parking"]' },
    { number: 3, name: 'Room 3',          type: 'standard', basePrice: 1900, description: 'Standard room', amenities: '["WiFi","AC","Attached Bath","TV","Parking"]' },
    { number: 4, name: 'Room 4 Deluxe',   type: 'deluxe',   basePrice: 2200, description: 'Deluxe room',   amenities: '["WiFi","AC","Minibar","Balcony","Parking"]' },
    { number: 5, name: 'Room 5 Sea View', type: 'seaview',  basePrice: 2500, description: 'Sea view room', amenities: '["WiFi","AC","Smart TV","Balcony","Sea View"]' },
  ];

  const rooms = [];
  for (const rd of roomDefs) {
    const room = await prisma.room.upsert({
      where:  { number: rd.number },
      update: { basePrice: rd.basePrice },
      create: { ...rd, photos: '[]' },
    });
    rooms.push(room);
    console.log('Room ' + room.number + ' done');
  }

  const guestDefs = [
    { name: 'Rahul Sharma',  phone: '+919876543210', source: 'walk-in',     tags: '["vip","repeat"]' },
    { name: 'Priya Mehta',   phone: '+919765432109', source: 'airbnb',      tags: '["repeat"]' },
    { name: 'Anjali Kapoor', phone: '+919654321098', source: 'booking.com', tags: '[]' },
    { name: 'Vikram Nair',   phone: '+919432109876', source: 'airbnb',      tags: '["repeat"]' },
    { name: 'Meera Iyer',    phone: '+919321098765', source: 'mmt',         tags: '["vip","repeat"]' },
  ];

  const guests = [];
  for (const gd of guestDefs) {
    let guest = await prisma.guest.findFirst({ where: { phone: gd.phone } });
    if (!guest) guest = await prisma.guest.create({ data: gd });
    guests.push(guest);
  }
  console.log(guests.length + ' guests done');

  const today = new Date();
  const d = (n) => new Date(today.getTime() + n * 86400000);

  const bookingDefs = [
    { room: 0, guest: 0, ci: d(-3), co: d(1),  source: 'walk-in',     status: 'checked_in',  amount: 7600 },
    { room: 1, guest: 1, ci: d(-2), co: d(2),  source: 'airbnb',      status: 'checked_in',  amount: 7600 },
    { room: 3, guest: 2, ci: d(-1), co: d(4),  source: 'booking.com', status: 'checked_in',  amount: 11000 },
    { room: 4, guest: 3, ci: d(0),  co: d(2),  source: 'booking.com', status: 'confirmed',   amount: 5000 },
    { room: 2, guest: 4, ci: d(0),  co: d(3),  source: 'airbnb',      status: 'confirmed',   amount: 5700 },
    { room: 0, guest: 0, ci: d(-10),co: d(-7), source: 'walk-in',     status: 'checked_out', amount: 5700 },
  ];

  let count = 0;
  for (const bd of bookingDefs) {
    const nights = Math.max(1, Math.round((bd.co - bd.ci) / 86400000));
    const ref = 'AH-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');
    try {
      const booking = await prisma.booking.create({
        data: {
          bookingRef: ref, roomId: rooms[bd.room].id, guestId: guests[bd.guest].id,
          checkIn: bd.ci, checkOut: bd.co, nights, adults: 2,
          ratePerNight: rooms[bd.room].basePrice,
          totalAmount: bd.amount, discount: 0, finalAmount: bd.amount,
          source: bd.source, status: bd.status,
          paymentStatus: bd.status === 'checked_out' ? 'paid' : bd.status === 'checked_in' ? 'partial' : 'pending',
          checkedInAt:  bd.status !== 'confirmed'   ? bd.ci : null,
          checkedOutAt: bd.status === 'checked_out' ? bd.co : null,
        },
      });
      if (bd.status === 'checked_out') {
        await prisma.payment.create({
          data: { bookingId: booking.id, amount: bd.amount, mode: 'upi', status: 'completed', paidAt: bd.co },
        });
      }
      count++;
    } catch (e) { console.log('Skipped: ' + ref); }
  }
  console.log(count + ' bookings done');

  const enquiries = [
    { name: 'Deepak Verma',   phone: '+919876500001', source: 'whatsapp', message: 'Need 2 rooms for family trip', status: 'new' },
    { name: 'Ravi Kumar',     phone: '+919876500002', source: 'phone',    message: 'Sea view room available?',     status: 'new' },
    { name: 'Prashant Joshi', email: 'p@example.com', source: 'email',    message: 'Share pricing for Apr',        status: 'replied' },
  ];
  for (const eq of enquiries) {
    await prisma.enquiry.create({ data: eq });
  }
  console.log('3 enquiries done');

  const settingsList = [
    { key: 'property_name',    value: 'Andaman Homestay' },
    { key: 'property_address', value: 'Port Blair, Andaman & Nicobar Islands 744101' },
    { key: 'property_phone',   value: '+91 XXXXX XXXXX' },
    { key: 'checkin_time',     value: '11:00' },
    { key: 'checkout_time',    value: '10:00' },
    { key: 'wifi_name',        value: 'AndamanHS_Guest' },
    { key: 'wifi_password',    value: 'beach2024' },
    { key: 'upi_id',           value: 'andamanhomestay@okaxis' },
    { key: 'maps_url',         value: 'https://maps.app.goo.gl/JS4jRpmw6QtmP3gw8' },
    { key: 'gcal_conflicts',   value: '[]' },
  ];
  for (const s of settingsList) {
    await prisma.setting.upsert({ where: { key: s.key }, create: s, update: {} });
  }
  console.log('Settings done');
  console.log('SEED COMPLETE');
  console.log('Login: owner@andamanhomestay.com / andaman@2026');
}

main().catch(console.error).finally(() => prisma.$disconnect());
