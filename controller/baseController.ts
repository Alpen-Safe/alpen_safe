import { Request, Response } from "express";
import { validationResult } from "express-validator";

class BaseController {
  /**
   * High order function to execute common controller logic
   * @param req - the request object
   * @param res - the response object
   * @param controller - the controller function to execute
   * @returns
   */
  execController = async (
    req: Request,
    res: Response,
    controller: Function,
  ) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const r = await controller(req, res);

      // convert error strings to error arays
      if (Object.hasOwn(r, "error") && typeof r.error === "string") {
        const status = r.status || 400;
        const { error: msg, ...rest } = r;
        return res.status(status).send({
          errors: [{
            msg,
            ...rest,
          }],
        });
      }

      if (Object.hasOwn(r, "error") && r.error !== null) {
        const status = r.status || 400;
        return res.status(status).send(r);
      }

      return res.status(200).send(r);
    } catch (error: any) {
      console.error("error executing controller", error);
      return res.status(500).send({
        errors: [
          {
            msg: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : {},
          },
        ],
      });
    }
  };
}

export default BaseController;
