import { query } from './index.js';

const schema = `
-- Organizations (Companies)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- API Keys for organizations
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- LLM Provider Configuration per Organization
CREATE TABLE IF NOT EXISTS provider_configs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  api_key_encrypted VARCHAR(500),
  custom_endpoint VARCHAR(500),
  custom_model VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, provider)
);

-- Optimization Requests
CREATE TABLE IF NOT EXISTS optimizations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  provider VARCHAR(50) NOT NULL,
  strategy VARCHAR(100),
  compression_level VARCHAR(50),
  output_format VARCHAR(50),
  original_text TEXT NOT NULL,
  refined_text TEXT,
  original_tokens INTEGER,
  refined_tokens INTEGER,
  savings_percentage DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Batch Jobs
CREATE TABLE IF NOT EXISTS batch_jobs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Batch Job Items
CREATE TABLE IF NOT EXISTS batch_items (
  id SERIAL PRIMARY KEY,
  batch_job_id INTEGER NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  optimization_id INTEGER REFERENCES optimizations(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT
);

-- Organization Subscriptions (for Billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'free',
  stripe_subscription_id VARCHAR(255),
  monthly_requests_limit INTEGER DEFAULT 1000,
  used_requests INTEGER DEFAULT 0,
  billing_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_org ON optimizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_user ON optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_created ON optimizations(created_at);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_org ON batch_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
`;

async function runMigration() {
  try {
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await query(statement);
      }
    }
    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
