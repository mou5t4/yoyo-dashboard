import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
import { DEFAULT_PASSWORD } from './constants';

const prisma = new PrismaClient();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createDefaultUser() {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { username: 'parent' },
    });

    if (existingUser) {
      return existingUser;
    }

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    
    const user = await prisma.user.create({
      data: {
        username: 'parent',
        password: hashedPassword,
        mustChangePassword: true,
        settings: {
          create: {
            deviceName: 'YoyoPod',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    logger.info('Default user created', { userId: user.id });
    return user;
  } catch (error) {
    logger.error('Failed to create default user', error);
    throw error;
  }
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<{ id: string; mustChangePassword: boolean } | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        password: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    return { id: user.id, mustChangePassword: user.mustChangePassword };
  } catch (error) {
    logger.error('Login verification failed', error);
    return null;
  }
}

export async function changePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  try {
    const hashedPassword = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    await logAuditEvent(userId, 'password_changed', {});
    logger.info('Password changed', { userId });
  } catch (error) {
    logger.error('Password change failed', error);
    throw error;
  }
}

export async function logAuditEvent(
  userId: string | null,
  action: string,
  details: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: JSON.stringify(details),
        ipAddress,
      },
    });
  } catch (error) {
    logger.error('Failed to log audit event', error);
  }
}

export async function getUser(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
      },
    });
  } catch (error) {
    logger.error('Failed to get user', error);
    return null;
  }
}

export { prisma };

