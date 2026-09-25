import express, { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { Notification } from '../models/Notification';
import authMiddleware from '../middleware/authMiddleware';
import logger from '../utils/logger';

const router = express.Router();

// Search users by partial email
router.get('/search-users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    if (!email) return res.json([]);

    const me = await User.findById(req.user!.id);
    if (!me) return res.status(404).json({ message: 'User not found' });

    const users = await User.find({
      email: { $regex: email as string, $options: 'i' },
      _id: { $ne: me._id }
    }).select('name email').lean();

    const usersWithStatus = users.map(user => {
      let status = 'none';
      if (me.friends.some((id: any) => id.equals(user._id))) status = 'friend';
      else if (me.sentRequests.some((id: any) => id.equals(user._id))) status = 'sent';
      return { ...user, status };
    });

    res.json(usersWithStatus);
  } catch (err) {
    logger.error({ err }, 'Search error');
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/send-request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { toUserId } = req.body;
    const fromUser = await User.findById(req.user!.id);
    const toUser = await User.findById(toUserId);
    if (!fromUser || !toUser) return res.status(404).json({ message: 'User not found' });
    if (
      fromUser.friends.includes(toUserId) ||
      fromUser.sentRequests.includes(toUserId) ||
      fromUser.receivedRequests.includes(toUserId)
    ) {
      return res.status(400).json({ message: 'Already friends or request pending' });
    }
    fromUser.sentRequests.push(toUserId);
    toUser.receivedRequests.push(fromUser._id as any);
    await fromUser.save();
    await toUser.save();
    await Notification.create({
      user: toUserId,
      type: 'friend_request',
      message: `${fromUser.name} sent you a friend request`,
      data: { fromUserId: fromUser._id, fromUserName: fromUser.name, fromUserEmail: fromUser.email },
    });
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.post('/accept-request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fromUserId } = req.body;
    const me = await User.findById(req.user!.id);
    const fromUser = await User.findById(fromUserId);
    if (!me || !fromUser) return res.status(404).json({ message: 'User not found' });
    if (!me.receivedRequests.includes(fromUserId)) {
      return res.status(400).json({ message: 'No such request' });
    }
    me.receivedRequests = me.receivedRequests.filter((id: any) => id.toString() !== fromUserId);
    fromUser.sentRequests = fromUser.sentRequests.filter((id: any) => id.toString() !== (me._id as any).toString());
    me.friends.push(fromUserId);
    fromUser.friends.push(me._id as any);
    await me.save();
    await fromUser.save();
    await Notification.create({
      user: fromUserId,
      type: 'friend_request',
      message: `${me.name} accepted your friend request`,
      data: { toUserId: me._id, toUserName: me.name, toUserEmail: me.email },
    });
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends, sent requests, received requests
router.get('/connections', authMiddleware, async (req: Request, res: Response) => {
  try {
    const me = await User.findById(req.user!.id)
      .populate('friends', 'name email')
      .populate('sentRequests', 'name email')
      .populate('receivedRequests', 'name email');
    if (!me) return res.status(404).json({ message: 'User not found' });
    res.json({
      friends: me.friends,
      sentRequests: me.sentRequests,
      receivedRequests: me.receivedRequests,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
