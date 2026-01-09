import * as MongoDb from 'mongodb';

import { BidCollection, BidStatus, BidHistoryEntry } from '../types/bid';

export class BidStorage {

  private readonly bids: MongoDb.Collection<BidCollection>;

  constructor(db: MongoDb.Db) {
    this.bids = db.collection<BidCollection>('bid');
  }

  async createIndexes(): Promise<void> {
    await this.bids.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { auctionId: 1 } },
      { key: { roundId: 1 } },
      { key: { userId: 1 } },
      { key: { roundId: 1, userId: 1 }, unique: true },
      { key: { roundId: 1, amount: -1, placedAt: 1 } },
      { key: { status: 1 } },
    ]);
  }

  async create(bid: BidCollection): Promise<boolean> {
    const res = await this.bids.insertOne(bid);
    return res.acknowledged;
  }

  async update(id: string, update: Partial<BidCollection>): Promise<boolean> {
    const res = await this.bids.updateOne(
      { id },
      { $set: { ...update, updatedAt: Date.now(), lastUpdatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getById(id: string): Promise<BidCollection | undefined> {
    return await this.bids.findOne({ id }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getByUserAndRound(userId: string, roundId: string): Promise<BidCollection | undefined> {
    return await this.bids.findOne(
      { userId, roundId },
      { projection: { _id: 0 } }
    ) ?? undefined;
  }

  async getByRound(roundId: string): Promise<BidCollection[]> {
    return await this.bids.find(
      { roundId },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async getByRoundRanked(roundId: string, limit?: number): Promise<BidCollection[]> {
    let cursor = this.bids.find(
      { roundId },
      { projection: { _id: 0 } }
    ).sort({ amount: -1, placedAt: 1 });

    if (limit) cursor = cursor.limit(limit);

    return await cursor.toArray();
  }

  async getTopBids(roundId: string, count: number): Promise<BidCollection[]> {
    return await this.getByRoundRanked(roundId, count);
  }

  async getByUser(userId: string): Promise<BidCollection[]> {
    return await this.bids.find(
      { userId },
      { projection: { _id: 0 } }
    ).sort({ createdAt: -1 }).toArray();
  }

  async getActiveByUser(userId: string): Promise<BidCollection[]> {
    return await this.bids.find(
      { userId, status: { $in: ['active', 'winning', 'losing'] } },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async getByAuction(auctionId: string): Promise<BidCollection[]> {
    return await this.bids.find(
      { auctionId },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async raiseBid(id: string, newAmount: number, historyEntry: BidHistoryEntry): Promise<boolean> {
    const res = await this.bids.updateOne(
      { id },
      { 
        $set: { 
          amount: newAmount,
          updatedAt: Date.now(),
          lastUpdatedAt: Date.now(),
        },
        $push: { history: historyEntry }
      },
    );
    return res.modifiedCount > 0;
  }

  async setStatus(id: string, status: BidStatus): Promise<boolean> {
    const res = await this.bids.updateOne(
      { id },
      { $set: { status, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async setStatusBulk(ids: string[], status: BidStatus): Promise<number> {
    const res = await this.bids.updateMany(
      { id: { $in: ids } },
      { $set: { status, updatedAt: Date.now() } },
    );
    return res.modifiedCount;
  }

  async carryBidsToNextRound(
    fromRoundId: string, 
    toRoundId: string, 
    bidIds: string[]
  ): Promise<number> {
    const res = await this.bids.updateMany(
      { id: { $in: bidIds } },
      { 
        $set: { 
          roundId: toRoundId,
          carriedFromRoundId: fromRoundId,
          carriedToRoundId: toRoundId,
          status: 'active' as BidStatus,
          updatedAt: Date.now(),
          lastUpdatedAt: Date.now(),
        },
        $inc: { carryCount: 1 },
        $push: { 
          history: {
            amount: 0,
            timestamp: Date.now(),
            reason: 'carried' as const,
            fromRoundId,
          }
        }
      },
    );
    return res.modifiedCount;
  }

  async updateRanks(roundId: string): Promise<void> {
    const bids = await this.getByRoundRanked(roundId);
    
    const bulkOps = bids.map((bid, index) => ({
      updateOne: {
        filter: { id: bid.id },
        update: { $set: { rank: index + 1, updatedAt: Date.now() } }
      }
    }));

    if (bulkOps.length > 0) {
      await this.bids.bulkWrite(bulkOps);
    }
  }

  async countByRound(roundId: string): Promise<number> {
    return await this.bids.countDocuments({ roundId });
  }

  async countUniqueUsersByRound(roundId: string): Promise<number> {
    const result = await this.bids.distinct('userId', { roundId });
    return result.length;
  }

  async getOneByFilter(filter: MongoDb.Filter<BidCollection>): Promise<BidCollection | undefined> {
    return await this.bids.findOne({ ...filter }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getManyByFilter(
    filter: MongoDb.Filter<BidCollection>,
    options?: { limit?: number; skip?: number; sort?: MongoDb.Sort }
  ): Promise<BidCollection[]> {
    let cursor = this.bids.find(filter, { projection: { _id: 0 } });
    
    if (options?.sort) cursor = cursor.sort(options.sort);
    if (options?.skip) cursor = cursor.skip(options.skip);
    if (options?.limit) cursor = cursor.limit(options.limit);
    
    return await cursor.toArray();
  }
}
