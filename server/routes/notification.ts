import express, { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Get all notifications for the logged-in user
router.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find({ user: req.user!.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.patch('/notifications/:id/read', authMiddleware, async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!.id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Clear all notifications for the user
router.delete('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    await Notification.deleteMany({ user: req.user!.id });
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
