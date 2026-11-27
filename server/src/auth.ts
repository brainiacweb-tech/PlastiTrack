import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export type AuthPayload = {
  userId: string;
  role: Role;
  email: string;
  region: string | null;
  collectionPartnerId: string | null;
  recyclingCompanyId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET ?? "", { expiresIn: "8h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET ?? "") as AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: "Your session is invalid or has expired." });
  }
}

export function allowRoles(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({ error: "You do not have permission to perform this action." });
      return;
    }
    next();
  };
}
