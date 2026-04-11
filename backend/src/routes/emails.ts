import { Router } from 'express';
import { scheduleEmails, getScheduledEmails, getSentEmails, cancelEmail, cancelAllScheduled, rescheduleAll } from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/schedule', scheduleEmails);
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.delete('/cancel-all', cancelAllScheduled);
router.post('/reschedule-all', rescheduleAll);
router.delete('/:id', cancelEmail);

export default router;
