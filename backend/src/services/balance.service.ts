import { v4 } from 'uuid';
import { Storage } from '../storage';
import { TransactionCollection, TransactionType, TransactionDirection, TransactionReference } from '../storage/types/transaction';

export type BalanceOperationResult = {
  success: boolean;
  transactionId?: string;
  error?: string;
  balance?: number;
  reservedBalance?: number;
};

export class BalanceService {
  
  static async getBalance(userId: string): Promise<{ balance: number; reservedBalance: number; available: number } | null> {
    const balances = await Storage.instance.user.getBalance(userId);
    if (!balances) return null;
    
    return {
      balance: balances.balance,
      reservedBalance: balances.reservedBalance,
      available: balances.balance - balances.reservedBalance,
    };
  }

  static async reserve(
    userId: string,
    amount: number,
    references: TransactionReference[],
    description?: string,
    idempotencyKey?: string
  ): Promise<BalanceOperationResult> {
    if (idempotencyKey) {
      const existing = await Storage.instance.transaction.getByIdempotencyKey(idempotencyKey);
      if (existing) {
        return { 
          success: existing.status === 'completed', 
          transactionId: existing.id,
          error: existing.status !== 'completed' ? 'Transaction already exists with different status' : undefined
        };
      }
    }

    const balances = await Storage.instance.user.getBalance(userId);
    if (!balances) {
      return { success: false, error: 'User not found' };
    }

    const available = balances.balance - balances.reservedBalance;
    if (available < amount) {
      return { success: false, error: 'Insufficient balance' };
    }

    const reserved = await Storage.instance.user.reserveBalance(userId, amount);
    if (!reserved) {
      return { success: false, error: 'Failed to reserve balance (concurrent modification)' };
    }

    const transaction = await this.createTransaction(
      userId,
      'bid_place',
      'debit',
      amount,
      balances.balance,
      balances.balance,
      references,
      description,
      idempotencyKey
    );

    return { 
      success: true, 
      transactionId: transaction.id,
      balance: balances.balance,
      reservedBalance: balances.reservedBalance + amount,
    };
  }

  static async reserveAdditional(
    userId: string,
    additionalAmount: number,
    references: TransactionReference[],
    description?: string,
    idempotencyKey?: string
  ): Promise<BalanceOperationResult> {
    return await this.reserve(userId, additionalAmount, references, description, idempotencyKey);
  }

  static async confirmReserved(
    userId: string,
    amount: number,
    references: TransactionReference[],
    description?: string
  ): Promise<BalanceOperationResult> {
    const balances = await Storage.instance.user.getBalance(userId);
    if (!balances) {
      return { success: false, error: 'User not found' };
    }

    const confirmed = await Storage.instance.user.confirmReservedBalance(userId, amount);
    if (!confirmed) {
      return { success: false, error: 'Failed to confirm reserved balance' };
    }

    const transaction = await this.createTransaction(
      userId,
      'auction_win',
      'debit',
      amount,
      balances.balance,
      balances.balance - amount,
      references,
      description
    );

    await Storage.instance.user.incrementStats(userId, {
      totalWins: 1,
      totalSpent: amount,
    });

    return { 
      success: true, 
      transactionId: transaction.id,
      balance: balances.balance - amount,
      reservedBalance: balances.reservedBalance - amount,
    };
  }

  static async refundReserved(
    userId: string,
    amount: number,
    references: TransactionReference[],
    description?: string
  ): Promise<BalanceOperationResult> {
    const balances = await Storage.instance.user.getBalance(userId);
    if (!balances) {
      return { success: false, error: 'User not found' };
    }

    const refunded = await Storage.instance.user.refundReservedBalance(userId, amount);
    if (!refunded) {
      return { success: false, error: 'Failed to refund reserved balance' };
    }

    const transaction = await this.createTransaction(
      userId,
      'bid_refund',
      'credit',
      amount,
      balances.balance,
      balances.balance, 
      references,
      description
    );

    await Storage.instance.user.incrementStats(userId, {
      totalRefunded: amount,
    });

    return { 
      success: true, 
      transactionId: transaction.id,
      balance: balances.balance,
      reservedBalance: balances.reservedBalance - amount,
    };
  }

  static async deposit(
    userId: string,
    amount: number,
    description?: string
  ): Promise<BalanceOperationResult> {
    const balances = await Storage.instance.user.getBalance(userId);
    if (!balances) {
      return { success: false, error: 'User not found' };
    }

    const updated = await Storage.instance.user.updateBalance(userId, amount);
    if (!updated) {
      return { success: false, error: 'Failed to update balance' };
    }

    const transaction = await this.createTransaction(
      userId,
      'deposit',
      'credit',
      amount,
      balances.balance,
      balances.balance + amount,
      [],
      description
    );

    return { 
      success: true, 
      transactionId: transaction.id,
      balance: balances.balance + amount,
      reservedBalance: balances.reservedBalance,
    };
  }

  private static async createTransaction(
    userId: string,
    type: TransactionType,
    direction: TransactionDirection,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    references: TransactionReference[],
    description?: string,
    idempotencyKey?: string
  ): Promise<TransactionCollection> {
    const now = Date.now();
    const transaction: TransactionCollection = {
      id: v4(),
      userId,
      type,
      direction,
      amount,
      balanceBefore,
      balanceAfter,
      status: 'completed',
      references,
      description,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
      processedAt: now,
    };

    await Storage.instance.transaction.create(transaction);
    return transaction;
  }

  static async getHistory(userId: string, limit?: number): Promise<TransactionCollection[]> {
    return await Storage.instance.transaction.getByUser(userId, limit);
  }
}
