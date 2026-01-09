import * as MongoDb from 'mongodb';

import { 
  TransactionCollection, 
  TransactionStatus, 
  TransactionType, 
  TransactionDirection 
} from '../types/transaction';

export class TransactionStorage {

  private readonly transactions: MongoDb.Collection<TransactionCollection>;

  constructor(db: MongoDb.Db) {
    this.transactions = db.collection<TransactionCollection>('transaction');
  }

  async createIndexes(): Promise<void> {
    await this.transactions.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { userId: 1, createdAt: -1 } },
      { key: { type: 1 } },
      { key: { status: 1 } },
      { key: { idempotencyKey: 1 }, unique: true, sparse: true },
      { key: { 'references.type': 1, 'references.id': 1 } },
      { key: { createdAt: -1 } },
    ]);
  }

  async create(transaction: TransactionCollection): Promise<boolean> {
    try {
      const res = await this.transactions.insertOne(transaction);
      return res.acknowledged;
    } catch (error) {
      if ((error as MongoDb.MongoError).code === 11000) {
        return false;
      }
      throw error;
    }
  }

  async update(id: string, update: Partial<TransactionCollection>): Promise<boolean> {
    const res = await this.transactions.updateOne(
      { id },
      { $set: { ...update, updatedAt: Date.now() } },
    );
    return res.modifiedCount > 0;
  }

  async getById(id: string): Promise<TransactionCollection | undefined> {
    return await this.transactions.findOne({ id }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getByIdempotencyKey(idempotencyKey: string): Promise<TransactionCollection | undefined> {
    return await this.transactions.findOne(
      { idempotencyKey },
      { projection: { _id: 0 } }
    ) ?? undefined;
  }

  async getByUser(userId: string, limit?: number): Promise<TransactionCollection[]> {
    let cursor = this.transactions.find(
      { userId },
      { projection: { _id: 0 } }
    ).sort({ createdAt: -1 });

    if (limit) cursor = cursor.limit(limit);

    return await cursor.toArray();
  }

  async getByUserAndType(userId: string, type: TransactionType): Promise<TransactionCollection[]> {
    return await this.transactions.find(
      { userId, type },
      { projection: { _id: 0 } }
    ).sort({ createdAt: -1 }).toArray();
  }

  async getByReference(refType: string, refId: string): Promise<TransactionCollection[]> {
    return await this.transactions.find(
      { 'references': { $elemMatch: { type: refType, id: refId } } },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async setStatus(id: string, status: TransactionStatus, errorMessage?: string): Promise<boolean> {
    const update: Partial<TransactionCollection> = {
      status,
      updatedAt: Date.now(),
    };

    if (status === 'completed' || status === 'failed') {
      update.processedAt = Date.now();
    }

    if (errorMessage) {
      update.errorMessage = errorMessage;
    }

    const res = await this.transactions.updateOne(
      { id },
      { $set: update },
    );
    return res.modifiedCount > 0;
  }

  async getPendingTransactions(): Promise<TransactionCollection[]> {
    return await this.transactions.find(
      { status: 'pending' },
      { projection: { _id: 0 } }
    ).toArray();
  }

  async sumByUserAndType(
    userId: string, 
    type: TransactionType, 
    direction: TransactionDirection,
    status: TransactionStatus = 'completed'
  ): Promise<number> {
    const result = await this.transactions.aggregate([
      { $match: { userId, type, direction, status } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();

    return result[0]?.total ?? 0;
  }

  async getOneByFilter(filter: MongoDb.Filter<TransactionCollection>): Promise<TransactionCollection | undefined> {
    return await this.transactions.findOne({ ...filter }, { projection: { _id: 0 } }) ?? undefined;
  }

  async getManyByFilter(
    filter: MongoDb.Filter<TransactionCollection>,
    options?: { limit?: number; skip?: number; sort?: MongoDb.Sort }
  ): Promise<TransactionCollection[]> {
    let cursor = this.transactions.find(filter, { projection: { _id: 0 } });
    
    if (options?.sort) cursor = cursor.sort(options.sort);
    if (options?.skip) cursor = cursor.skip(options.skip);
    if (options?.limit) cursor = cursor.limit(options.limit);
    
    return await cursor.toArray();
  }
}
