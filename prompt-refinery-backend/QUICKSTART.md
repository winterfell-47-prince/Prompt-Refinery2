# Quick Start Guide

Get Prompt Refinery running locally in 10 minutes.

## Prerequisites

- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 12+ (https://www.postgresql.org/download/)
- npm or yarn

### Verify Installation

```bash
node --version     # Should be v18+
npm --version      # Should be 8+
psql --version     # Should be 12+
```

## Step 1: Database Setup (2 minutes)

### On Windows

1. **Create Database**
   ```sql
   psql -U postgres
   
   CREATE DATABASE prompt_refinery_dev;
   \q
   ```

2. **Update Connection String**
   ```
   postgresql://postgres:password@localhost:5432/prompt_refinery_dev
   ```
   (Replace `password` with your postgres password)

### On macOS/Linux

```bash
createdb prompt_refinery_dev
```

## Step 2: Backend Setup (3 minutes)

```bash
# Clone repository (if needed)
cd prompt-refinery-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your database URL
# On Windows: notepad .env
# On macOS: nano .env
# On Linux: vim .env

# Example DATABASE_URL:
# postgresql://postgres:password@localhost:5432/prompt_refinery_dev

# Initialize database
npm run db:migrate

# Seed test data (optional)
npm run db:seed

# Start development server
npm run dev
```

✅ Backend ready at `http://localhost:5000`

### Test Backend

```bash
# In another terminal
curl http://localhost:5000/health
# Should return: { "status": "ok", "timestamp": "..." }

# Test registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "password123",
    "fullName": "Demo User",
    "organizationName": "Demo Org",
    "organizationSlug": "demo-org"
  }'
```

## Step 3: Frontend Setup (2 minutes)

```bash
# In new terminal
cd prompt-refinery

# Install dependencies
npm install

# Create .env file
cat > .env.local << EOF
VITE_API_URL=http://localhost:5000
EOF

# Start development server
npm run dev
```

✅ Frontend ready at `http://localhost:3003`

## Step 4: Test Full Integration (3 minutes)

### Use Seeded Test Data (if you ran db:seed)

```bash
# http://localhost:3003
# Login with:
# Email: admin@acme.com
# Password: password123
```

### Or Register New Organization

1. Open `http://localhost:3003`
2. Click "Register"
3. Fill in:
   - Email: your-email@example.com
   - Password: any password (8+ chars)
   - Full Name: Your Name
   - Organization: Test Company
   - Slug: test-company
4. Click "Create Organization"
5. You're logged in! 🎉

### Test Optimization

1. Go to "Single View"
2. Select provider (OpenAI, Anthropic, etc.)
3. Enter a prompt
4. Click "Optimize"
   - ❌ Will fail because you need API keys
   - ✅ But request goes to backend successfully!

### Configure LLM Provider

For now, the backend uses global provider keys from env variables. To test:

1. Stop backend: `Ctrl+C`
2. Edit `.env` and add API keys:
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=claude-...
   ```
3. Restart backend: `npm run dev`
4. Try optimization again - it will work!

## Troubleshooting

### "error: role "postgres" does not exist"
On Windows, PostgreSQL default user might be different:
```sql
-- Check existing users
SELECT * FROM pg_user;

-- Use actual user, e.g., "postgres_user"
createdb -U postgres_user prompt_refinery_dev
```

### "Cannot find module 'pg'"
```bash
# In backend folder
npm install

# Or specifically:
npm install pg
```

### "ECONNREFUSED 127.0.0.1:5432"
PostgreSQL not running. Start it:
- Windows: `Services` → find "PostgreSQL" → Start
- macOS: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### "Port 3003/5000 already in use"
Kill existing process:
```bash
# Frontend (port 3003)
lsof -i :3003  # Find process
kill -9 <PID>

# Backend (port 5000)
lsof -i :5000
kill -9 <PID>
```

### Frontend can't reach backend
Check VITE_API_URL in frontend `.env.local`:
```env
VITE_API_URL=http://localhost:5000
```

Also check backend is running:
```bash
curl http://localhost:5000/health
```

## Common Commands

### While Developing

```bash
# Terminal 1: Backend
cd prompt-refinery-backend
npm run dev

# Terminal 2: Frontend  
cd prompt-refinery
npm run dev

# Terminal 3: Database commands
cd prompt-refinery-backend

# View logs
npm run dev

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Check database directly
psql prompt_refinery_dev

# In psql:
\dt                     # List tables
SELECT * FROM users;    # View users
\q                      # Quit
```

### Before Deploying

```bash
# Backend
cd prompt-refinery-backend
npm run build
npm start

# Frontend
cd prompt-refinery
npm run build
npm preview
```

## What to Test

- ✅ Register new organization
- ✅ Login with email/password
- ✅ View optimization history (empty at first)
- ✅ Go to Settings (provider configuration cards visible)
- ✅ Batch upload CSV (processes locally for now)
- ✅ View Dashboard (no history yet)
- ✅ Logout and login again
- ✅ Backend responses logged in browser DevTools Network tab

## Quick Debugging

### Check Backend Health

```bash
curl http://localhost:5000/health
# Response: {"status":"ok","timestamp":"2024-..."}
```

### Check Database Connection

```bash
# From backend folder
npm run db:migrate

# If successful, you'll see:
# ✅ Database migration completed successfully
```

### View Server Logs

```bash
# Frontend - in browser DevTools (F12)
# Console tab shows client logs
# Network tab shows API calls

# Backend - in terminal running `npm run dev`
# Shows request logs with timing:
# Executed query { text: 'SELECT...' duration: 45, rows: 1 }
```

### Test API Directly

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "secure123",
    "fullName": "Test",
    "organizationName": "TestOrg",
    "organizationSlug": "test-org"
  }'

# Response shows tokens - copy accessToken

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"secure123"}'

# Get history (paste from response above)
curl http://localhost:5000/api/optimize/history \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Next Steps

- [ ] Review [README.md](./README.md) for architecture details
- [ ] Review [API.md](./API.md) for endpoint documentation
- [ ] Review [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) for integration details
- [ ] Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- [ ] Read [PHASE1_SUMMARY.md](./PHASE1_SUMMARY.md) for what was built

## Getting Help

### Common Issues

1. **Setup failed?** Run `npm run dev` in backend and check error message
2. **Database issue?** Verify PostgreSQL is running: `psql --version`
3. **Port conflict?** Change in backend `.env` → `PORT=5001`
4. **API key errors?** See [LLM Provider Setup](#configure-llm-provider) above

### Documentation

- **Backend**: See [README.md](./README.md)
- **API Endpoints**: See [API.md](./API.md)
- **Integration Steps**: See [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)
- **Production**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Success Indicators

When everything works:

1. ✅ `npm run dev` (backend) shows no errors
2. ✅ `npm run dev` (frontend) shows no errors
3. ✅ http://localhost:5000/health returns 200 OK
4. ✅ http://localhost:3003 loads without errors
5. ✅ Can register new organization
6. ✅ Can login with registered account
7. ✅ Dashboard shows (empty history is OK)
8. ✅ Browser DevTools Network tab shows API calls

## Performance Tips

- Keep both backend and frontend running in separate terminals
- Use hot-reload (automatic reload on code changes)
- Check browser DevTools Network tab for API latency
- Database queries logged in backend terminal with timing

Enjoy building! 🚀
