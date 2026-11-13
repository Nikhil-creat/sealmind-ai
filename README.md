# SealMind AI
**Sign with intelligence.** An open-source, AI-native e-signature and contract-intelligence platform: sign PDFs in the browser, get instant clause-risk analysis, search contracts in plain language, and seal files with SHA-256 audit certificates. Groq and Gemini are auto-detected, with automatic model selection and fallback.

Live: https://sealmind-ai.vercel.app

## Features
- Scroll-scrubbed cinematic landing page (video scrubbed frame by frame), installable PWA with offline cache
- Sign a real PDF in the browser (pdf.js + pdf-lib): draw, place, stamp, hash, signed PDF and certificate PDF
- Risk lab: AI clause risk, obligations and suggested redline; PDF text extraction; SHA-256 seal
- Vault search (TF-IDF retrieval demo), compare two versions with word diff and AI explanation
- Agents demo: classify, route, playbook redline, follow-up schedule
- Seal chatbot with plain-English, amendment and GDPR shortcuts; highlight-to-ask
- Command palette (Ctrl+K or /), CSP and security headers, per-IP rate limiting, prompt-injection guard

## Architecture
    Browser (static HTML/CSS/JS)  ->  /api/chat, /api/analyze, /api/health (Vercel functions)
                                        -> key prefix detect -> live model list -> Groq | Gemini (fallback)
    backend/  Phase 1 of the full platform: Docker Compose (Postgres+pgvector, Redis) and Prisma schema

## Deploy
1. Push to GitHub. 2. Import in Vercel (Framework: Other, no build command). 3. Add GROQ_API_KEY and/or GEMINI_API_KEY. 4. Deploy. Check /api/health.

## Honest notes
Vault search is word-based, not embeddings. Agents and pipeline are demos. The full CNN forgery service, pgvector RAG and LangGraph agents are the roadmap in backend/. Not legal advice.

## Author
Nikhil Chary Sriramoju. https://github.com/Nikhil-creat. License: MIT
