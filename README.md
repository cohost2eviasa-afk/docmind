# DocMind 🤖

AI-powered document knowledge base. Upload documents, edit them in-app, and ask the AI anything — it always reads your latest edits.

---

## 🚀 Deploy to Vercel (Free)

### Step 1 — Upload to GitHub

1. Go to [github.com](https://github.com) and sign in (or create a free account)
2. Click the **＋** icon (top right) → **New repository**
3. Name it `docmind`, keep it private if you want, click **Create repository**
4. On the next page, click **uploading an existing file**
5. Drag and drop **all the files from this folder** into the upload area
6. Click **Commit changes**

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **Add New → Project**
3. Find your `docmind` repo and click **Import**
4. Vercel will auto-detect it as a Vite project — no changes needed
5. Before clicking Deploy, click **Environment Variables** and add:
   - **Name:** `VITE_ANTHROPIC_API_KEY`
   - **Value:** your key from [console.anthropic.com](https://console.anthropic.com)
6. Click **Deploy** — done! 🎉

Vercel gives you a URL like `https://docmind-yourname.vercel.app`

---

## 💻 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Then open .env and paste your Anthropic API key

# 3. Start the dev server
npm run dev

# Open http://localhost:5173
```

---

## 📁 Project Structure

```
docmind/
├── index.html          # App entry point
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies
├── .env.example        # API key template
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx        # React entry
    ├── App.jsx         # Main application
    ├── App.css         # Component styles
    └── index.css       # Global styles
```

---

## 🔑 Getting Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Copy the key — you only see it once!

API usage is pay-as-you-go and very cheap for personal use.

---

## ✨ Features

- Upload `.txt`, `.md`, `.csv`, `.json`, `.py`, `.js`, and more
- Edit documents directly in the app
- AI chat always reflects your latest edits
- Multiple documents loaded as context simultaneously
- Clean dark UI, works on mobile too
