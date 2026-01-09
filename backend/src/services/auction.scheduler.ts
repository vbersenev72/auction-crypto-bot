import { RoundService } from './round.service';
import { AuctionService } from './auction.service';
import { BidService } from './bid.service';

export class AuctionScheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static readonly CHECK_INTERVAL_MS = 1000; 

  static start(): void {
    if (this.intervalId) {
      console.log('Auction scheduler is already running');
      return;
    }

    console.log('Starting auction scheduler...');
    
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.CHECK_INTERVAL_MS);

    console.log('Auction scheduler started');
  }

  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Auction scheduler stopped');
    }
  }

  private static async tick(): Promise<void> {
    if (this.isRunning) {
      return; 
    }

    this.isRunning = true;

    try {
      await this.processScheduledAuctions();
      await this.processEndingRounds();
      await this.updateBidStatuses();
    } catch (error) {
      console.error('Scheduler tick error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private static async processScheduledAuctions(): Promise<void> {
    try {
      const { Storage } = await import('../storage');
      const now = Date.now();
      
      const scheduledAuctions = await Storage.instance.auction.getScheduledToStart(now);
      
      for (const auction of scheduledAuctions) {
        console.log(`Auto-starting scheduled auction: ${auction.id}`);
        await AuctionService.start(auction.id);
      }
    } catch (error) {
      console.error('Error processing scheduled auctions:', error);
    }
  }

  private static async processEndingRounds(): Promise<void> {
    try {
      const roundsToEnd = await RoundService.getRoundsToEnd();
      
      for (const round of roundsToEnd) {
        console.log(`Auto-ending round: ${round.id} (round ${round.roundNumber})`);
        await AuctionService.processRoundEnd(round.id);
      }
    } catch (error) {
      console.error('Error processing ending rounds:', error);
    }
  }

  private static async updateBidStatuses(): Promise<void> {
    try {
      const { Storage } = await import('../storage');
      const activeAuctions = await Storage.instance.auction.getActiveAuctions();
      
      for (const auction of activeAuctions) {
        const activeRound = await RoundService.getActiveRound(auction.id);
        if (activeRound) {
          await BidService.updateBidStatuses(activeRound.id);
        }
      }
    } catch (error) {
      console.error('Error updating bid statuses:', error);
    }
  }

  static async forceTick(): Promise<void> {
    await this.tick();
  }
}
