import * as MongoDb from 'mongodb';

import { AuctionCollection, AuctionStatus } from '../types/auction';

export class AuctionStorage {

  private readonly auctions: MongoDb.Collection<AuctionCollection>;

  constructor(db: MongoDb.Db) {
    this.auctions = db.collection<AuctionCollection>('auction');
  }

  async createIndexes(): Promise<void> {
    await this.auctions.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { status: 1 } },
      { key: { createdBy: 1 } },
      { key: { scheduledStartAt: 1 } },
      { key: { createdAt: -1 } },
    ]);
  }

  async create(auction: AuctionCollection): Promise<boolean> {
    const res = await this.auctions.insertOne(auction);
    return res.acknowledged;
  }

  async update(id: string, update: Partial<AuctionCollection>): Promise<boolean> {
    const res = await this.auctions.updateOne(
      { id },
      { $set: { ...update, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getById(id: string): Promise<AuctionCollection | undefined> {
    return await this.auctions.findOne({ id }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getByStatus(status: AuctionStatus): Promise<AuctionCollection[]> {
    return await this.auctions.find({ status }, { projection: { _id: 0 } }).toArray();
  }

  async getActiveAuctions(): Promise<AuctionCollection[]> {
    return await this.auctions.find(
      { status: { $in: ['active', 'scheduled'] } },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async getScheduledToStart(beforeTimestamp: number): Promise<AuctionCollection[]> {
    return await this.auctions.find(
      { 
        status: 'scheduled',
        scheduledStartAt: { $lte: beforeTimestamp }
      },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async updateCurrentRound(id: string, roundNumber: number): Promise<boolean> {
    const res = await this.auctions.updateOne(
      { id },
      { 
        $set: { 
          currentRound: roundNumber,
          updatedAt: Date.now()
        }
      },
    );
    return res.modifiedCount > 0;
  }

  async setStatus(id: string, status: AuctionStatus): Promise<boolean> {
    const res = await this.auctions.updateOne(
      { id },
      { 
        $set: { 
          status,
          updatedAt: Date.now(),
          ...(status === 'completed' ? { endedAt: Date.now() } : {}),
          ...(status === 'active' && { startedAt: Date.now() }),
        }
      },
    );
    return res.modifiedCount > 0;
  }

  async getByCreator(createdBy: string): Promise<AuctionCollection[]> {
    return await this.auctions.find(
      { createdBy },
      { projection: { _id: 0 } }
    ).sort({ createdAt: -1 }).toArray();
  }

  async getOneByFilter(filter: MongoDb.Filter<AuctionCollection>): Promise<AuctionCollection | undefined> {
    return await this.auctions.findOne({ ...filter }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getManyByFilter(
    filter: MongoDb.Filter<AuctionCollection>,
    options?: { limit?: number; skip?: number; sort?: MongoDb.Sort }
  ): Promise<AuctionCollection[]> {
    let cursor = this.auctions.find(filter, { projection: { _id: 0 } });
    
    if (options?.sort) cursor = cursor.sort(options.sort);
    if (options?.skip) cursor = cursor.skip(options.skip);
    if (options?.limit) cursor = cursor.limit(options.limit);
    
    return await cursor.toArray();
  }
}

