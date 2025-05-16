import BaseController from "./baseController";
import WalletManager from "../model/wallet/walletManager";
import { body } from "express-validator";
import { Request, Response } from "express";

class WalletController extends BaseController {
  private walletManager: WalletManager;

  constructor({ walletManager }: { walletManager: WalletManager }) {
    super();
    this.walletManager = walletManager;
  }

  userIsAdmin = (req: Request, res: Response) => {
    const userRole = req.userWalletRole as string;

    // TODO: Add more roles and centralize this logic
    if (userRole !== "admin") {
      return res.status(403).json({
        error: "User is not an admin",
      });
    }
  };

  createWalletValidator = [
    body("walletName").exists().isString(),
    body("userXPubs").exists().isArray({ min: 2, max: 2 }).withMessage(
      "userXPubs must be an array of 2 elements",
    ),
    body("userXPubs.*.xpub").exists().isString().withMessage(
      "xpub must be a string",
    ),
    body("userXPubs.*.path").exists().isString().withMessage(
      "path must be a string",
    ),
    body("userXPubs.*.device").exists().isString().withMessage(
      "device must be a string",
    ),
    body("userXPubs.*.masterFingerprint").optional({ nullable: true }).isString().withMessage(
      "masterFingerprint must be a string",
    ),
    body("userXPubs.*.label").optional({ nullable: true }).isString()
      .withMessage(
        "label must be a string or null",
    ),

  ];

  create2Of3Wallet = (req: Request, res: Response) => {
    const func = () => {
      const userId = req.user?.id as string;
      const { walletName, userXPubs } = req.body;

      return this.walletManager.createTwoOfThreeWallet(
        userId,
        walletName,
        userXPubs,
      );
    };

    return this.execController(req, res, func);
  };

  deriveWalletAddressesValidator = [
    body("count").exists().isInt({ min: 1, max: 100 }),
  ];

  deriveWalletAddresses = (req: Request, res: Response) => {
    const func = () => {
      const walletId = req.walletId as string;
      const { count } = req.body;

      return this.walletManager.deriveAddresses(walletId, count, false);
    };

    return this.execController(req, res, func);
  };

  handoutAddressesValidator = [
    body("isChange").exists().isBoolean(),
    body("amount").exists().isInt({ min: 1, max: 100 }),
  ];

  handoutAddresses = (req: Request, res: Response) => {
    const func = () => {
      const walletId = req.walletId as string;
      const { isChange, amount } = req.body;

      return this.walletManager.handoutAddresses(walletId, isChange, amount);
    };

    return this.execController(req, res, func);
  };

  
  initiateSpendTransactionValidator = [
    body("receivers").exists().isArray().isLength({ min: 1 }).withMessage(
      "receivers must be an array of at least 1 element",
    ),
    body("receivers.*.address").exists().isString().withMessage(
      "receivers.*.address must be a string",
    ),
    body("receivers.*.value").exists().isInt({ min: 546 }).toInt().withMessage(
      "receivers.*.value must be an integer greater than 546",
    ),
    body("receivers.*.label").optional({ nullable: true }).isString()
      .withMessage(
        "label must be a string or null",
      ),
    body("feePerByte").exists().isInt({ min: 1 }).toInt().withMessage(
      "feePerByte must be an integer greater than 0",
    ),
  ];

  initiateSpendTransaction = (req: Request, res: Response) => {
    const func = () => {
      const walletId = req.walletId as string;
      const initiatedBy = req.user?.id as string;

      const error = this.userIsAdmin(req, res);
      if (error) {
        return error;
      }

      const { receivers, feePerByte } = req.body;

      return this.walletManager.initiateSpendTransaction(walletId, receivers, feePerByte, initiatedBy);
    };

    return this.execController(req, res, func);
  };

  addLedgerPolicyValidator = [
    body("masterFingerprint").exists().isString().withMessage(
      "masterFingerprint must be a string",
    ),
    body("policyIdHex").exists().isString().withMessage(
      "policyIdHex must be a string",
    ),
    body("policyHmacHex").exists().isString().withMessage(
      "policyHmacHex must be a string",
    ),
  ];

  addLedgerPolicy = (req: Request, res: Response) => {
    const func = () => {
      const walletId = req.walletId as string;

      const error = this.userIsAdmin(req, res);
      if (error) {
        return error;
      }

      const { masterFingerprint, policyIdHex, policyHmacHex } = req.body;

      return this.walletManager.addLedgerPolicy(walletId, masterFingerprint, policyIdHex, policyHmacHex);
    };

    return this.execController(req, res, func);
  };

  submitPartialSignaturesValidator = [
    body("unsignedTransactionId").exists().isString().withMessage(
      "unsignedTransactionId must be a string",
    ),
    body("masterFingerprint").exists().isString().withMessage(
      "masterFingerprint must be a string",
    ),
    body("partialSignatures").exists().isArray().withMessage(
      "partialSignatures must be an array",
    ),
    body("partialSignatures.*.signature").exists().isString().withMessage(
      "partialSignatures.*.signature must be a string",
    ),
    body("partialSignatures.*.inputIndex").exists().isInt({ min: 0 }).toInt().withMessage(
      "partialSignatures.*.index must be an integer greater than 0",
    ),
    body("partialSignatures.*.pubkey").exists().isString().withMessage(
      "partialSignatures.*.pubkey must be a string",
    ),
    body("partialSignatures.*.tapleafHash").optional({ nullable: true }).isString().withMessage(
      "partialSignatures.*.tapleafHash must be a string",
    ),
  ];

  submitPartialSignatures = (req: Request, res: Response) => {
    const func = () => {
      const { unsignedTransactionId, masterFingerprint, partialSignatures } = req.body;

      const error = this.userIsAdmin(req, res);
      if (error) {
        return error;
      }
  
      return this.walletManager.submitPartialSignatures(unsignedTransactionId, masterFingerprint, partialSignatures);
    };

    return this.execController(req, res, func);
  };

}

export default WalletController;
