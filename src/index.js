import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { prisma } from './utils/db.js';

import authRouter       from './routes/auth.js';
import roomsRouter      from './routes/rooms.js';
import guestsRouter     from './routes/guests.js';
import bookingsRouter   from './routes/bookings.js';
import paymentsRouter   from './routes/payments.js';
import enquiriesRouter  from './routes/enquiries.js';
import calendarRouter   from './routes/calendar.js';
import icalRouter       from './routes/ical.js';
import gcalRouter       from './routes/gcal.js';
import financialsRouter from './routes/financials.js';
import whatsappRouter   from './routes/whatsapp.js';
import expensesRouter   from './routes/expenses.js';
import syncRouter       from './routes/sync.js';
import dashboardRouter  from './routes/dashboard.js';
import settingsRouter   from './routes/settings.js';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'Andaman Homestay API', version: '1.0.0', db: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

app.use('/api/auth',       authRouter);
app.use('/api/ical',       icalRouter);
app.use('/api/gcal',       gcalRouter);
app.use('/api/dashboard',  authMiddleware, dashboardRouter);
app.use('/api/rooms',      authMiddleware, roomsRouter);
app.use('/api/guests',     authMiddleware, guestsRouter);
app.use('/api/bookings',   authMiddleware, bookingsRouter);
app.use('/api/payments',   authMiddleware, paymentsRouter);
app.use('/api/enquiries',  authMiddleware, enquiriesRouter);
app.use('/api/calendar',   authMiddleware, calendarRouter);
app.use('/api/financials', authMiddleware, financialsRouter);
app.use('/api/whatsapp',   authMiddleware, whatsappRouter);
app.use('/api/expenses',   authMiddleware, expensesRouter);
app.use('/api/sync',       authMiddleware, syncRouter);
app.use('/api/settings',   authMiddleware, settingsRouter);

app.use((req, res) => res.status(404).json({ error: 'Route not found: ' + req.method + ' ' + req.path }));
app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
    app.listen(PORT, () => {
      logger.info('Andaman Homestay API running on port ' + PORT);
      logger.info('Health: http://localhost:' + PORT + '/health');
    });
  } catch (err) {
    logger.error('Failed to start server: ' + err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

bootstrap();
export default app;
