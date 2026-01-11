import { defaultUnexpectedError } from "../decorators/defaultUnexpectedError";
import { Storage } from "../storage";
import { BalanceService } from "../services/balance.service";
import { AuctionService } from "../services/auction.service";
import { BotService } from "../services/bot.service";
import { ApiResponse, UserProfileResponse, GiftResponse, TransactionResponse, DepositRequest } from "../../../types/auction";
import { CustomRequest } from "../../request";

class UserController {
  
  @defaultUnexpectedError("Cannot get profile")
  async getProfile(req: CustomRequest): Promise<ApiResponse<UserProfileResponse>> {
    const userId = req.userId!;

    const user = await Storage.instance.user.getById(userId);
    if (!user) {
      return { status: 'failed', message: 'User not found' };
    }

    const balance = await BalanceService.getBalance(userId);

    return {
      status: 'ok',
      data: {
        id: user.id,
        username: user.username,
        balance: balance?.balance || 0,
        reservedBalance: balance?.reservedBalance || 0,
        availableBalance: balance?.available || 0,
        stats: user.stats,
      },
    };
  }

  @defaultUnexpectedError("Cannot get balance")
  async getBalance(req: CustomRequest): Promise<ApiResponse> {
    const userId = req.userId!;

    const balance = await BalanceService.getBalance(userId);
    if (!balance) {
      return { status: 'failed', message: 'User not found' };
    }

    return {
      status: 'ok',
      data: balance,
    };
  }

  @defaultUnexpectedError("Cannot get gifts")
  async getMyGifts(req: CustomRequest): Promise<ApiResponse<GiftResponse[]>> {
    const userId = req.userId!;
    const gifts = await AuctionService.getUserGifts(userId);

    return {
      status: 'ok',
      data: gifts.map(g => ({
        id: g.id,
        auctionId: g.auctionId,
        giftNumber: g.giftNumber,
        status: g.status,
        winningAmount: g.winningAmount,
        awardedAt: g.awardedAt,
        metadata: g.metadata,
      })),
    };
  }

  @defaultUnexpectedError("Cannot get transaction history")
  async getTransactionHistory(req: CustomRequest): Promise<ApiResponse<TransactionResponse[]>> {
    const userId = req.userId!;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const transactions = await BalanceService.getHistory(userId, limit);

    return {
      status: 'ok',
      data: transactions.map(t => ({
        id: t.id,
        type: t.type,
        direction: t.direction,
        amount: t.amount,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  @defaultUnexpectedError("Cannot deposit")
  async deposit(req: CustomRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const { amount } = req.body as DepositRequest;

    const result = await BalanceService.deposit(userId, amount, 'Manual deposit');

    if (!result.success) {
      return { status: 'failed', message: result.error };
    }

    return {
      status: 'ok',
      data: {
        balance: result.balance,
        transactionId: result.transactionId,
      },
    };
  }

  @defaultUnexpectedError("Cannot get my auctions")
  async getMyAuctions(req: CustomRequest): Promise<ApiResponse> {
    const userId = req.userId!;
    const auctions = await AuctionService.getList({ createdBy: userId });

    return {
      status: 'ok',
      data: auctions.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        totalRounds: a.totalRounds,
        currentRound: a.currentRound,
        totalItems: a.totalItems,
        createdAt: a.createdAt,
      })),
    };
  }

  @defaultUnexpectedError("Cannot get bot stats")
  async getBotStats(): Promise<ApiResponse> {
    const stats = await BotService.getBotStats();

    return {
      status: 'ok',
      data: stats,
    };
  }
}

export const userControllerInstance = new UserController();
