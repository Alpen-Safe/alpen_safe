import { body } from "express-validator";
import BaseController from "./baseController.ts";
import { Next, Request, Response } from "express";
import WalletManager from "../model/wallet/walletManager.ts";

class AdminController extends BaseController {
  private walletManager: WalletManager;
  constructor({ walletManager }: { walletManager: WalletManager }) {
    super();
    this.walletManager = walletManager;
  }

  signTransactionWithServerValidator = [
    body("walletId").exists().isString(),
    body("psbtBase64").exists().isString(),
  ];

  getAdmin = (req: Request, res: Response, next: Next) => {
    console.log("admin router used");
    next();
  };

  signTransactionWithServer = (req: Request, res: Response) => {
    const func = () => {
      const { walletId, psbtBase64 } = req.body;

      return this.walletManager.signTransactionWithServer(walletId, psbtBase64);
    };

    return this.execController(req, res, func);
  };
}

export default AdminController;
