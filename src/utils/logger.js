import { createLogger, format, transports } from 'winston';
import { existsSync, mkdirSync } from 'fs';
const logDir = 'logs';
if (!existsSync(logDir)) mkdirSync(logDir);
const { combine, timestamp, printf, colorize, errors } = format;
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return timestamp + ' [' + level.toUpperCase() + '] ' + (stack || message);
});
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    new transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }),
    new transports.File({ filename: 'logs/app.log', maxsize: 10485760, maxFiles: 5 }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});