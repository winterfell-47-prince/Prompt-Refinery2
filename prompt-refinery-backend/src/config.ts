export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/prompt_refinery'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiry: process.env.JWT_EXPIRY || '24h'
  },
  llmProviders: {
    gemini: process.env.GEMINI_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    deepseek: process.env.DEEPSEEK_API_KEY || ''
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
  }
};
