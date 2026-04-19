import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
export const prisma = new PrismaClient({
  log: [{ level: 'warn', emit: 'event' }, { level: 'error', emit: 'event' }],
});
prisma.$on('warn',  (e) => logger.warn('[Prisma] ' + e.message));
prisma.$on('error', (e) => logger.error('[Prisma] ' + e.message));