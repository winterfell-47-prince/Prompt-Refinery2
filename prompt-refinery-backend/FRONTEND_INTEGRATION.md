# Frontend-Backend Integration Guide

This guide explains how to integrate the Prompt Refinery frontend with the backend API.

## Current State

### Frontend (prompt-refinery)
- Running on `http://localhost:3003/`
- Stores user state locally in App.tsx
- Calls llmService with provider-specific API keys
- Uses localStorage for API key persistence
- Components: Settings (config), Single/Batch (optimization), Dashboard (history)

### Backend (prompt-refinery-backend)
- Ready to run on `http://localhost:5000/`
- Provides authentication and optimization endpoints
- Stores credentials securely in database
- Ready for multi-user/multi-org support

## Integration Architecture

```
┌─────────────────┐
│  React Frontend │
│  (localhost:3003)
└────────┬────────┘
         │ HTTP/JSON
         │ Bearer Token (JWT)
         ▼
┌─────────────────┐
│ Express Backend │
│ (localhost:5000)
└────────┬────────┘
         │ PostgreSQL
         ▼
┌─────────────────┐
│   PostgreSQL    │
│  Multi-tenant   │
└─────────────────┘
```

## Phase 1 Integration: Authentication

### Step 1: Update App.tsx - Remove Local Auth

Current (local-only):
```typescript
const [geminiKey, setGeminiKey] = useState('');
const [openaiKey, setOpenaiKey] = useState('');
```

New (backend-based):
```typescript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [accessToken, setAccessToken] = useState<string | null>(
  localStorage.getItem('accessToken')
);
const [organizationId, setOrganizationId] = useState<number | null>(
  localStorage.getItem('organizationId') ? 
  parseInt(localStorage.getItem('organizationId')!) : null
);
```

### Step 2: Create Authentication Service

Create `src/services/apiService.ts`:

```typescript
const API_BASE = 'http://localhost:5000';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    organizationId: number;
    role: string;
  };
}

export async function registerUser(data: {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationSlug: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const result = await response.json();
  
  // Store tokens
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);
  localStorage.setItem('organizationId', result.user.organizationId);

  return result;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const result = await response.json();
  
  localStorage.setItem('accessToken', result.accessToken);
  localStorage.setItem('refreshToken', result.refreshToken);
  localStorage.setItem('organizationId', result.user.organizationId);

  return result;
}

export function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export async function hasValidToken(): Promise<boolean> {
  const token = localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    // Try to decode JWT header to check expiry
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const decoded = JSON.parse(atob(parts[1]));
    // Add 5 minute buffer before expiry
    return decoded.exp * 1000 > Date.now() + 300000;
  } catch {
    return false;
  }
}
```

### Step 3: Update Settings Component

Replace the current provider config cards with:

```typescript
// In Settings UI
import { registerUser, loginUser, getAuthHeader } from '../services/apiService';

function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isRegister) {
        await registerUser({
          email, password, fullName, organizationName, organizationSlug
        });
      } else {
        await loginUser(email, password);
      }
      // Trigger re-render or navigate to dashboard
      window.location.href = '/';
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    }
  }

  return (
    // Form JSX
  );
}
```

### Step 4: Update MarketSheet.tsx

Replace direct llmService calls with backend API:

```typescript
// Old (direct to LLM provider)
const result = await generateMarketDocument(orgContext, provider);

// New (through backend)
async function generateMarketDocument(orgContext, provider) {
  const response = await fetch('http://localhost:5000/api/optimize', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      text: orgContext,
      provider: provider,
      outputFormat: 'markdown'
    })
  });

  if (!response.ok) throw new Error('Optimization failed');
  return response.json();
}
```

## Phase 1.5 Integration: Optimization API

### Step 5: Update Single View Optimization

Replace:
```typescript
// Old
const result = await optimizePrompt(text, provider);

// New
async function optimizePrompt(text: string, provider: string) {
  const response = await fetch('http://localhost:5000/api/optimize', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      text,
      provider,
      strategy: 'UNIVERSAL',
      compressionLevel: 'medium',
      outputFormat: 'default'
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  return {
    refinedText: result.refinedText,
    originalTokens: result.originalTokens,
    refinedTokens: result.refinedTokens,
    savingsPercentage: result.savingsPercentage
  };
}
```

### Step 6: Update Batch Dashboard

Replace local batch processing with:

```typescript
async function processBatch(items: BatchItem[], provider: string) {
  const results = [];
  
  for (const item of items) {
    try {
      const response = await fetch('http://localhost:5000/api/optimize', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          text: item.text,
          provider,
          compressionLevel: 'medium'
        })
      });

      if (response.ok) {
        const result = await response.json();
        results.push({
          ...item,
          refinedText: result.refinedText,
          savingsPercentage: result.savingsPercentage
        });
      }
    } catch (error) {
      console.error('Batch item failed:', error);
    }
  }

  return results;
}
```

### Step 7: Update Analysis Dashboard

Pull history from backend:

```typescript
async function getoptimizationHistory(limit = 50) {
  const response = await fetch(
    `http://localhost:5000/api/optimize/history?limit=${limit}`,
    {
      headers: getAuthHeader()
    }
  );

  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

// In useEffect
useEffect(() => {
  if (isAuthenticated) {
    getOptimizationHistory()
      .then(setHistory)
      .catch(console.error);
  }
}, [isAuthenticated]);
```

## Configuration for Development

### Frontend .env
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=Prompt Refinery
```

### Frontend vite.config.ts (proxy)
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
```

With this proxy, frontend can call `/api/auth/login` instead of full URL.

## Security Considerations for Integration

### Token Refresh Strategy
```typescript
export async function ensureValidToken() {
  if (await hasValidToken()) return;

  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    // Redirect to login
    window.location.href = '/login';
    return;
  }

  const response = await fetch('http://localhost:5000/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (response.ok) {
    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
  } else {
    // Refresh failed, redirect to login
    window.location.href = '/login';
  }
}

// Call before each API request
await ensureValidToken();
```

### CORS Configuration

Backend already has CORS enabled. For production, update in backend:

```typescript
// In server.ts
app.use(cors({
  origin: 'https://app.promptrefinery.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Testing the Integration

### 1. Start Backend
```bash
cd prompt-refinery-backend
npm install
npm run db:migrate
npm run dev
```

### 2. Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "organizationName": "Test Org",
    "organizationSlug": "test-org"
  }'
```

### 3. Start Frontend
```bash
cd prompt-refinery
npm run dev
```

### 4. In Frontend, test registration flow
- Go to Settings
- Click "Create Organization"
- Fill in form and submit
- Should see JWT token in localStorage

### 5. Test Optimization
- After login, go to Single View
- Enter text
- Select provider
- Click Optimize
- Should call backend API

## Migration Path

### Week 1: Backend Setup
- [ ] Set up database (PostgreSQL)
- [ ] Deploy backend to staging
- [ ] Test all endpoints with postman/curl

### Week 2: Integration Phase 1
- [ ] Add auth service to frontend
- [ ] Update Settings for login/registration
- [ ] Test full auth flow

### Week 3: Integration Phase 2
- [ ] Update optimization endpoints
- [ ] Migrate batch processing
- [ ] Update dashboard/history

### Week 4: Cleanup & Testing
- [ ] Remove old localStorage persistence
- [ ] Remove direct LLM provider calls from frontend
- [ ] Full end-to-end testing
- [ ] Deploy to production

## Breaking Changes for Users

When deploying this integration:

1. **API Keys stored securely** - Users won't see API keys in frontend
2. **Single sign-in** - Users login with email/password, not API keys
3. **Shared organization** - Multiple team members can access same org's history
4. **Usage limits** - Monthly limits enforced by subscription
5. **No localStorage for keys** - Better security

## Rollback Plan

If integration fails:
1. Keep old `llmService.ts` in separate branch
2. Can revert to local mode by updating `.env` in frontend
3. Backend can run in read-only mode (no state changes)
4. User data safely in PostgreSQL, can be exported

## Performance Expectations

- **Auth endpoints**: <100ms (network only)
- **Optimization endpoint**: 1-3s (same as direct LLM call, just routed through server)
- **History endpoint**: <200ms (database query)

No performance degradation since backend just passes through to LLM providers.

## Next Opportunities

After basic integration complete:
1. Add user management endpoints (invite colleagues)
2. Add organization settings (API keys per org)
3. Add usage analytics dashboard
4. Add team collaboration features
5. Add export/download functionality
