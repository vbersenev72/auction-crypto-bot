/**
 * Тип транзакции
 */
export type TransactionType = 
  | 'deposit'           // Пополнение баланса
  | 'withdrawal'        // Вывод средств
  | 'bid_place'         // Размещение ставки (списание)
  | 'bid_raise'         // Повышение ставки (списание разницы)
  | 'bid_refund'        // Возврат ставки (проигравшему)
  | 'auction_win'       // Победа в аукционе (списание уже зарезервированных средств)
  | 'bonus'             // Бонусное начисление
  | 'adjustment';       // Корректировка (административная)

/**
 * Статус транзакции
 */
export type TransactionStatus = 
  | 'pending'           // Ожидает обработки
  | 'processing'        // В обработке
  | 'completed'         // Завершена успешно
  | 'failed'            // Ошибка
  | 'cancelled';        // Отменена

/**
 * Направление транзакции
 */
export type TransactionDirection = 'credit' | 'debit';

/**
 * Связанная сущность для транзакции
 */
export type TransactionReference = {
  type: 'auction' | 'bid' | 'round' | 'gift' | 'external';
  id: string;
};

/**
 * Коллекция транзакций
 * 
 * Все финансовые операции должны проходить через транзакции
 * для обеспечения аудита и целостности данных
 */
export type TransactionCollection = {
  id: string;                          // Уникальный идентификатор транзакции
  
  // Пользователь
  userId: string;                      // ID пользователя
  
  // Тип и направление
  type: TransactionType;               // Тип транзакции
  direction: TransactionDirection;     // credit = пополнение, debit = списание
  
  // Суммы
  amount: number;                      // Сумма транзакции в Stars (всегда положительная)
  balanceBefore: number;               // Баланс до транзакции
  balanceAfter: number;                // Баланс после транзакции
  
  // Статус
  status: TransactionStatus;           // Статус транзакции
  
  // Связи с другими сущностями
  references: TransactionReference[];  // Связанные сущности
  
  // Описание
  description?: string;                // Человекочитаемое описание
  
  // Идемпотентность
  idempotencyKey?: string;             // Ключ для предотвращения дублирования
  
  // Ошибка (если failed)
  errorMessage?: string;               // Сообщение об ошибке
  
  // Служебные поля
  createdAt: number;
  updatedAt: number;
  processedAt?: number;                // Время обработки
};

