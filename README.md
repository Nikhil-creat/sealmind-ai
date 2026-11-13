# SealMind AI
AI-native e-signature and document intelligence landing platform. Static frontend plus Vercel serverless backend. Provider and model are auto-detected (Groq or Gemini), with automatic fallback.

Built by Nikhil Chary Sriramoju. https://github.com/Nikhil-creat

## Run locally
    npm i -g vercel
    cp .env.example .env     # add GROQ_API_KEY and/or GEMINI_API_KEY
    vercel dev

## Deploy
1. Push to GitHub. 2. Import the repo in Vercel (Framework: Other, no build command). 3. Add env vars GROQ_API_KEY, GEMINI_API_KEY. 4. Deploy.

## Structure
index.html, styles.css, app.js (frontend) | api/chat.js, api/analyze.js, api/_llm.js (backend) | vercel.json (security headers)

## Auto-detect
Keys are identified by prefix (gsk_ Groq, AIza Gemini). The server lists each provider's live models and picks the best one, re-detecting if a model is retired. Visitors can paste their own key under Key in the chat (kept in the tab only). GET /api/health shows what was detected.
