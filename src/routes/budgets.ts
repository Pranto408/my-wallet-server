import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Budget } from '../models/Budget';

const router = Router();

// GET all budgets for user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const budgets = await Budget.find({ userId });
    res.status(200).json(budgets);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching budgets.' });
  }
});

// POST or update budget limit for a category
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { category, limit } = req.body;

    if (!category || limit === undefined || limit < 0) {
      return res.status(400).json({ message: 'Category and positive budget limit are required.' });
    }

    const updatedBudget = await Budget.findOneAndUpdate(
      { userId, category },
      { limit },
      { new: true, upsert: true }
    );

    res.status(200).json(updatedBudget);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating budget.' });
  }
});

export default router;
