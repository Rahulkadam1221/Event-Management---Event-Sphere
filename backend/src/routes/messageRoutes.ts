import { Router } from 'express';
import { z } from 'zod';
import {
  getEventMessages,
  createMessage,
  deleteMessage,
  toggleReaction,
} from '../controllers/messageController';
import { authenticate } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';

const router = Router({ mergeParams: true });

// Zod validation schemas
const createMessageSchema = z.object({
  text: z.string().min(1, 'Message cannot be empty').max(1000, 'Message cannot exceed 1000 characters'),
});

const toggleReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(10, 'Invalid emoji length'),
});

router.get('/', authenticate, getEventMessages);
router.post('/', authenticate, validate(createMessageSchema), createMessage);
router.delete('/:messageId', authenticate, deleteMessage);
router.post('/:messageId/reactions', authenticate, validate(toggleReactionSchema), toggleReaction);

export default router;
