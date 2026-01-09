import { MongoClient } from 'mongodb';
import * as MongoDb from 'mongodb';

import { UserStorage } from './storages/user';
import { AuctionStorage } from './storages/auction';
import { RoundStorage } from './storages/round';
import { BidStorage } from './storages/bid';
import { TransactionStorage } from './storages/transaction';
import { GiftStorage } from './storages/gift';

type MongoDbConfig = {
  url: string;
  database: string;
};

export class Storage {
  public static client: MongoClient;
  public static instance: Storage;

  public readonly user: UserStorage;
  public readonly auction: AuctionStorage;
  public readonly round: RoundStorage;
  public readonly bid: BidStorage;
  public readonly transaction: TransactionStorage;
  public readonly gift: GiftStorage;

  constructor(db: MongoDb.Db) {
    this.user = new UserStorage(db);
    this.auction = new AuctionStorage(db);
    this.round = new RoundStorage(db);
    this.bid = new BidStorage(db);
    this.transaction = new TransactionStorage(db);
    this.gift = new GiftStorage(db);

    console.info('Database open');
  }

  async createIndexes(): Promise<void> {
    console.info('Creating database indexes...');
    
    await Promise.all([
      this.user.createIndexes(),
      this.auction.createIndexes(),
      this.round.createIndexes(),
      this.bid.createIndexes(),
      this.transaction.createIndexes(),
      this.gift.createIndexes(),
    ]);

    console.info('Database indexes created');
  }

  static async open(config: MongoDbConfig): Promise<void> {
    const url = new URL(config.url);
    const database = config.database;

    Storage.client = new MongoDb.MongoClient(url.toString());
    await Storage.client.connect();

    Storage.instance = new Storage(this.client.db(database));
    
    await Storage.instance.createIndexes();
  }

  static async close(): Promise<void> {
    if (Storage.client) {
      await Storage.client.close();
      console.info('Database connection closed');
    }
  }
}

export * from './types/user';
export * from './types/auction';
export * from './types/round';
export * from './types/bid';
export * from './types/transaction';
export * from './types/gift';
