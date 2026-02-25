// Type definitions for Prompt Refinery Backend

// ============================================================================
// Authentication Types
// ============================================================================

export interface JWTPayload {
  userId: number;
  organizationId: number;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: number;
  organization_id: number;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// API Key & Provider Configuration Types
// ============================================================================

export interface APIKey {
  id: number;
  organization_id: number;
  name: string;
  key_hash: string;
  last_used_at: Date | null;
  created_at: Date;
}

export interface ProviderConfig {
  id: number;
  organization_id: number;
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'custom';
  api_key_encrypted: string | null;
  custom_endpoint?: string;
  custom_model?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Optimization Types
// ============================================================================

export interface Optimization {
  id: number;
  organization_id: number;
  user_id: number;
  provider: string;
  strategy: 'UNIVERSAL' | 'GPT' | 'CLAUDE' | 'DEEPSEEK' | 'LEGAL';
  compression_level: 'low' | 'medium' | 'high';
  output_format: 'default' | 'markdown' | 'json';
  original_text: string;
  refined_text: string | null;
  original_tokens: number | null;
  refined_tokens: number | null;
  savings_percentage: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface OptimizeRequest {
  text: string;
  provider: string;
  strategy?: string;
  compressionLevel?: string;
  outputFormat?: string;
}

export interface OptimizeResponse {
  id: number;
  refinedText: string;
  originalTokens: number;
  refinedTokens: number;
  savingsPercentage: number;
}

// ============================================================================
// Batch Processing Types
// ============================================================================

export interface BatchJob {
  id: number;
  organization_id: number;
  user_id: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: Date;
  completed_at: Date | null;
}

export interface BatchItem {
  id: number;
  batch_job_id: number;
  optimization_id: number | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
}

// ============================================================================
// Subscription & Billing Types
// ============================================================================

export interface Subscription {
  id: number;
  organization_id: number;
  plan: 'free' | 'pro' | 'enterprise';
  stripe_subscription_id: string | null;
  monthly_requests_limit: number;
  used_requests: number;
  billing_date: Date | null;
  status: 'active' | 'cancelled' | 'past_due';
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Request/Response Envelopes
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Authentication Endpoints
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationSlug: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    organizationId: number;
    role: string;
  };
  expiresIn?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  details?: ValidationError[];
  requestId?: string;
}

// ============================================================================
// Database Query Result Types
// ============================================================================

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
  command: string;
}

export interface TransactionContext {
  client: any; // PoolClient
  query: (sql: string, params?: any[]) => Promise<QueryResult<any>>;
}
