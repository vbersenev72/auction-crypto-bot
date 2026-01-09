import z from "zod";
import { validate } from "../backend/src/middlewares/validate";

// === Zod Schemas ===

export const createAuctionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  rounds: z.array(z.object({
    itemsCount: z.number().int().min(1, 'Items count must be at least 1'),
    durationSeconds: z.number().int().min(10, 'Duration must be at least 10 seconds'),
  })).min(1, 'At least one round is required'),
  minBidAmount: z.number().int().min(1, 'Minimum bid must be at least 1'),
  bidStep: z.number().int().min(1, 'Bid step must be at least 1').optional(),
  antiSniping: z.object({
    enabled: z.boolean().optional(),
    thresholdSeconds: z.number().int().min(1).optional(),
    extensionSeconds: z.number().int().min(1).optional(),
    maxExtensions: z.number().int().min(0).optional(),
  }).optional(),
  scheduledStartAt: z.number().int().optional(),
});
export type CreateAuctionRequest = z.infer<typeof createAuctionSchema>;
export const validateCreateAuction = validate(createAuctionSchema);

export const placeBidSchema = z.object({
  auctionId: z.string().uuid('Invalid auction ID'),
  amount: z.number().int().min(1, 'Amount must be at least 1'),
});
export type PlaceBidRequest = z.infer<typeof placeBidSchema>;
export const validatePlaceBid = validate(placeBidSchema);

export const auctionListQuerySchema = z.object({
  status: z.enum(['draft', 'scheduled', 'active', 'completed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});
export type AuctionListQuery = z.infer<typeof auctionListQuerySchema>;
export const validateAuctionListQuery = validate(auctionListQuerySchema, 'query');

export const depositSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1'),
});
export type DepositRequest = z.infer<typeof depositSchema>;
export const validateDeposit = validate(depositSchema);

export const transactionHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type TransactionHistoryQuery = z.infer<typeof transactionHistoryQuerySchema>;
export const validateTransactionHistoryQuery = validate(transactionHistoryQuerySchema, 'query');

// === Response Types ===

export type ApiResponse<T = unknown> = {
  status: 'ok' | 'failed';
  message?: string;
  data?: T;
};

export type AuctionResponse = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  totalRounds: number;
  totalItems: number;
  currentRound: number;
  status: string;
  minBidAmount: number;
  bidStep: number;
  scheduledStartAt?: number;
  startedAt?: number;
  endedAt?: number;
  createdBy: string;
  createdAt: number;
  currentRoundData?: {
    id: string;
    roundNumber: number;
    status: string;
    timeRemaining: number | null;
    bidsCount: number;
    highestBid: number;
  };
  leaderboard?: Array<{
    rank: number;
    username: string;
    amount: number;
    isWinning: boolean;
  }>;
};

export type BidResponse = {
  id: string;
  auctionId: string;
  roundId: string;
  amount: number;
  status: string;
  rank?: number;
  placedAt: number;
};

export type UserProfileResponse = {
  id: string;
  username: string;
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  stats: {
    totalBidsPlaced: number;
    totalAuctionsParticipated: number;
    totalWins: number;
    totalSpent: number;
    totalRefunded: number;
  };
};

export type GiftResponse = {
  id: string;
  auctionId: string;
  giftNumber: number;
  status: string;
  winningAmount?: number;
  awardedAt?: number;
  metadata?: {
    name?: string;
    description?: string;
    imageUrl?: string;
    rarity?: string;
  };
};

export type TransactionResponse = {
  id: string;
  type: string;
  direction: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  description?: string;
  createdAt: number;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  amount: number;
  isWinning: boolean;
  isCurrentUser?: boolean;
};
