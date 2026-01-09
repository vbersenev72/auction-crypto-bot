import { Router } from "express";
import { authRouter } from "./src/routers/auth.router";
import { auctionRouter } from "./src/routers/auction.router";
import { bidRouter } from "./src/routers/bid.router";
import { userRouter } from "./src/routers/user.router";

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/auction', auctionRouter);
apiRouter.use('/bid', bidRouter);
apiRouter.use('/user', userRouter);

export { apiRouter };
