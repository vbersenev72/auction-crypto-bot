import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

class ApiService {
  private token: string | null = localStorage.getItem('token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const data = await response.json();

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (data.status === 'failed') {
      const errorMessage = data.message || 'Request failed';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }

    return data;
  }

  // Auth
  async register(username: string, password: string) {
    return this.request<{ status: string; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async login(username: string, password: string) {
    return this.request<{ status: string; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // User
  async getProfile() {
    return this.request<{ status: string; data: UserProfile }>('/user/me');
  }

  async getBalance() {
    return this.request<{ status: string; data: Balance }>('/user/balance');
  }

  async getMyGifts() {
    return this.request<{ status: string; data: Gift[] }>('/user/gifts');
  }

  async deposit(amount: number) {
    return this.request<{ status: string; data: { balance: number } }>('/user/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Auctions
  async createAuction(data: CreateAuctionData) {
    return this.request<{ status: string; data: Auction }>('/auction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAuctions(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ status: string; data: Auction[] }>(`/auction${query}`);
  }

  async getMyAuctions() {
    return this.request<{ status: string; data: Auction[] }>('/user/auctions');
  }

  async getAuction(id: string) {
    return this.request<{ status: string; data: Auction }>(`/auction/${id}`);
  }

  async startAuction(id: string) {
    return this.request<{ status: string; data: Auction }>(`/auction/${id}/start`, {
      method: 'POST',
    });
  }

  async getLeaderboard(id: string) {
    return this.request<{ status: string; data: LeaderboardData }>(`/auction/${id}/leaderboard`);
  }

  // Bids
  async placeBid(auctionId: string, amount: number) {
    return this.request<{ status: string; data: Bid }>('/bid', {
      method: 'POST',
      body: JSON.stringify({ auctionId, amount }),
    });
  }

  async getMyBidInAuction(auctionId: string) {
    return this.request<{ status: string; data: Bid | null }>(`/bid/my/auction/${auctionId}`);
  }
}

export const api = new ApiService();

// Types
export interface UserProfile {
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
}

export interface Balance {
  balance: number;
  reservedBalance: number;
  available: number;
}

export interface Gift {
  id: string;
  auctionId: string;
  giftNumber: number;
  status: string;
  winningAmount?: number;
  awardedAt?: number;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  totalRounds: number;
  totalItems: number;
  currentRound: number;
  status: string;
  minBidAmount: number;
  bidStep: number;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  currentRoundData?: {
    id: string;
    roundNumber: number;
    status: string;
    timeRemaining: number | null;
    bidsCount: number;
    highestBid: number;
  };
  leaderboard?: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  amount: number;
  isWinning: boolean;
  isCurrentUser?: boolean;
  timestamp?: number;
}

export interface LeaderboardData {
  roundId: string;
  roundNumber: number;
  itemsCount: number;
  timeRemaining: number;
  leaderboard: LeaderboardEntry[];
}

export interface Bid {
  id: string;
  auctionId: string;
  roundId: string;
  amount: number;
  status: string;
  rank?: number;
  placedAt: number;
}

export interface CreateAuctionData {
  title: string;
  description?: string;
  rounds: Array<{ itemsCount: number; durationSeconds: number }>;
  minBidAmount: number;
  bidStep?: number;
  antiSniping?: {
    enabled: boolean;
    thresholdSeconds?: number;
    extensionSeconds?: number;
    maxExtensions?: number;
  };
}

