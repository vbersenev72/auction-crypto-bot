import { defaultUnexpectedError } from "../decorators/defaultUnexpectedError";
import { BidService } from "../services/bid.service";
import { RoundService } from "../services/round.service";
import { PlaceBidRequest, ApiResponse, BidResponse } from "../../../types/auction";
import { CustomRequest } from "../../request";

class BidController {
  
  @defaultUnexpectedError("Cannot place bid")
  async placeBid(req: CustomRequest): Promise<ApiResponse<BidResponse>> {
    const userId = req.userId!;
    const { auctionId, amount } = req.body as PlaceBidRequest;

    const activeRound = await RoundService.getActiveRound(auctionId);
    if (!activeRound) {
      return { status: 'failed', message: 'No active round in this auction' };
    }

    const result = await BidService.placeBid(userId, auctionId, activeRound.id, amount);

    if (!result.success || !result.bid) {
      return { status: 'failed', message: result.error };
    }

    return {
      status: 'ok',
      data: BidController.formatBidResponse(result.bid),
    };
  }

  @defaultUnexpectedError("Cannot get user bids")
  async getMyBids(req: CustomRequest): Promise<ApiResponse<BidResponse[]>> {
    const userId = req.userId!;
    const bids = await BidService.getUserBids(userId);

    return {
      status: 'ok',
      data: bids.map(b => BidController.formatBidResponse(b)),
    };
  }

  @defaultUnexpectedError("Cannot get active bids")
  async getMyActiveBids(req: CustomRequest): Promise<ApiResponse<BidResponse[]>> {
    const userId = req.userId!;
    const bids = await BidService.getUserActiveBids(userId);

    return {
      status: 'ok',
      data: bids.map(b => BidController.formatBidResponse(b)),
    };
  }

  @defaultUnexpectedError("Cannot get bid in auction")
  async getMyBidInAuction(req: CustomRequest): Promise<ApiResponse<BidResponse | null>> {
    const userId = req.userId!;
    const auctionId = (req.params as { auctionId: string }).auctionId;

    const activeRound = await RoundService.getActiveRound(auctionId);
    if (!activeRound) {
      return { status: 'ok', data: null };
    }

    const bid = await BidService.getUserBidInRound(userId, activeRound.id);

    return {
      status: 'ok',
      data: bid ? BidController.formatBidResponse(bid) : null,
    };
  }

  @defaultUnexpectedError("Cannot get round ranking")
  async getRoundRanking(req: CustomRequest): Promise<ApiResponse> {
    const roundId = (req.params as { roundId: string }).roundId;

    const ranking = await BidService.getRoundRanking(roundId);

    return {
      status: 'ok',
      data: ranking.map(entry => ({
        rank: entry.rank,
        username: entry.username,
        amount: entry.bid.amount,
        isWinning: entry.isWinning,
      })),
    };
  }

  static formatBidResponse(bid: Awaited<ReturnType<typeof BidService.getUserBidInRound>>): BidResponse {
    if (!bid) throw new Error('Bid is null');
    
    return {
      id: bid.id,
      auctionId: bid.auctionId,
      roundId: bid.roundId,
      amount: bid.amount,
      status: bid.status,
      rank: bid.rank,
      placedAt: bid.placedAt,
    };
  }
}

export const bidControllerInstance = new BidController();
