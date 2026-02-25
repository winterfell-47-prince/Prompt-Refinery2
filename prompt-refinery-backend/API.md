# Prompt Refinery Backend API Documentation

Complete API reference for the Prompt Refinery SaaS Backend.

## Base URL
```
http://localhost:5000
```

## Error Responses

All error responses use standard HTTP status codes and return JSON:

```json
{
  "error": "Error message",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Common Status Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Authentication API

### Register New Organization

Creates a new organization with an admin user account.

**Endpoint:** `POST /api/auth/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!",
    "fullName": "Jane Doe",
    "organizationName": "Acme Corporation",
    "organizationSlug": "acme-corp"
  }'
```

**JavaScript/TypeScript:**
```typescript
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@company.com',
    password: 'SecurePassword123!',
    fullName: 'Jane Doe',
    organizationName: 'Acme Corporation',
    organizationSlug: 'acme-corp'
  })
});

const { accessToken, refreshToken, user } = await response.json();
localStorage.setItem('accessToken', accessToken);
```

**Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "fullName": "Jane Doe",
    "organizationId": 1,
    "role": "admin"
  }
}
```

**Validation Rules:**
- `email` - Must be valid email address, unique per organization
- `password` - Minimum 8 characters
- `fullName` - Required, max 255 characters
- `organizationName` - Required, max 255 characters
- `organizationSlug` - Must be unique, lowercase alphanumeric + hyphens

**Error Example:**
```json
{
  "error": "Email or organization slug already exists"
}
```

---

### Login

Authenticate with email and password to get tokens.

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePassword123!"
  }'
```

**JavaScript/TypeScript:**
```typescript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@company.com',
    password: 'SecurePassword123!'
  })
});

const data = await response.json();
if (response.ok) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "fullName": "Jane Doe",
    "organizationId": 1,
    "role": "admin"
  }
}
```

---

### Refresh Token

Get a new access token using your refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**JavaScript/TypeScript:**
```typescript
const response = await fetch('http://localhost:5000/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

const { accessToken } = await response.json();
localStorage.setItem('accessToken', accessToken);
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error (401):**
```json
{
  "error": "Invalid refresh token"
}
```

---

## Optimization API

### Optimize Text

Optimize a prompt using the specified LLM provider.

**Endpoint:** `POST /api/optimize`

**Authentication:** Required (Bearer Token)

**Request:**
```bash
curl -X POST http://localhost:5000/api/optimize \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Write a comprehensive guide on machine learning fundamentals covering neural networks, deep learning, and practical applications for enterprise systems.",
    "provider": "openai",
    "strategy": "UNIVERSAL",
    "compressionLevel": "medium",
    "outputFormat": "default"
  }'
```

**JavaScript/TypeScript:**
```typescript
const response = await fetch('http://localhost:5000/api/optimize', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: 'Your prompt text...',
    provider: 'openai',
    strategy: 'UNIVERSAL',
    compressionLevel: 'medium'
  })
});

const optimization = await response.json();
console.log(`Savings: ${optimization.savingsPercentage.toFixed(1)}%`);
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| text | string | Yes | Prompt text to optimize (1-5000 characters) |
| provider | string | Yes | LLM provider: `openai`, `anthropic`, `deepseek`, `gemini`, `custom` |
| strategy | string | No | Optimization strategy: `UNIVERSAL`, `GPT`, `CLAUDE`, `DEEPSEEK`, `LEGAL` (default: `UNIVERSAL`) |
| compressionLevel | string | No | Compression level: `low`, `medium`, `high` (default: `medium`) |
| outputFormat | string | No | Output format: `default`, `markdown`, `json` (default: `default`) |

**Response (200 OK):**
```json
{
  "id": 42,
  "refinedText": "Comprehensive ML fundamentals guide: neural networks, deep learning, enterprise applications.",
  "originalTokens": 28,
  "refinedTokens": 19,
  "savingsPercentage": 32.1
}
```

**Error Examples:**

Missing required fields (400):
```json
{
  "error": "Text and provider are required"
}
```

Request limit exceeded (429):
```json
{
  "error": "Monthly request limit exceeded"
}
```

Provider not configured (400):
```json
{
  "error": "No API key configured for provider openai"
}
```

---

### Get Optimization History

Retrieve all optimizations for the authenticated user's organization.

**Endpoint:** `GET /api/optimize/history`

**Authentication:** Required (Bearer Token)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page (1-100) |
| offset | number | 0 | Pagination offset |

**Request:**
```bash
curl -X GET "http://localhost:5000/api/optimize/history?limit=10&offset=0" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript/TypeScript:**
```typescript
const response = await fetch(
  'http://localhost:5000/api/optimize/history?limit=10',
  {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  }
);

const history = await response.json();
history.forEach(optimization => {
  console.log(`${optimization.provider}: ${optimization.savings_percentage}% saved`);
});
```

**Response (200 OK):**
```json
[
  {
    "id": 42,
    "provider": "openai",
    "original_tokens": 28,
    "refined_tokens": 19,
    "savings_percentage": 32.1,
    "status": "completed",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 41,
    "provider": "anthropic",
    "original_tokens": 156,
    "refined_tokens": 98,
    "savings_percentage": 37.2,
    "status": "completed",
    "created_at": "2024-01-15T09:15:00Z"
  }
]
```

---

## Authentication Headers

All protected endpoints require the `Authorization` header with a Bearer token:

```
Authorization: Bearer <accessToken>
```

**Example with all request methods:**

```bash
# GET request
curl -H "Authorization: Bearer ..token.." http://localhost:5000/api/optimize/history

# POST request  
curl -X POST \
  -H "Authorization: Bearer ..token.." \
  -H "Content-Type: application/json" \
  -d '{...}' \
  http://localhost:5000/api/optimize

# Headers in JavaScript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

---

## Rate Limiting

### Per-Organization Limits
- **Free Plan**: 1,000 requests/month
- **Pro Plan**: 10,000 requests/month
- **Enterprise**: Custom limits

Usage is tracked and reset on the 1st of each month.

### HTTP Responses
When approaching limits:
- Header: `X-RateLimit-Remaining: 10`
- Header: `X-RateLimit-Reset: 1705276800`

When limit exceeded:
```json
{
  "error": "Monthly request limit exceeded",
  "remaining": 0,
  "resetDate": "2024-02-01T00:00:00Z"
}
```

---

## Code Examples

### Complete Authentication Flow

**React/TypeScript Example:**
```typescript
import { useState } from 'react';

export function useAuthentication() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );

  async function register(data: {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    organizationSlug: string;
  }) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    if (response.ok) {
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      setToken(result.accessToken);
      return result.user;
    }
    throw new Error(result.error);
  }

  async function optimizePrompt(text: string, provider: string) {
    const response = await fetch('/api/optimize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        provider,
        compressionLevel: 'medium'
      })
    });

    if (!response.ok) throw new Error('Optimization failed');
    return response.json();
  }

  return { register, optimizePrompt, token };
}
```

---

## Webhooks (Planned)

Future versions will support webhooks for batch completion and billing events.

---

## Support

For issues or questions:
- Check the README.md for setup help
- Review server logs: `npm run dev` shows request details
- Verify JWT tokens: paste into https://jwt.io/
- Check database: `psql -d prompt_refinery -c "\dt"`
