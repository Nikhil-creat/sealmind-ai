# SealMind backend, Phase 1 (infrastructure and schema)
    cp .env.example .env        # set the two passwords
    docker compose up -d        # Postgres 16 + pgvector, Redis 7
    npx prisma migrate dev --schema prisma/schema.prisma --name init
    psql "$DATABASE_URL" -f sql/audit_append_only.sql
Next phases: Next.js app and worker (Phase 2), RAG and CNN field suggestion (3), LangGraph agents and copilot (4), hardening and tests (5).
Limits enforced in app code: 50 MB, 250 pages, Redis rate limits, heavy jobs on BullMQ.
