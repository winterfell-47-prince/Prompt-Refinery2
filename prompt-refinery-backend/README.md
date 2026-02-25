# Prompt Refinery Backend

Multi-tenant SaaS backend for Prompt Refinery - a prompt optimization platform supporting multiple LLM providers (Gemini, OpenAI, Anthropic, DeepSeek, and custom APIs).

## Architecture

### Tech Stack
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Zod (optional)
- **Monitoring**: Built-in query logging

### Database Schema

#### Core Tables
- **organizations** - Company accounts (multi-tenant isolation)
- **users** - Team members with role-based access (admin, user)
- **api_keys** - Organization-specific API keys for the backend
- **provider_configs** - LLM provider credentials per organization

#### Feature Tables
- **optimizations** - Prompt optimization requests with results
- **batch_jobs** - Batch processing jobs metadata
- **batch_items** - Individual items within batch jobs
- **subscriptions** - Usage limits and billing information

## Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 5000)
- `JWT_SECRET` - Secret key for signing tokens (use strong random value)
- `JWT_EXPIRY` - Access token expiration (default: 24h)
- `OPENAI_API_KEY` - Global OpenAI key (optional, can be per-org)
- `ANTHROPIC_API_KEY` - Global Anthropic key (optional)
- `DEEPSEEK_API_KEY` - Global DeepSeek key (optional)
- `GEMINI_API_KEY` - Global Gemini key (optional)
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` - For billing (optional)

3. **Database Setup**
```bash
# Run migrations
npm run db:migrate

# Optional: Seed with test data
npm run db:seed
```

## Running

### Development
```bash
npm run dev
```
Runs with hot-reload using `tsx watch`. Server starts on port specified in `.env` (default: 5000).

### Production
```bash
npm run build
npm start
```

### Health Check
```bash
curl http://localhost:5000/health
```

## API Endpoints

### Authentication

#### Register Organization & Admin User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "secure-password",
  "fullName": "Jane Doe",
  "organizationName": "Acme Corp",
  "organizationSlug": "acme-corp"
}

Response: { accessToken, refreshToken, user }
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "secure-password"
}

Response: { accessToken, refreshToken, user }
```

#### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}

Response: { accessToken }
```

### Optimization

#### Optimize Text
```bash
POST /api/optimize
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "text": "Your prompt text here...",
  "provider": "openai",
  "strategy": "UNIVERSAL",
  "compressionLevel": "medium",
  "outputFormat": "default"
}

Response: {
  "id": 123,
  "refinedText": "...",
  "originalTokens": 150,
  "refinedTokens": 100,
  "savingsPercentage": 33.3
}
```

#### Get History
```bash
GET /api/optimize/history?limit=20&offset=0
Authorization: Bearer <accessToken>

Response: [{
  "id": 123,
  "provider": "openai",
  "originalTokens": 150,
  "refinedTokens": 100,
  "savingsPercentage": 33.3,
  "status": "completed",
  "created_at": "2024-..."
}, ...]
```

## Multi-Tenant Architecture

### Data Isolation
- All data is partitioned by `organization_id`
- Users can only access data from their organization
- JWT tokens include organization context for enforcement

### Provider Configuration
- Each organization can configure credentials for each LLM provider
- Falls back to global keys if not configured (for development)
- Encrypted storage (future: implement field-level encryption)

### Subscription Management
- Free tier: 1000 requests/month
- Usage tracking per organization
- Request limits enforced at the API endpoint

## Development Guide

### Database Queries
```typescript
import { query } from './database/index.js';

// Execute query
const result = await query(
  'SELECT * FROM users WHERE organization_id = $1',
  [organizationId]
);

console.log(result.rows);
```

### Adding New Routes
1. Create file in `src/routes/`
2. Import in `src/server.ts`
3. Use `authMiddleware` for protected routes
4. Extract `req.user.organizationId` for multi-tenant filtering

Example:
```typescript
import { Router } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  const result = await query(
    'SELECT * FROM table WHERE organization_id = $1',
    [req.user?.organizationId]
  );
  res.json(result.rows);
});

export default router;
```

## Security Considerations

### Implemented
- ✅ JWT token-based authentication
- ✅ Bcrypt password hashing (10 rounds)
- ✅ CORS headers
- ✅ Helmet.js security headers
- ✅ SQL parameterized queries (PostgreSQL)
- ✅ Multi-tenant data isolation

### TODO
- 🔒 API key encryption (field-level)
- 🔒 Rate limiting per organization
- 🔒 Audit logging for sensitive operations
- 🔒 Request signing for provider API calls
- 🔒 TLS/HTTPS in production

## Deployment

### Environment Variables for Production
- Set strong `JWT_SECRET` (32+ character random string)
- Use environment-specific `DATABASE_URL` with SSL
- Configure provider keys securely (use secrets manager)
- Set `NODE_ENV=production`

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

## Troubleshooting

### Database Connection Issues
```
Check DATABASE_URL format: postgresql://user:password@host:5432/dbname
Ensure PostgreSQL is running and accepting connections
```

### Token Errors
```
"Invalid token" → JWT_SECRET mismatch between signing and verification
"Token expired" → Access token needs refresh using refresh token
```

### Provider Rate Limits
```
Implement exponential backoff retries in LLM provider calls
Add request queuing for batch operations
```

## Performance Optimization

### Completed
- ✅ Connection pooling (10 connections)
- ✅ Query logging with duration tracking  
- ✅ Indexed columns (org_id, user_id, created_at)

### Recommended
- Add query result caching (Redis)
- Implement request deduplication
- Use read replicas for analytics queries
- Archive old optimization records

## License
MIT
