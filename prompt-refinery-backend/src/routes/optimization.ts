import express, { Router, Response } from 'express';
import axios from 'axios';
import { query } from '../database/index.js';
import { config } from '../config.js';
import authMiddleware, { AuthRequest } from '../middleware/auth.js';

export const optimizeRouter = Router();
optimizeRouter.use(authMiddleware);

interface OptimizeBody {
  text: string;
  provider: string;
  strategy?: string;
  compressionLevel?: string;
  outputFormat?: string;
}

interface OptimizationResult {
  id: number;
  refinedText: string;
  originalTokens: number;
  refinedTokens: number;
  savingsPercentage: number;
}

// POST /api/optimize - Optimize text using selected provider
optimizeRouter.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, provider, strategy, compressionLevel, outputFormat } = req.body as OptimizeBody;

    if (!text || !provider) {
      return res.status(400).json({ error: 'Text and provider are required' });
    }

    // Check organization subscription limits
    const subResult = await query(
      'SELECT monthly_requests_limit, used_requests FROM subscriptions WHERE organization_id = $1',
      [req.user.organizationId]
    );

    if (subResult.rows.length === 0) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const subscription = subResult.rows[0];
    if (subscription.used_requests >= subscription.monthly_requests_limit) {
      return res.status(429).json({ error: 'Monthly request limit exceeded' });
    }

    // Get provider configuration
    const providerResult = await query(
      'SELECT api_key_encrypted, custom_endpoint, custom_model FROM provider_configs WHERE organization_id = $1 AND provider = $2 AND is_active = true',
      [req.user.organizationId, provider]
    );

    let providerConfig = providerResult.rows[0];

    // If no config, try to use global keys (for demo purposes)
    if (!providerConfig) {
      providerConfig = {
        api_key_encrypted: config[`${provider.toLowerCase()}Key` as keyof typeof config] as string,
        custom_endpoint: null,
        custom_model: null
      };
    }

    if (!providerConfig.api_key_encrypted) {
      return res.status(400).json({ error: `No API key configured for provider ${provider}` });
    }

    // Create optimization record
    const optResult = await query(
      `INSERT INTO optimizations 
       (organization_id, user_id, provider, strategy, compression_level, output_format, original_text, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [
        req.user.organizationId,
        req.user.userId,
        provider,
        strategy || 'UNIVERSAL',
        compressionLevel || 'medium',
        outputFormat || 'default',
        text,
        'processing'
      ]
    );

    const optimizationId = optResult.rows[0].id;

    // Call the LLM provider (this would call to frontend's llmService in production)
    // For now, mock the response
    let refinedText = text;
    let tokenSavings = Math.floor(text.split(/\s+/).length * 0.3); // Mock 30% reduction

    try {
      // Example: Call OpenAI API directly (in production, use unified llmService)
      if (provider === 'openai' && config.llmProviders.openai) {
        const openaiResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a business writing specialist. Optimize and refine the following text for clarity, conciseness, and impact.'
              },
              {
                role: 'user',
                content: text
              }
            ],
            temperature: 0.3,
            max_tokens: 2000
          },
          {
            headers: {
              'Authorization': `Bearer ${providerConfig.api_key_encrypted}`
            }
          }
        );

        refinedText = openaiResponse.data.choices[0].message.content;
      }
    } catch (apiError) {
      console.error('LLM API error:', apiError);
      await query(
        'UPDATE optimizations SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', 'LLM API call failed', optimizationId]
      );
      return res.status(500).json({ error: 'Failed to optimize text' });
    }

    // Calculate token counts
    const originalTokens = Math.ceil(text.split(/\s+/).length / 1.3); // Rough estimate
    const refinedTokens = Math.ceil(refinedText.split(/\s+/).length / 1.3);
    const savingsPercentage = ((originalTokens - refinedTokens) / originalTokens) * 100;

    // Update optimization record
    await query(
      `UPDATE optimizations 
       SET refined_text = $1, original_tokens = $2, refined_tokens = $3, 
           savings_percentage = $4, status = $5, completed_at = NOW()
       WHERE id = $6`,
      [refinedText, originalTokens, refinedTokens, Math.max(0, savingsPercentage), 'completed', optimizationId]
    );

    // Increment usage
    await query(
      'UPDATE subscriptions SET used_requests = used_requests + 1 WHERE organization_id = $1',
      [req.user.organizationId]
    );

    res.json({
      id: optimizationId,
      refinedText,
      originalTokens,
      refinedTokens,
      savingsPercentage: Math.max(0, savingsPercentage)
    } as OptimizationResult);
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ error: 'Optimization failed' });
  }
});

// GET /api/optimize/history - Get optimization history for organization
optimizeRouter.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await query(
      `SELECT id, provider, original_tokens, refined_tokens, savings_percentage, status, created_at
       FROM optimizations
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.organizationId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default optimizeRouter;
