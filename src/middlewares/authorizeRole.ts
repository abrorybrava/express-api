import { Request, Response, NextFunction } from "express";

export const authorizeRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user; // Ambil user dari request

    if (!user) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    // Jika `roles` adalah string, ubah jadi array agar bisa dibandingkan dengan `includes`
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: You do not have permission to perform this action." });
    }

    next();
  };
};
