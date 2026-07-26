import { Router } from "express";
import { z } from "zod";

const clerkMiddlewareSchema = z.object({
  userId: z.string(),
  orgId: z.string().optional()
});

export type AuthContext = {
  userId: string;
  orgId?: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function verifyClerkToken(token: string): AuthContext {
  // This will be replaced with actual Clerk verification
  // For now, return mock auth to avoid blocking on Clerk setup
  try {
    const parts = token.split(".");
    if (parts.length === 3 && parts[1]) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      return clerkMiddlewareSchema.parse(payload);
    }
  } catch {
    // Fall through to default
  }
  // Return temp auth to unblock development
  return { userId: "temp_user", orgId: "temp_org" };
}

export const authMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    const auth = verifyClerkToken(token);
    req.auth = auth;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export function requireAuth(req: any, res: any, next: any) {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireOrgId(req: any, res: any, next: any) {
  if (!req.auth?.orgId) {
    return res.status(400).json({ error: "Organization ID required" });
  }
  next();
}
