# MyWallet — Server

**MyWallet** is an AI-powered personal finance tracker that helps you manage budgets, log transactions, and understand your spending through Gemini-powered insights. This repository contains the **backend** (Node.js + Express + TypeScript + MongoDB).

🔗 **Live API:** [https://my-wallet-server-xypn.onrender.com](https://my-wallet-server-xypn.onrender.com)
🔗 **Frontend Repo:** [MyWallet-Client](https://github.com/Pranto408/my-wallet-client)
🔗 **Live App:** [https://my-wallet-client-smoky.vercel.app](https://my-wallet-client-smoky.vercel.app)

---

## ✨ Features

- JWT-based authentication (register, login, demo login)
- Google OAuth 2.0 login (Passport.js)
- Transaction CRUD with search, filter, sort, and pagination support
- Budget management per category (upsert)
- **AI Data Analyzer** — Gemini-powered spending analysis with a rule-based fallback if the AI call is unavailable
- **AI Auto-Classification** — suggests a transaction category from its title/description
- MongoDB Atlas for data storage

## 🛠 Tech Stack

- **Runtime:** Node.js + Express + TypeScript
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + Passport.js (Google OAuth 2.0)
- **AI:** Google Gemini API

## 🚀 Getting Started (Local Development)

```bash
git clone https://github.com/Pranto408/my-wallet-server.git
cd my-wallet-server
npm install
```

Create a `.env` file in the root:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLIENT_URL=http://localhost:3000
```

Run in development:

```bash
npm run dev
```

Or build and run in production mode:

```bash
npm run build
npm start
```

Server runs at `http://localhost:5000`.

## 📁 Project Structure

```
src/
├── config/
│   └── passport.ts        # Google OAuth strategy
├── middleware/
│   └── auth.ts             # JWT verification middleware
├── models/
│   ├── User.ts
│   ├── Transaction.ts
│   └── Budget.ts
├── routes/
│   ├── auth.ts              # Register, login, demo login, Google OAuth
│   ├── transactions.ts
│   ├── budgets.ts
│   └── ai.ts                # AI analyzer + auto-classification
└── server.ts                # App entry point
```

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret used to sign JWTs |
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL registered in Google Cloud Console |
| `CLIENT_URL` | Frontend URL, used to redirect after OAuth login |

## 📄 License

Built as part of an Agentic AI project assignment.
