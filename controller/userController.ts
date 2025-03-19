import { Next, Request, Response } from "express";

class UserController {
  constructor() {
  }

  getUser = (req: Request, res: Response, next: Next) => {
    console.log(`User router used: ${req.method} ${req.originalUrl}`);
    next();
  };
}

export default UserController;
