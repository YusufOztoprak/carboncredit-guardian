# Backend – FastAPI

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # uses SQLite locally
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs

## Deploy on Render
- New -> PostgreSQL (free) -> copy the Internal Database URL
- New -> Web Service -> this repo
  - Root Directory: `backend`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Environment: `DATABASE_URL`, `CORS_ORIGINS` (later: `SEPOLIA_RPC_URL`, `CONTRACT_ADDRESS`, `VERIFIER_PRIVATE_KEY`)
- Health check path: `/health`