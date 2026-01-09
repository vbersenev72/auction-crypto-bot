import { Router } from "express";
import { getMiddlewareFromController } from "../middlewares/getMiddlewareFromController";
import { userControllerInstance } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { 
  validateDeposit, 
  validateTransactionHistoryQuery 
} from "../../../types/auction";

const userRouter = Router();

function getMiddleware(method: keyof typeof userControllerInstance) {
  return getMiddlewareFromController(userControllerInstance, method);
}

userRouter.use(authMiddleware);

userRouter.get("/me", getMiddleware("getProfile"));
userRouter.get("/balance", getMiddleware("getBalance"));

userRouter.get("/gifts", getMiddleware("getMyGifts"));
userRouter.get("/transactions", validateTransactionHistoryQuery, getMiddleware("getTransactionHistory"));

userRouter.get("/auctions", getMiddleware("getMyAuctions"));

userRouter.post("/deposit", validateDeposit, getMiddleware("deposit"));

userRouter.get("/bots", getMiddleware("getBotStats"));

export { userRouter };
