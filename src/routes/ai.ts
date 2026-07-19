import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';

const router = Router();

// Keyword-based heuristic auto-classification dictionary
const classifyByKeywords = (desc: string): string => {
  const text = desc.toLowerCase();
  if (text.match(/dinner|lunch|breakfast|food|grocery|groceries|restaurant|eat|cafe|coffee|starbucks|sushi|pizza|burger|snack|bistro|market/)) {
    return 'Food';
  }
  if (text.match(/uber|lyft|taxi|cab|gas|petrol|fuel|refuel|train|subway|metro|bus|transit|flight|airline|commute/)) {
    return 'Transport';
  }
  if (text.match(/rent|apartment|flat|lease|mortgage|landlord|housing/)) {
    return 'Rent';
  }
  if (text.match(/netflix|spotify|hulu|disney|youtube|movie|cinema|concert|ticket|theater|game|steam|playstation|xbox|nintendo|pub|bar|club/)) {
    return 'Entertainment';
  }
  if (text.match(/electricity|electric|water|gas bill|utility|utilities|internet|wifi|comcast|at&t|verizon|mobile|phone|sim|telecom/)) {
    return 'Utilities';
  }
  if (text.match(/dentist|doctor|medical|hospital|pharmacy|pill|prescription|clinic|healthcare|health|dental|optician/)) {
    return 'Healthcare';
  }
  if (text.match(/salary|paycheck|wage|freelance|dividend|bonus|commission|stripe|paypal|payout|income/)) {
    return 'Salary';
  }
  return 'Other';
};

// Heuristic data analysis generator (fallback when Gemini key is not present)
const generateHeuristicAnalysis = (
  transactions: any[],
  budgets: any[]
): string => {
  // Aggregate data
  const expenses = transactions.filter(t => t.amount < 0);
  const incomes = transactions.filter(t => t.amount > 0);

  const totalExpense = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(t => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Math.abs(t.amount);
  });

  // Budget comparison & alerts
  const budgetAlerts: string[] = [];
  const budgetMap = new Map(budgets.map(b => [b.category, b.limit]));

  Object.entries(expenseByCategory).forEach(([category, total]) => {
    const limit = budgetMap.get(category);
    if (limit && total > limit) {
      const percentage = Math.round((total / limit) * 100);
      budgetAlerts.push(`⚠️ **${category}**: Spent **$${total.toFixed(2)}** of **$${limit.toFixed(2)}** limit (${percentage}% of budget)`);
    }
  });

  // Sort categories by expenditure
  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  let analysisMarkdown = `### 📊 AI Financial Analysis Report

#### 💰 Overall Balance Sheet
- **Total Monthly Income:** $${totalIncome.toFixed(2)}
- **Total Monthly Expenses:** $${totalExpense.toFixed(2)}
- **Net Cash Flow / Savings:** $${netSavings.toFixed(2)} (${totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0}% savings rate)
`;

  if (budgetAlerts.length > 0) {
    analysisMarkdown += `\n#### 🚨 Budget Violations & Alerts\n${budgetAlerts.map(alert => `- ${alert}`).join('\n')}\n`;
  } else {
    analysisMarkdown += `\n#### ✅ Budget Status\n- All spending categories are currently within their budget limits! Keep it up.\n`;
  }

  analysisMarkdown += `\n#### 📈 Top Expenditure Categories\n`;
  sortedCategories.forEach(([cat, val], idx) => {
    analysisMarkdown += `${idx + 1}. **${cat}**: $${val.toFixed(2)} (${((val / totalExpense) * 100).toFixed(1)}% of total expenses)\n`;
  });

  // Actionable tips
  analysisMarkdown += `
#### 💡 Actionable Insights & Recommendations
`;

  if (netSavings < 0) {
    analysisMarkdown += `- 🛑 **Alert**: Your net savings are in the negative. You are spending more than you earn. Focus on reducing variable expenses like **Entertainment** or **Food**.
`;
  } else if (netSavings / totalIncome < 0.2) {
    analysisMarkdown += `- ⚠️ **Advice**: Your savings rate is **${((netSavings / totalIncome) * 100).toFixed(1)}%**. A standard recommendation is 20%. Look for opportunities to trim minor utility or dining out costs to bump this up.
`;
  } else {
    analysisMarkdown += `- 🎉 **Excellent**: You have a strong savings rate of **${((netSavings / totalIncome) * 100).toFixed(1)}%**. Consider moving surplus savings into investments or a high-yield savings account.
`;
  }

  if (sortedCategories.length > 0 && sortedCategories[0][0] === 'Food' && (sortedCategories[0][1] / totalExpense) > 0.3) {
    analysisMarkdown += `- 🍔 **Food for Thought**: Dining & Grocery spending accounts for **${((sortedCategories[0][1] / totalExpense) * 100).toFixed(1)}%** of your total expenses. Meal planning or cooking at home more often could save you substantial amounts.
`;
  }

  if (sortedCategories.some(([cat, val]) => cat === 'Entertainment' && val > 150)) {
    analysisMarkdown += `- 🎬 **Subscription Check**: Entertainment is a notable category this month. Take a moment to review active subscriptions (e.g. streaming, game passes) and cancel any you haven't used in the past 30 days.
`;
  }

  return analysisMarkdown;
};

// AI Classification Endpoint
router.post('/classify', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ message: 'Description text is required for auto-classification.' });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Classify this transaction description: "${description}" into exactly one of these categories: Food, Transport, Rent, Entertainment, Utilities, Healthcare, Salary, Other. Reply with ONLY the category name and nothing else.`
                }]
              }]
            })
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (candidateText && ['Food', 'Transport', 'Rent', 'Entertainment', 'Utilities', 'Healthcare', 'Salary', 'Other'].includes(candidateText)) {
            return res.status(200).json({ category: candidateText, source: 'gemini' });
          }
        }
      } catch (err) {
        console.warn('Gemini auto-classification failed, falling back to heuristics:', err);
      }
    }

    // Heuristics fallback
    const category = classifyByKeywords(description);
    res.status(200).json({ category, source: 'heuristics' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Auto-classification error.' });
  }
});

// AI Data Analyzer Endpoint (handles both DB records or raw CSV parsed payload)
router.post('/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    let { transactions } = req.body; // Can pass custom transaction array (e.g. from uploaded CSV)

    // If no transactions provided, retrieve user's transactions from DB (last 100)
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      transactions = await Transaction.find({ userId }).sort({ date: -1 }).limit(100);
    }

    // Retrieve budgets for comparison
    const budgets = await Budget.find({ userId });

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && transactions.length > 0) {
      try {
        const formattedData = transactions.map((t: any) => ({
          title: t.title,
          amount: t.amount,
          category: t.category,
          date: t.date
        }));

        const prompt = `
You are an expert personal financial advisor AI.
Analyze the following user transaction data and budget limits. Provide a detailed, engaging financial health report in markdown.

Budget limits:
${budgets.map(b => `- ${b.category}: $${b.limit}`).join('\n')}

Transactions list:
${JSON.stringify(formattedData)}

Requirements:
1. Provide a "Balance Sheet Summary" with total income, total expenses, net savings, and savings rate.
2. Outline "Budget Alerts" highlighting any category where spending exceeded the budget limit.
3. List the "Top 3 Spending Categories" and what percentage of total expenses they consume.
4. Give exactly 3 "Actionable Financial Tips" customized specifically for this transaction list.
Keep it encouraging, clean, and highly readable.
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }]
            })
          }
        );

        if (response.ok) {
          const data: any = await response.json();
          const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (analysisText) {
            return res.status(200).json({ analysis: analysisText, source: 'gemini' });
          }
        }
      } catch (err) {
        console.warn('Gemini spending analysis failed, falling back to heuristics:', err);
      }
    }

    // Heuristics fallback
    const analysis = generateHeuristicAnalysis(transactions, budgets);
    res.status(200).json({ analysis, source: 'heuristics' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Spending analysis error.' });
  }
});

export default router;
