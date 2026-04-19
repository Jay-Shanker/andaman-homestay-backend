import { logger } from '../utils/logger.js';
export function errorHandler(err, req, res, next) {
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  if (err.code === 'P2002') return res.status(409).json({ error: 'Record already exists' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);