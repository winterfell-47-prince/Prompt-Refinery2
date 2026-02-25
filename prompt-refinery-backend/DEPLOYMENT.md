# Deployment Guide

Complete guide for deploying Prompt Refinery Backend to production environments.

## Pre-Deployment Checklist

- [ ] TypeScript builds without errors: `npm run build`
- [ ] All environment variables configured in production
- [ ] PostgreSQL database initialized with migrations
- [ ] JWT_SECRET changed to secure random value (32+ characters)
- [ ] All API keys for LLM providers obtained and configured
- [ ] Stripe keys configured (if billing enabled)
- [ ] HTTPS/TLS certificate obtained
- [ ] CORS origins configured for frontend domain
- [ ] Database backups configured
- [ ] Monitoring/logging service configured

## Environment Setup

### Production Environment Variables

Create `.env.production`:

```env
# Server
NODE_ENV=production
PORT=5000

# Database - Use managed PostgreSQL service
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/prompt_refinery_prod
DB_POOL_SIZE=20
DB_POOL_IDLE_TIMEOUT=10000

# JWT Authentication
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=https://app.promptrefinery.com

# LLM Providers
GEMINI_API_KEY=<your-gemini-key>
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
DEEPSEEK_API_KEY=<your-deepseek-key>

# Stripe
STRIPE_SECRET_KEY=<your-stripe-secret>
STRIPE_PUBLISHABLE_KEY=<your-stripe-public>

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Generate Secure JWT Secret

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (using PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

## Local Production Testing

Test the production build locally before deploying:

```bash
# Build
npm run build

# Create .env.production with test values
cp .env.example .env.production

# Run migrations
DATABASE_URL=postgresql://... npm run db:migrate

# Start production server
NODE_ENV=production npm start
```

Visit `http://localhost:5000/health` to verify.

## Docker Deployment

### Create Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Build and Test Docker Image

```bash
# Build
docker build -t prompt-refinery-backend:latest .

# Run locally
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/db \
  -e JWT_SECRET=your-secret \
  prompt-refinery-backend:latest
```

## Cloud Deployment Options

### Option 1: AWS ECS + RDS

**Architecture:**
- ECS Fargate for containerized compute (auto-scaling)
- RDS PostgreSQL for managed database
- RDS Proxy for connection pooling
- ElastiCache for caching (optional)
- CloudFront for CDN (optional)

**Setup Steps:**

```bash
# 1. Create RDS PostgreSQL instance
# - db.t3.micro free tier (~$0.01/hour)
# - Multi-AZ for production
# - 20GB gp2 storage

# 2. Create VPC/Security Groups
# - Allow traffic from ECS to RDS (port 5432)
# - Allow traffic from ALB to ECS (port 5000)

# 3. Create ECR repository
aws ecr create-repository --repository-name prompt-refinery-backend

# 4. Push Docker image
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin [account].dkr.ecr.us-east-1.amazonaws.com

docker tag prompt-refinery-backend:latest \
  [account].dkr.ecr.us-east-1.amazonaws.com/prompt-refinery-backend:latest

docker push [account].dkr.ecr.us-east-1.amazonaws.com/prompt-refinery-backend:latest

# 5. Create ECS Cluster & Task Definition
# See CloudFormation template in aws/ecs.yml

# 6. Create Application Load Balancer
# - Target group: ECS service on port 5000
# - Health check: /health
# - SSL/TLS certificate for HTTPS

# 7. Run database migrations
# Connect to ECS task and run:
DATABASE_URL=postgresql://... npm run db:migrate
```

**Estimated Costs (Monthly):**
- ECS Fargate: $15-30 (depending on task size)
- RDS PostgreSQL: $15-50 (db.t3.small)
- Data transfer: $0 (within AWS)
- ALB: $20-30
- **Total: ~$50-110/month**

### Option 2: Heroku

**Setup:**

```bash
# 1. Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login
heroku login

# 3. Create app
heroku create prompt-refinery-backend

# 4. Add PostgreSQL add-on
heroku addons:create heroku-postgresql:standard-0 -a prompt-refinery-backend
# Database URL auto-set to DATABASE_URL env var

# 5. Set environment variables
heroku config:set JWT_SECRET=your-secret -a prompt-refinery-backend
heroku config:set OPENAI_API_KEY=your-key -a prompt-refinery-backend
# ... other keys

# 6. Deploy
git push heroku main

# 7. Run migrations
heroku run npm run db:migrate -a prompt-refinery-backend

# 8. View logs
heroku logs --tail -a prompt-refinery-backend
```

**Estimated Costs (Monthly):**
- Hobby Dyno: Free tier (sleeping app)
- Standard 1X Dyno: $7/day (~$210/month)
- PostgreSQL: $50-200+ (hobby = free)
- **Total: ~$50-250/month**

### Option 3: DigitalOcean App Platform

**Setup:**

```bash
# 1. Create GitHub repository
git init
git add .
git commit -m "Initial commit"
git push origin main

# 2. Connect repo to DigitalOcean App Platform
# - Push button deploy from GitHub
# - Auto-detects Node.js
# - Runs build and start commands

# 3. Add PostgreSQL managed database
# - Configure in app.yaml

# 4. Set environment variables in dashboard
# DATABASE_URL will be auto-generated

# 5. Deploy on push to main
```

**app.yaml:**
```yaml
name: prompt-refinery-backend
services:
  - name: api
    github:
      repo: your-org/prompt-refinery-backend
      branch: main
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 5000
    envs:
      - key: NODE_ENV
        value: production
databases:
  - name: postgres
    engine: PG
    version: "14"
    production: true
```

**Estimated Costs (Monthly):**
- App Platform: $12/month (basic)
- PostgreSQL: $15-60/month (managed)
- **Total: ~$27-72/month**

## Production Monitoring

### Application Monitoring

```bash
# View deployment logs
heroku logs --tail  # Heroku
aws logs tail /ecs/prompt-refinery  # AWS ECS

# Monitor error rates
# Set up CloudWatch/Datadog alerts

# Database monitoring
# Monitor connection pool usage
# Alert on slow queries
```

### Metrics to Track

- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx responses)
- Database connection pool usage
- Token refresh rate
- LLM provider API usage/costs
- Subscription limit utilization

### Health Checks

```bash
# Endpoint: GET /health
curl https://api.promptrefinery.com/health

# Should return:
# { "status": "ok", "timestamp": "2024-01-15T..." }
```

## SSL/TLS Certificate

### Let's Encrypt (Free)

```bash
# Using Certbot on Linux server
certbot certonly --standalone -d api.promptrefinery.com

# Auto-renewal (runs daily)
sudo systemctl enable certbot.timer
```

### AWS Certificate Manager (Free)

```bash
# Create certificate in ACM console
# Select domain validation method (email or DNS)
# Add to ALB
```

## Database Backup Strategy

### Daily Automated Backups

**AWS RDS:**
- Automated backups enabled (35 day retention)
- Multi-AZ for high availability

**PostgreSQL (Manual):**
```bash
# Backup
pg_dump -h host -U user -d prompt_refinery > backup.sql

# Restore
psql -h host -U user -d prompt_refinery < backup.sql

# Schedule with cron
0 2 * * * pg_dump postgresql://user:pass@host/db > /backups/db_$(date +\%Y\%m\%d).sql
```

## Security Best Practices

### Secrets Management

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name prompt-refinery/jwt-secret \
  --secret-string "$(openssl rand -base64 32)"
```

**Environment-based (Simpler):**
```bash
# Use managed environment variables
# Never commit .env files to git
# .env.production not in repo
```

### Database Security

- Use VPC/private networks (no public IP)
- Enforce SSL connections
- Enable query logging for audit trail
- Regular backups to separate storage
- Point-in-time recovery enabled

### API Security

- HTTPS only (redirect HTTP → HTTPS)
- CORS configured for specific origins
- Rate limiting per IP/organization
- Request signing for sensitive operations
- Helmet.js security headers enabled

## Scaling Considerations

### Vertical Scaling (Handle More Requests)
1. Increase application container size (RAM/CPU)
2. Increase database connection pool
3. Upgrade database tier

### Horizontal Scaling (Handle More Concurrent Users)
1. Deploy multiple application instances
2. Use load balancer (ALB/NLB)
3. Use read replicas for database (read-only queries)
4. Add caching layer (Redis)

### Cost Optimization
1. Stop containers during off-hours
2. Use spot instances / preemptible VMs
3. Archive old optimization records
4. Compress logs and backups
5. Use global CDN (CloudFront/CloudFlare)

## Rollback Plan

```bash
# If deployment fails
# Heroku: heroku releases:rollback
# Docker: docker pull sha256:previous-image-hash && docker run ...
# Git: git revert commit-hash && git push

# Database migrations can't be rolled back automatically
# Manual steps needed:
# 1. Restore database from backup
# 2. Redeploy previous application version
```

## Post-Deployment Testing

```bash
# Test registration endpoint
curl -X POST https://api.promptrefinery.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{...}'

# Test optimization endpoint
curl -X POST https://api.promptrefinery.com/api/optimize \
  -H "Authorization: Bearer ..." \
  -H "Content-Type: application/json" \
  -d '{...}'

# Run integration tests
npm run test:e2e -- --url https://api.promptrefinery.com
```

## Maintenance

### Regular Tasks
- [ ] Review logs daily for errors
- [ ] Check LLM provider API usage/billing
- [ ] Update dependencies monthly: `npm outdated`
- [ ] Backup database weekly
- [ ] Test restore from backup monthly
