import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

// Load Environment variables
dotenv.config();

// Imports routers
import authRouter from './routes/auth';
import transactionRouter from './routes/transactions';
import budgetRouter from './routes/budgets';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mywallet';

import session from 'express-session';
import passport from './config/passport';

// Middlewares
app.use(cors({
  origin: '*', // For development simplicity, allow requests from any client origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.JWT_SECRET || 'supersecretsessionkey',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// DB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('MongoDB connection failure:', err));

// Routes Configuration
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/budgets', budgetRouter);
app.use('/api/ai', aiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'MyWallet backend server is active and healthy.' });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`MyWallet server is running on port ${PORT}`);
});

export default app;
