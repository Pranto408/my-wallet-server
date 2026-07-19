import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

const router = Router();

// GET all transactions with filters, search, sort, pagination
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { search, category, startDate, endDate, sort, page = 1, limit = 10 } = req.query;

    const query: any = { userId: new mongoose.Types.ObjectId(userId) };

    // Search query on title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate as string);
      }
    }

    // Sorting definition
    let sortOption: any = { date: -1 }; // default: newest first
    if (sort === 'date_asc') {
      sortOption = { date: 1 };
    } else if (sort === 'amount_desc') {
      sortOption = { amount: -1 };
    } else if (sort === 'amount_asc') {
      sortOption = { amount: 1 };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries
    const transactions = await Transaction.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching transactions.' });
  }
});

// GET transaction stats (spending by category vs budgets)
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Aggregate monthly spending by category
    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: { category: '$category', isExpense: { $lt: ['$amount', 0] } },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id.category',
          isExpense: '$_id.isExpense',
          totalAmount: { $abs: '$totalAmount' }
        }
      }
    ]);

    // Separate into expenses and incomes
    const categoryTotals = stats.map(item => ({
      category: item.category,
      isExpense: item.isExpense,
      total: item.totalAmount
    }));

    res.status(200).json(categoryTotals);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error generating statistics.' });
  }
});

// GET single transaction details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID format.' });
    }

    const transaction = await Transaction.findOne({ _id: id, userId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    res.status(200).json(transaction);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error retrieving transaction details.' });
  }
});

// POST create a new transaction
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    console.log('Creating transaction for userId:', userId);
    const { title, amount, category, date, receiptUrl, type } = req.body;

    if (!title || amount === undefined || !category || !date) {
      return res.status(400).json({ message: 'Title, amount, category, and date are required.' });
    }

    const newTransaction = new Transaction({
      userId: new mongoose.Types.ObjectId(userId),
      title,
      amount,
      type,
      category,
      date: new Date(date),
      receiptUrl: receiptUrl || ''
    });

    await newTransaction.save();
    console.log('Saved transaction:', newTransaction);
    res.status(201).json(newTransaction);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: error.message || 'Error creating transaction.' });
  }
});

// DELETE a transaction
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID format.' });
    }

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or unauthorized.' });
    }

    res.status(200).json({ message: 'Transaction successfully deleted.', transactionId: id });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error deleting transaction.' });
  }
});

export default router;
