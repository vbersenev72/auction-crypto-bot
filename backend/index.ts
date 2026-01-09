import express from "express";
import cors from "cors";
import { createServer } from "http";
import { apiRouter } from "./apiRouter";
import { docsRouter } from "./src/swagger/docs.router";
import { Storage } from "./src/storage";
import { ENV } from "./env";
import { AuctionScheduler } from "./src/services/auction.scheduler";
import { BotService } from "./src/services/bot.service";
import { SocketService } from "./src/services/socket.service";

export const env = ENV.getInstance().variables;
const PORT = env.PORT;

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(cors());
app.use("/api", apiRouter);
app.use("/docs", docsRouter);

httpServer.listen(PORT, async () => {
    console.log(`STARTED ON 127.0.0.1:${PORT}`);
    
    await Storage.open({
        url: env.DATABASE_URL,
        database: env.DATABASE_NAME
    });
    
    SocketService.initialize(httpServer);
    await BotService.initialize();
    AuctionScheduler.start();
    BotService.startBotActions();
});

const shutdown = async () => {
    console.log('Shutting down...');
    BotService.stopBotActions();
    AuctionScheduler.stop();
    SocketService.stop();
    await Storage.close();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
