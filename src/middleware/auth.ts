import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: {
    id: number;
    uid: string;
    email: string;
    displayName: string;
    role: string;
  };
}

function getConfiguredAdminEmails(): string[] {
  const envEmails = (process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (envEmails.length > 0) {
    return envEmails;
  }
  return ['nuk.cs57@gmail.com'];
}

export async function syncFirebaseUser(decoded: DecodedIdToken) {
  const email = (decoded.email || '').trim().toLowerCase();
  const displayName = (decoded.name || email.split('@')[0] || 'Admin').slice(0, 120);
  const adminEmails = getConfiguredAdminEmails();

  try {
    const existingAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);

    const isDesignatedAdmin =
      (email !== '' && adminEmails.includes(email)) || existingAdmins.length === 0;

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, decoded.uid))
      .limit(1);

    const roleToStore =
      existing[0]?.role === 'admin' || isDesignatedAdmin ? 'admin' : 'viewer';

    const [record] = await db
      .insert(users)
      .values({
        uid: decoded.uid,
        email: email || `${decoded.uid}@user.local`,
        displayName,
        role: roleToStore,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || `${decoded.uid}@user.local`,
          displayName,
          role: roleToStore,
        },
      })
      .returning();

    return record;
  } catch (error) {
    console.error('Failed to sync authenticated user to PostgreSQL:', error);
    throw new Error('ไม่สามารถตรวจสอบข้อมูลบัญชีผู้ใช้งานได้', { cause: error });
  }
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'กรุณาเข้าสู่ระบบผู้ดูแลเว็บไซต์ก่อนทำรายการ' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const dbUser = await syncFirebaseUser(decoded);
    if (dbUser.role !== 'admin') {
      res.status(403).json({
        error: 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของเว็บไซต์',
      });
      return;
    }
    req.user = decoded;
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Firebase token verification failed:', error);
    res.status(401).json({
      error: 'เซสชันหมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
    });
  }
}
