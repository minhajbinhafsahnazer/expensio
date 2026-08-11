import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id: string;
  amount: number;
  categoryId: string;
  date: string;
  notes?: string;
  type: 'income' | 'expense' | 'transfer';
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  synced: boolean;
}

export interface OutboxEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'transaction' | 'category' | 'budget';
  payload: any;
  timestamp: number;
  retryCount: number;
}

export class ExpenseFlowDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  outbox!: Table<OutboxEntry, string>;

  constructor() {
    super('ExpenseFlowDB');
    
    this.version(1).stores({
      transactions: 'id, date, categoryId, type, synced, createdAt',
      categories: 'id, type, synced',
      outbox: 'id, timestamp, entityType, action'
    });
  }
}

export const db = new ExpenseFlowDatabase();
