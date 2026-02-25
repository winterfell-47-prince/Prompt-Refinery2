import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/index.js';
import { config } from '../config.js';

export const authRouter = Router();

export default authRouter;

interface RegisterBody {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
  organizationSlug: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface TokenResponse {
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

// Register new organization and user
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, organizationName, organizationSlug } = req.body as RegisterBody;

    // Validate inputs
    if (!email || !password || !organizationName || !organizationSlug) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create organization
    const orgResult = await query(
      'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug',
      [organizationName, organizationSlug]
    );
    const organizationId = orgResult.rows[0].id;

    // Create user
    const userResult = await query(
      'INSERT INTO users (organization_id, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role',
      [organizationId, email, passwordHash, fullName, 'admin']
    );
    const user = userResult.rows[0];

    // Create free tier subscription
    await query(
      'INSERT INTO subscriptions (organization_id, plan, monthly_requests_limit) VALUES ($1, $2, $3)',
      [organizationId, 'free', 1000]
    );

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, organizationId, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, organizationId },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        organizationId,
        role: user.role
      }
    } as TokenResponse);
  } catch (error) {
    console.error('Registration error:', error);
    if ((error as any).code === '23505') {
      return res.status(409).json({ error: 'Email or organization slug already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await query(
      'SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.organization_id FROM users u WHERE u.email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, organizationId: user.organization_id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, organizationId: user.organization_id },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        organizationId: user.organization_id,
        role: user.role
      }
    } as TokenResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh token
authRouter.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

    const accessToken = jwt.sign(
      { userId: decoded.userId, organizationId: decoded.organizationId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default authRouter;
