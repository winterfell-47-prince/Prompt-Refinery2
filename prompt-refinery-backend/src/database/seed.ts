import { query } from './index.js';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    // Clear existing data
    await query('TRUNCATE TABLE subscriptions CASCADE');
    await query('TRUNCATE TABLE batch_items CASCADE');
    await query('TRUNCATE TABLE batch_jobs CASCADE');
    await query('TRUNCATE TABLE optimizations CASCADE');
    await query('TRUNCATE TABLE provider_configs CASCADE');
    await query('TRUNCATE TABLE api_keys CASCADE');
    await query('TRUNCATE TABLE users CASCADE');
    await query('TRUNCATE TABLE organizations CASCADE');

    console.log('📋 Starting database seed...');

    // Create test organizations
    const org1Result = await query(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
      ['Acme Corporation', 'acme-corp']
    );
    const org1Id = org1Result.rows[0].id;

    const org2Result = await query(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
      ['TechStartup Inc', 'tech-startup']
    );
    const org2Id = org2Result.rows[0].id;

    // Create test users
    const passwordHash = await bcrypt.hash('password123', 10);

    await query(
      'INSERT INTO users (organization_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
      [org1Id, 'admin@acme.com', passwordHash, 'Jane Doe', 'admin']
    );

    await query(
      'INSERT INTO users (organization_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
      [org1Id, 'user@acme.com', passwordHash, 'John Smith', 'user']
    );

    await query(
      'INSERT INTO users (organization_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
      [org2Id, 'admin@techstartup.com', passwordHash, 'Bob Johnson', 'admin']
    );

    // Create subscriptions
    await query(
      'INSERT INTO subscriptions (organization_id, plan, monthly_requests_limit, used_requests) VALUES ($1, $2, $3, $4)',
      [org1Id, 'pro', 10000, 254]
    );

    await query(
      'INSERT INTO subscriptions (organization_id, plan, monthly_requests_limit, used_requests) VALUES ($1, $2, $3, $4)',
      [org2Id, 'free', 1000, 87]
    );

    // Create provider configs
    await query(
      'INSERT INTO provider_configs (organization_id, provider, api_key_encrypted, is_active) VALUES ($1, $2, $3, $4)',
      [org1Id, 'openai', 'sk-test-key-encrypted', true]
    );

    await query(
      'INSERT INTO provider_configs (organization_id, provider, api_key_encrypted, is_active) VALUES ($1, $2, $3, $4)',
      [org1Id, 'anthropic', 'claude-test-key-encrypted', true]
    );

    // Create sample optimizations
    const optResult = await query(
      `INSERT INTO optimizations 
       (organization_id, user_id, provider, strategy, compression_level, 
        original_text, refined_text, original_tokens, refined_tokens, 
        savings_percentage, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id`,
      [
        org1Id,
        1,
        'openai',
        'UNIVERSAL',
        'medium',
        'This is a long and verbose prompt that could be improved for clarity and conciseness.',
        'Improve this verbose prompt for clarity and conciseness.',
        15,
        8,
        46.7,
        'completed'
      ]
    );

    // Create batch job
    const batchResult = await query(
      'INSERT INTO batch_jobs (organization_id, user_id, name, status, total_items, completed_items) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [org1Id, 1, 'Q4 Prompt Optimization', 'completed', 50, 50]
    );

    const batchId = batchResult.rows[0].id;

    // Add batch items
    await query(
      'INSERT INTO batch_items (batch_job_id, optimization_id, status) VALUES ($1, $2, $3)',
      [batchId, optResult.rows[0].id, 'completed']
    );

    console.log('✅ Database seed completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('  Organization 1: acme-corp');
    console.log('    - Admin: admin@acme.com / password123');
    console.log('    - User: user@acme.com / password123');
    console.log('  Organization 2: tech-startup');
    console.log('    - Admin: admin@techstartup.com / password123');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedDatabase();
