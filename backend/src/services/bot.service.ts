import { Storage } from '../storage';
import { UserCollection } from '../storage/types/user';
import { BidService } from './bid.service';
import { RoundService } from './round.service';

const BOT_IDS = ['bot-tester-1', 'bot-tester-2', 'bot-tester-3'];
for (let i = 4; i < 31; i++) BOT_IDS.push(`bot-tester-${i}`) // 30 ботов
const BOT_BALANCE = 1_000_000_000_000;

type BotId = typeof BOT_IDS[number];

export class BotService {
  private static isInitialized = false;
  private static botActionInterval: NodeJS.Timeout | null = null;
  private static readonly BOT_ACTION_INTERVAL_MS = 1500;
  private static readonly BOTS_PER_ACTION = 8;

  static isBot(userId: string): boolean {
    return BOT_IDS.includes(userId as BotId);
  }

  static getBotIds(): readonly string[] {
    return BOT_IDS;
  }

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing bots...');

    for (const botId of BOT_IDS) {
      const existingBot = await Storage.instance.user.getById(botId);
      
      if (!existingBot) {
        const now = Date.now();
        const bot: UserCollection = {
          id: botId,
          username: `Bot ${botId.split('-').pop()}`,
          passwordHash: '',
          balance: BOT_BALANCE,
          reservedBalance: 0,
          stats: {
            totalBidsPlaced: 0,
            totalAuctionsParticipated: 0,
            totalWins: 0,
            totalSpent: 0,
            totalRefunded: 0,
          },
          createdAt: now,
          updatedAt: now,
        };

        await Storage.instance.user.addOrUpdate(bot);
        console.log(`Created bot: ${botId}`);
      } else {
        await Storage.instance.user.update(botId, {
          balance: BOT_BALANCE,
          reservedBalance: 0,
        });
        console.log(`Bot exists: ${botId}, balance reset`);
      }
    }

    this.isInitialized = true;
    console.log('Bots initialized');
  }

  static startBotActions(): void {
    if (this.botActionInterval) {
      console.log('Bot actions already running');
      return;
    }

    console.log('Starting bot actions...');
    
    this.botActionInterval = setInterval(() => {
      this.performBotActions();
    }, this.BOT_ACTION_INTERVAL_MS);

    console.log('Bot actions started');
  }

  static stopBotActions(): void {
    if (this.botActionInterval) {
      clearInterval(this.botActionInterval);
      this.botActionInterval = null;
      console.log('Bot actions stopped');
    }
  }

  private static async performBotActions(): Promise<void> {
    try {
      const activeAuctions = await Storage.instance.auction.getActiveAuctions();

      for (const auction of activeAuctions) {
        const activeRound = await RoundService.getActiveRound(auction.id);
        if (!activeRound) continue;

        await this.processBotBidsForRound(auction.id, activeRound.id, auction.minBidAmount, auction.bidStep);
      }
    } catch (error) {
      console.error('Error in bot actions:', error);
    }
  }

  private static roundToStep(amount: number, minBidAmount: number, bidStep: number): number {
    const stepsFromMin = Math.floor((amount - minBidAmount) / bidStep);
    return minBidAmount + stepsFromMin * bidStep;
  }

  private static async processBotBidsForRound(
    auctionId: string,
    roundId: string,
    minBidAmount: number,
    bidStep: number
  ): Promise<void> {
    const round = await Storage.instance.round.getById(roundId);
    if (!round) return;

    const ranking = await BidService.getRoundRanking(roundId);
    
    const humanBids = ranking.filter(r => !this.isBot(r.bid.userId));
    const existingAmounts = new Set(ranking.map(r => r.bid.amount));
    
    const maxHumanBid = humanBids.length > 0 ? humanBids[0].bid.amount : 0;

    const shuffledBots = [...BOT_IDS].sort(() => Math.random() - 0.5);
    const selectedBots = shuffledBots.slice(0, this.BOTS_PER_ACTION);

    for (const selectedBotId of selectedBots) {
      if (Math.random() > 0.7) continue;

      const currentBotBid = await Storage.instance.bid.getByUserAndRound(selectedBotId, roundId);

      if (!currentBotBid) {
        // Находим свободную сумму для новой ставки
        let safeBid = this.findUniqueBidAmount(minBidAmount, bidStep, existingAmounts, maxHumanBid);
        
        if (safeBid >= minBidAmount) {
          const result = await BidService.placeBid(selectedBotId, auctionId, roundId, safeBid);
          if (result.success) {
            existingAmounts.add(safeBid);
          }
        }
      } else {
        const botRankEntry = ranking.find(r => r.bid.userId === selectedBotId);
        
        if (botRankEntry && !botRankEntry.isWinning) {
          const winningBids = ranking.filter(r => r.isWinning);
          const lowestWinningBid = winningBids.length > 0 
            ? winningBids[winningBids.length - 1].bid.amount 
            : minBidAmount;

          // Находим свободную сумму выше самой низкой выигрывающей
          let newBotBid = this.findUniqueBidAbove(lowestWinningBid, minBidAmount, bidStep, existingAmounts, maxHumanBid, currentBotBid.amount);

          if (newBotBid > currentBotBid.amount) {
            const result = await BidService.placeBid(selectedBotId, auctionId, roundId, newBotBid);
            if (result.success) {
              existingAmounts.delete(currentBotBid.amount);
              existingAmounts.add(newBotBid);
            }
          }
        } else if (botRankEntry && botRankEntry.isWinning) {
          if (Math.random() < 0.15) {
            // Находим свободную сумму чуть выше текущей
            let smallRaise = currentBotBid.amount + bidStep;
            while (existingAmounts.has(smallRaise) && (maxHumanBid === 0 || smallRaise < maxHumanBid)) {
              smallRaise += bidStep;
            }
            
            if (!existingAmounts.has(smallRaise) && (maxHumanBid === 0 || smallRaise < maxHumanBid)) {
              const result = await BidService.placeBid(selectedBotId, auctionId, roundId, smallRaise);
              if (result.success) {
                existingAmounts.delete(currentBotBid.amount);
                existingAmounts.add(smallRaise);
              }
            }
          }
        }
      }
    }
  }

  private static findUniqueBidAmount(
    minBidAmount: number,
    bidStep: number,
    existingAmounts: Set<number>,
    maxHumanBid: number
  ): number {
    const randomSteps = Math.floor(Math.random() * 5) + 1;
    let bid = minBidAmount + randomSteps * bidStep;
    
    // Ищем свободную сумму
    let attempts = 0;
    while (existingAmounts.has(bid) && attempts < 20) {
      bid += bidStep;
      attempts++;
    }
    
    // Проверяем лимит человеческих ставок
    if (maxHumanBid > 0 && bid >= maxHumanBid) {
      bid = this.roundToStep(maxHumanBid - 1, minBidAmount, bidStep);
      while (existingAmounts.has(bid) && bid > minBidAmount) {
        bid -= bidStep;
      }
    }
    
    return existingAmounts.has(bid) ? 0 : bid;
  }

  private static findUniqueBidAbove(
    lowestWinningBid: number,
    minBidAmount: number,
    bidStep: number,
    existingAmounts: Set<number>,
    maxHumanBid: number,
    currentAmount: number
  ): number {
    const randomSteps = Math.floor(Math.random() * 4) + 1;
    let bid = this.roundToStep(lowestWinningBid, minBidAmount, bidStep) + randomSteps * bidStep;
    
    // Ищем свободную сумму
    let attempts = 0;
    while (existingAmounts.has(bid) && attempts < 20) {
      bid += bidStep;
      attempts++;
    }
    
    // Проверяем лимит человеческих ставок
    if (maxHumanBid > 0 && bid >= maxHumanBid) {
      bid = this.roundToStep(maxHumanBid - 1, minBidAmount, bidStep);
      while (existingAmounts.has(bid) && bid > currentAmount) {
        bid -= bidStep;
      }
    }
    
    return existingAmounts.has(bid) ? currentAmount : bid;
  }

  static async getBotStats(): Promise<Array<{ id: string; username: string; balance: number; bidsPlaced: number }>> {
    const stats = [];
    
    for (const botId of BOT_IDS) {
      const bot = await Storage.instance.user.getById(botId);
      if (bot) {
        stats.push({
          id: bot.id,
          username: bot.username,
          balance: bot.balance,
          bidsPlaced: bot.stats.totalBidsPlaced,
        });
      }
    }

    return stats;
  }
}
