import { Request, Response, NextFunction } from "express";
import { z } from "zod";

type ValidateSource = 'body' | 'query' | 'params';

export const validate =
  (schema: z.ZodObject<z.ZodRawShape> | z.ZodOptional<z.ZodObject<z.ZodRawShape>>, source: ValidateSource = 'body') =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const validated = await schema.parseAsync(dataToValidate);
      
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        (req as Request & { validatedQuery: unknown }).validatedQuery = validated;
      } else {
        (req as Request & { validatedParams: unknown }).validatedParams = validated;
      }
      
      next();
    } catch (error) {
      let err = error;
      if (err instanceof z.ZodError) {
        err = err.issues.map((e) => ({ path: e.path[0], message: e.message }));
      }
      return res.status(409).json({
        status: "failed",
        error: err,
      });
    }
  };
