import { Router } from "express";
import { getMiddlewareFromController } from "../middlewares/getMiddlewareFromController";
import { authControllerInstanse } from "../controllers/auth.controller";
import { validateLoginSchema, validateRegisterSchema } from "../../../types/auth";
import { authMiddleware } from "../middlewares/authMiddleware";

const authRouter = Router();

function getMiddleware(method: keyof typeof authControllerInstanse) {
  return getMiddlewareFromController(authControllerInstanse, method);
}

authRouter.post("/register", validateRegisterSchema, getMiddleware("register"));
authRouter.post("/login", validateLoginSchema, getMiddleware("login"));

export { authRouter };
