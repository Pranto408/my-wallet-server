import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretmywalletkey12345!';

// Utility to generate JWT
const generateToken = (userId: string, email: string) => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
};

// Register Route
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
    });

    await newUser.save();
    const token = generateToken(newUser._id.toString(), newUser.email);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
});

// Login Route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error during login.' });
  }
});

// Google OAuth mock backend verify/register
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token: googleToken, email, name, picture } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: 'Google authentication details missing.' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create user if not exists
      user = new User({
        name,
        email,
        googleId: googleToken || `google-${Date.now()}`,
        avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google ID if existing email tries to sign in via Google
      user.googleId = googleToken || `google-${Date.now()}`;
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Google login verification failed.' });
  }
});

// Demo Login Route - seeds data so the client runs out of the box
router.post('/demo-login', async (req: Request, res: Response) => {
  try {
    const demoEmail = 'demo@mywallet.app';
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      user = new User({
        name: 'Demo User',
        email: demoEmail,
        googleId: 'demo-google-oauth-mock-id',
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=DemoUser`
      });
      await user.save();

      // Seed initial Budgets
      const sampleBudgets = [
        { userId: user._id, category: 'Food', limit: 600 },
        { userId: user._id, category: 'Transport', limit: 200 },
        { userId: user._id, category: 'Rent', limit: 1500 },
        { userId: user._id, category: 'Entertainment', limit: 400 },
        { userId: user._id, category: 'Utilities', limit: 300 },
        { userId: user._id, category: 'Healthcare', limit: 250 }
      ];
      await Budget.insertMany(sampleBudgets);

      // Seed initial Transactions over the last 30 days
      const daysAgo = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() - days);
        return d;
      };

      const sampleTransactions = [
        // Income
        { userId: user._id, title: 'Monthly Salary Payment', amount: 4800, category: 'Salary', date: daysAgo(25) },
        { userId: user._id, title: 'Freelance Design Work', amount: 850, category: 'Salary', date: daysAgo(10) },
        
        // Rent
        { userId: user._id, title: 'Apartment Monthly Rent', amount: -1250, category: 'Rent', date: daysAgo(27) },
        
        // Food & Dinings
        { userId: user._id, title: 'Gourmet Grocery Shopping', amount: -145.50, category: 'Food', date: daysAgo(20) },
        { userId: user._id, title: 'Bistro Dinner with Friends', amount: -85.20, category: 'Food', date: daysAgo(15) },
        { userId: user._id, title: 'Starbucks Coffee & Snacks', amount: -18.75, category: 'Food', date: daysAgo(12) },
        { userId: user._id, title: 'Sushi Takeout Delivery', amount: -52.40, category: 'Food', date: daysAgo(6) },
        { userId: user._id, title: 'Weekly Groceries Supermarket', amount: -110.30, category: 'Food', date: daysAgo(3) },

        // Transport
        { userId: user._id, title: 'Uber Commute to Office', amount: -24.50, category: 'Transport', date: daysAgo(24) },
        { userId: user._id, title: 'Gas Station Refuel', amount: -65.00, category: 'Transport', date: daysAgo(18) },
        { userId: user._id, title: 'Monthly Train Pass purchase', amount: -90.00, category: 'Transport', date: daysAgo(15) },
        { userId: user._id, title: 'Uber Ride back home', amount: -28.00, category: 'Transport', date: daysAgo(8) },

        // Utilities
        { userId: user._id, title: 'Electric & Gas Bill Payment', amount: -145.00, category: 'Utilities', date: daysAgo(22) },
        { userId: user._id, title: 'High-speed Internet Bill', amount: -69.99, category: 'Utilities', date: daysAgo(14) },
        { userId: user._id, title: 'Mobile Phone Subscription Plan', amount: -45.00, category: 'Utilities', date: daysAgo(5) },

        // Entertainment
        { userId: user._id, title: 'Netflix & Spotify Premium Sub', amount: -29.98, category: 'Entertainment', date: daysAgo(25) },
        { userId: user._id, title: 'Concert Tickets Ticketmaster', amount: -120.00, category: 'Entertainment', date: daysAgo(16) },
        { userId: user._id, title: 'Weekend Movie Night IMAX', amount: -38.50, category: 'Entertainment', date: daysAgo(9) },
        { userId: user._id, title: 'Modern Boardgames Store', amount: -55.00, category: 'Entertainment', date: daysAgo(4) },

        // Healthcare
        { userId: user._id, title: 'Dental Clinic Cleaning Checkup', amount: -120.00, category: 'Healthcare', date: daysAgo(11) },
        { userId: user._id, title: 'Pharmacy Prescription Allergy Meds', amount: -34.80, category: 'Healthcare', date: daysAgo(7) }
      ];
      await Transaction.insertMany(sampleTransactions);
    }

    const token = generateToken(user._id.toString(), user.email);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Demo login failed.' });
  }
});

// GET profile of logged-in user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching user profile.' });
  }
});

// GET Google authentication initiation
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

// GET Google callback handler
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login', session: false }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user) {
      return res.redirect('http://localhost:3000/login');
    }
    const token = generateToken(user._id.toString(), user.email);
    res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
  }
);

export default router;
