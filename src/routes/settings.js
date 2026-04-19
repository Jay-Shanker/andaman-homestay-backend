import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const settings = await prisma.setting.findMany();
  res.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
}));
router.put('/:key', asyncHandler(async (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: 'value is required' });
  res.json(await prisma.setting.upsert({ where: { key: req.params.key }, create: { key: req.params.key, value }, update: { value } }));
}));
router.delete('/:key', asyncHandler(async (req, res) => {
  await prisma.setting.delete({ where: { key: req.params.key } });
  res.json({ message: 'Deleted' });
}));
export default router;