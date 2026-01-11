import { defaultUnexpectedError } from "../decorators/defaultUnexpectedError";
import { AuctionService } from "../services/auction.service";
import { RoundService } from "../services/round.service";
import { BidService } from "../services/bid.service";
import { CreateAuctionRequest, AuctionListQuery, ApiResponse, AuctionResponse } from "../../../types/auction";
import { CustomRequest } from "../../request";

class AuctionController {
  
  @defaultUnexpectedError("Cannot create auction")
  async create(req: CustomRequest): Promise<ApiResponse<AuctionResponse>> {
    const userId = req.userId!;
    const { title, description, imageUrl, rounds, minBidAmount, bidStep, antiSniping, scheduledStartAt } = req.body as CreateAuctionRequest;

    const roundsConfig = rounds.map((r, index) => ({
      roundNumber: index + 1,
      itemsCount: r.itemsCount,
      durationSeconds: r.durationSeconds,
    }));

    const result = await AuctionService.create({
      title,
      description: description || '',
      imageUrl,
      roundsConfig,
      minBidAmount,
      bidStep: bidStep || 1,
      antiSniping,
      scheduledStartAt,
      createdBy: userId,
    });

    if (!result.success || !result.auction) {
      return { status: 'failed', message: result.error };
    }

    return {
      status: 'ok',
      data: AuctionController.formatAuctionResponse(result.auction),
    };
  }

  @defaultUnexpectedError("Cannot start auction")
  async start(req: CustomRequest): Promise<ApiResponse<AuctionResponse>> {
    const userId = req.userId!;
    const auctionId = (req.params as { id: string }).id;
    
    const auction = await AuctionService.getById(auctionId);
    if (!auction) {
      return { status: 'failed', message: 'Auction not found' };
    }
    
    if (auction.createdBy !== userId) {
      return { status: 'failed', message: 'Only auction creator can start it' };
    }

    const result = await AuctionService.start(auctionId);

    if (!result.success || !result.auction) {
      return { status: 'failed', message: result.error };
    }

    return {
      status: 'ok',
      data: AuctionController.formatAuctionResponse(result.auction),
    };
  }

  @defaultUnexpectedError("Cannot get auction")
  async getById(req: CustomRequest): Promise<ApiResponse<AuctionResponse>> {
    const auctionId = (req.params as { id: string }).id;
    
    const auction = await AuctionService.getById(auctionId);
    if (!auction) {
      return { status: 'failed', message: 'Auction not found' };
    }

    return {
      status: 'ok',
      data: AuctionController.formatAuctionResponse(auction),
    };
  }

  @defaultUnexpectedError("Cannot get auctions list")
  async getList(req: CustomRequest): Promise<ApiResponse<AuctionResponse[]>> {
    const query = req.query as unknown as AuctionListQuery;
    
    const auctions = await AuctionService.getList({
      status: query.status,
      limit: query.limit ? Number(query.limit) : 50,
      skip: query.skip ? Number(query.skip) : 0,
    });

    return {
      status: 'ok',
      data: auctions.map(a => AuctionController.formatAuctionResponse(a)),
    };
  }

  @defaultUnexpectedError("Cannot get leaderboard")
  async getLeaderboard(req: CustomRequest): Promise<ApiResponse> {
    const userId = req.userId;
    const auctionId = (req.params as { id: string }).id;
    
    const auction = await AuctionService.getById(auctionId);
    if (!auction) {
      return { status: 'failed', message: 'Auction not found' };
    }

    if (auction.status !== 'active') {
      return { status: 'failed', message: 'Auction is not active' };
    }

    const activeRound = await RoundService.getActiveRound(auctionId);
    if (!activeRound) {
      return { status: 'failed', message: 'No active round' };
    }

    const ranking = await BidService.getRoundRanking(activeRound.id);

    const leaderboard = ranking.map(entry => ({
      rank: entry.rank,
      username: entry.username,
      amount: entry.bid.amount,
      isWinning: entry.isWinning,
      isCurrentUser: entry.bid.userId === userId,
    }));

    return {
      status: 'ok',
      data: {
        roundId: activeRound.id,
        roundNumber: activeRound.roundNumber,
        itemsCount: activeRound.itemsCount,
        timeRemaining: await RoundService.getTimeRemaining(activeRound.id),
        leaderboard,
      },
    };
  }

  @defaultUnexpectedError("Cannot get auction rounds")
  async getRounds(req: CustomRequest): Promise<ApiResponse> {
    const auctionId = (req.params as { id: string }).id;
    
    const rounds = await RoundService.getAuctionRounds(auctionId);

    return {
      status: 'ok',
      data: rounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        itemsCount: r.itemsCount,
        status: r.status,
        durationSeconds: r.durationSeconds,
        startedAt: r.startedAt,
        scheduledEndAt: r.scheduledEndAt,
        actualEndAt: r.actualEndAt,
        extensionsCount: r.extensionsCount,
        totalBidsCount: r.totalBidsCount,
        highestBidAmount: r.highestBidAmount,
        lowestWinningBidAmount: r.lowestWinningBidAmount,
      })),
    };
  }

  @defaultUnexpectedError("Cannot get auction gifts")
  async getGifts(req: CustomRequest): Promise<ApiResponse> {
    const auctionId = (req.params as { id: string }).id;
    
    const gifts = await AuctionService.getGifts(auctionId);

    return {
      status: 'ok',
      data: gifts.map(g => ({
        id: g.id,
        giftNumber: g.giftNumber,
        status: g.status,
        winnerId: g.winnerId,
        winningAmount: g.winningAmount,
        awardedAt: g.awardedAt,
        metadata: g.metadata,
      })),
    };
  }

  static formatAuctionResponse(auction: Awaited<ReturnType<typeof AuctionService.getById>>): AuctionResponse {
    if (!auction) throw new Error('Auction is null');
    
    return {
      id: auction.id,
      title: auction.title,
      description: auction.description,
      imageUrl: auction.imageUrl,
      totalRounds: auction.totalRounds,
      totalItems: auction.totalItems,
      currentRound: auction.currentRound,
      status: auction.status,
      minBidAmount: auction.minBidAmount,
      bidStep: auction.bidStep,
      scheduledStartAt: auction.scheduledStartAt,
      startedAt: auction.startedAt,
      endedAt: auction.endedAt,
      createdBy: auction.createdBy,
      createdAt: auction.createdAt,
      currentRoundData: auction.currentRoundData,
      leaderboard: auction.leaderboard,
    };
  }
}

export const auctionControllerInstance = new AuctionController();
