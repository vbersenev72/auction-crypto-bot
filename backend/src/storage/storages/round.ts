import * as MongoDb from 'mongodb';

import { RoundCollection, RoundStatus } from '../types/round';

export class RoundStorage {

  private readonly rounds: MongoDb.Collection<RoundCollection>;

  constructor(db: MongoDb.Db) {
    this.rounds = db.collection<RoundCollection>('round');
  }

  async createIndexes(): Promise<void> {
    await this.rounds.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { auctionId: 1 } },
      { key: { auctionId: 1, roundNumber: 1 }, unique: true },
      { key: { status: 1 } },
      { key: { scheduledEndAt: 1 } },
    ]);
  }

  async create(round: RoundCollection): Promise<boolean> {
    const res = await this.rounds.insertOne(round);
    return res.acknowledged;
  }

  async createMany(rounds: RoundCollection[]): Promise<boolean> {
    const res = await this.rounds.insertMany(rounds);
    return res.acknowledged;
  }

  async update(id: string, update: Partial<RoundCollection>): Promise<boolean> {
    const res = await this.rounds.updateOne(
      { id },
      { $set: { ...update, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getById(id: string): Promise<RoundCollection | undefined> {
    return await this.rounds.findOne({ id }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getByAuctionId(auctionId: string): Promise<RoundCollection[]> {
    return await this.rounds.find(
      { auctionId },
      { projection: { _id: 0 } }
    ).sort({ roundNumber: 1 }).toArray();
  }

  async getByAuctionAndNumber(auctionId: string, roundNumber: number): Promise<RoundCollection | undefined> {
    return await this.rounds.findOne(
      { auctionId, roundNumber },
      { projection: { _id: 0 } }
    ) ?? undefined;
  }

  async getActiveRound(auctionId: string): Promise<RoundCollection | undefined> {
    return await this.rounds.findOne(
      { auctionId, status: 'active' },
      { projection: { _id: 0 } }
    ) ?? undefined;
  }

  async setStatus(id: string, status: RoundStatus): Promise<boolean> {
    const now = Date.now();
    const update: Partial<RoundCollection> = {
      status,
      updatedAt: now,
    };

    if (status === 'active') {
      update.startedAt = now;
    } else if (status === 'completed') {
      update.actualEndAt = now;
    }

    const res = await this.rounds.updateOne(
      { id },
      { $set: update },
    );
    return res.modifiedCount > 0;
  }

  async extendRound(id: string, extensionSeconds: number): Promise<boolean> {
    const round = await this.getById(id);
    if (!round || !round.scheduledEndAt) return false;

    const res = await this.rounds.updateOne(
      { id },
      { 
        $set: { 
          scheduledEndAt: round.scheduledEndAt + extensionSeconds * 1000,
          lastExtendedAt: Date.now(),
          updatedAt: Date.now(),
        },
        $inc: { extensionsCount: 1 }
      },
    );
    return res.modifiedCount > 0;
  }

  async incrementBidsCount(id: string): Promise<boolean> {
    const res = await this.rounds.updateOne(
      { id },
      { 
        $inc: { totalBidsCount: 1 },
        $set: { updatedAt: Date.now() }
      },
    );
    return res.modifiedCount > 0;
  }

  async updateStats(id: string, stats: Partial<Pick<RoundCollection, 'uniqueBiddersCount' | 'highestBidAmount' | 'lowestWinningBidAmount'>>): Promise<boolean> {
    const res = await this.rounds.updateOne(
      { id },
      { $set: { ...stats, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getRoundsEndingBefore(timestamp: number): Promise<RoundCollection[]> {
    return await this.rounds.find(
      { 
        status: 'active',
        scheduledEndAt: { $lte: timestamp }
      },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async getOneByFilter(filter: MongoDb.Filter<RoundCollection>): Promise<RoundCollection | undefined> {
    return await this.rounds.findOne({ ...filter }, { projection: { _id: 0 } }) ?? undefined;
  }
}

