import { Request, Response, NextFunction } from "express";
import Supabase from "../model/supabase";

class AuthController {
  private supabase;

  constructor({ supabase }: { supabase: Supabase }) {
    this.supabase = supabase;
  }

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: "Authorization header is required",
        });
      }

      // Extract the JWT token from the Authorization header
      // Expected format: "Bearer <token>"
      const token = authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({ error: "Bearer token is missing" });
      }

      // Verify the JWT token and get user data
      const { data: { user }, error } = await this.supabase.supabase.auth
        .getUser(token);

      if (error) {
        console.error("Error verifying JWT token:", error.message);
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Attach the user object to the request for use in subsequent middleware/routes
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in getUser middleware:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  getUserWallet = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const { walletId } = req.params;

    if (!walletId) {
      return res.status(400).json({ error: "Wallet ID is required" });
    }

    const { data: walletOwners, error } = await this.supabase.getWalletOwners(
      walletId,
    );
    if (error && error.message.includes("invalid input syntax for type uuid")) {
      return res.status(403).json({
        error: "invalid input syntax for type uuid",
      });
    }
    if (error) {
      return res.status(500).json({ error: "Internal server error" });
    }

    const user = walletOwners.find((owner) => owner.user_id === userId);

    if (!user) {
      return res.status(403).json({
        error: "User does not have access to this wallet",
      });
    }

    req.walletId = walletId;
    req.userWalletRole = user.role;
    next();
  };
}

export default AuthController;
