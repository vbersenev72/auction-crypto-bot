import { Router } from "express";
import { getMiddlewareFromController } from "../middlewares/getMiddlewareFromController";
import { auctionControllerInstance } from "../controllers/auction.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { 
  validateCreateAuction, 
  validateAuctionListQuery 
} from "../../../types/auction";

const auctionRouter = Router();

function getMiddleware(method: keyof typeof auctionControllerInstance) {
  return getMiddlewareFromController(auctionControllerInstance, method);
}

auctionRouter.use(authMiddleware);

auctionRouter.post("/", validateCreateAuction, getMiddleware("create"));
auctionRouter.get("/", validateAuctionListQuery, getMiddleware("getList"));
auctionRouter.get("/:id", getMiddleware("getById"));
auctionRouter.post("/:id/start", getMiddleware("start"));

auctionRouter.get("/:id/leaderboard", getMiddleware("getLeaderboard"));
auctionRouter.get("/:id/rounds", getMiddleware("getRounds"));
auctionRouter.get("/:id/gifts", getMiddleware("getGifts"));

export { auctionRouter };
