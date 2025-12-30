import { Request, Response } from 'express';
import {
  createUser,
  findUserByEmail,
  comparePassword,
  generateToken,
  getUserById,
} from '../services/authService';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    res.status(400).json({ error: 'User with this email already exists' });
    return;
  }

  // Create new user
  const user = await createUser(email, password, name);
  const token = generateToken({ id: user.id, email: user.email });

  res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    },
    token,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // Generate token
  const token = generateToken({ id: user.id, email: user.email });

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    },
    token,
  });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  // But we can add token blacklisting here if needed
  res.json({ message: 'Logout successful' });
});

