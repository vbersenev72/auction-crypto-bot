import { Router } from "express";
import { getMiddlewareFromController } from "../middlewares/getMiddlewareFromController";
import { bidControllerInstance } from "../controllers/bid.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validatePlaceBid } from "../../../types/auction";

const bidRouter = Router();

function getMiddleware(method: keyof typeof bidControllerInstance) {
  return getMiddlewareFromController(bidControllerInstance, method);
}

bidRouter.use(authMiddleware);

bidRouter.post("/", validatePlaceBid, getMiddleware("placeBid"));
bidRouter.get("/my", getMiddleware("getMyBids"));
bidRouter.get("/my/active", getMiddleware("getMyActiveBids"));
bidRouter.get("/my/auction/:auctionId", getMiddleware("getMyBidInAuction"));

bidRouter.get("/round/:roundId/ranking", getMiddleware("getRoundRanking"));

export { bidRouter };
