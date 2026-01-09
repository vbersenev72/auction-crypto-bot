import * as MongoDb from 'mongodb';

import { UserCollection, UserAuctionStats } from '../types/user';

export class UserStorage {

  private readonly users: MongoDb.Collection<UserCollection>;

  constructor(db: MongoDb.Db) {
    this.users = db.collection<UserCollection>('user');
  }

  async createIndexes(): Promise<void> {
    await this.users.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
    ]);
  }

  async addOrUpdate(user: UserCollection): Promise<boolean> {
    const res = await this.users.updateOne(
      { id: user.id },
      { $set: user },
      { upsert: true },
    );
    return res.upsertedCount > 0 || res.modifiedCount > 0;
  }

  async create(user: UserCollection): Promise<boolean> {
    const res = await this.users.insertOne(user);
    return res.acknowledged;
  }

  async update(id: string, update: Partial<UserCollection>): Promise<boolean> {
    const res = await this.users.updateOne(
      { id },
      { $set: { ...update, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getById(id: string): Promise<UserCollection | undefined> {
    return await this.users.findOne({ id }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getByUsername(username: string): Promise<UserCollection | undefined> {
    return await this.users.findOne({ username }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getOneByFilter(filter: MongoDb.Filter<UserCollection>): Promise<UserCollection | undefined> {
    return await this.users.findOne({ ...filter }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getBalance(id: string): Promise<{ balance: number; reservedBalance: number } | undefined> {
    const user = await this.users.findOne(
      { id },
      { projection: { _id: 0, balance: 1, reservedBalance: 1 } }
    );
    if (!user) return undefined;
    return { balance: user.balance, reservedBalance: user.reservedBalance };
  }

  async getAvailableBalance(id: string): Promise<number | undefined> {
    const balances = await this.getBalance(id);
    if (!balances) return undefined;
    return balances.balance - balances.reservedBalance;
  }

  async updateBalance(id: string, amount: number): Promise<boolean> {
    const res = await this.users.updateOne(
      { id },
      { 
        $inc: { balance: amount },
        $set: { updatedAt: Date.now(), lastActivityAt: Date.now() }
      },
    );
    return res.modifiedCount > 0;
  }

  async reserveBalance(id: string, amount: number): Promise<boolean> {
    const res = await this.users.updateOne(
      { 
        id,
        $expr: { $gte: [{ $subtract: ['$balance', '$reservedBalance'] }, amount] }
      },
      { 
        $inc: { reservedBalance: amount },
        $set: { updatedAt: Date.now(), lastActivityAt: Date.now() }
      },
    );
    return res.modifiedCount > 0;
  }

  async releaseReservedBalance(id: string, amount: number): Promise<boolean> {
    const res = await this.users.updateOne(
      { id, reservedBalance: { $gte: amount } },
      { 
        $inc: { reservedBalance: -amount },
        $set: { updatedAt: Date.now() }
      },
    );
    return res.modifiedCount > 0;
  }

  async confirmReservedBalance(id: string, amount: number): Promise<boolean> {
    const res = await this.users.updateOne(
      { id, reservedBalance: { $gte: amount }, balance: { $gte: amount } },
      { 
        $inc: { balance: -amount, reservedBalance: -amount },
        $set: { updatedAt: Date.now() }
      },
    );
    return res.modifiedCount > 0;
  }

  async refundReservedBalance(id: string, amount: number): Promise<boolean> {
    return await this.releaseReservedBalance(id, amount);
  }

  async incrementStats(id: string, stats: Partial<UserAuctionStats>): Promise<boolean> {
    const incUpdate: Record<string, number> = {};
    
    if (stats.totalBidsPlaced) incUpdate['stats.totalBidsPlaced'] = stats.totalBidsPlaced;
    if (stats.totalAuctionsParticipated) incUpdate['stats.totalAuctionsParticipated'] = stats.totalAuctionsParticipated;
    if (stats.totalWins) incUpdate['stats.totalWins'] = stats.totalWins;
    if (stats.totalSpent) incUpdate['stats.totalSpent'] = stats.totalSpent;
    if (stats.totalRefunded) incUpdate['stats.totalRefunded'] = stats.totalRefunded;

    const res = await this.users.updateOne(
      { id },
      { 
        $inc: incUpdate,
        $set: { updatedAt: Date.now() }
      },
    );
    return res.modifiedCount > 0;
  }

  async updateLastActivity(id: string): Promise<boolean> {
    const res = await this.users.updateOne(
      { id },
      { $set: { lastActivityAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }
}
