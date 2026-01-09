/**
 * Статус ставки
 */
export type BidStatus = 
  | 'active'      // Активная ставка - участвует в текущем раунде
  | 'winning'     // Побеждающая - в топе текущего раунда (обновляется в реальном времени)
  | 'losing'      // Проигрывает - не в топе текущего раунда
  | 'carried'     // Перенесена в следующий раунд
  | 'won'         // Выиграла - пользователь получил подарок
  | 'refunded';   // Возвращена - деньги вернулись на баланс

/**
 * История изменений ставки (для аудита)
 */
export type BidHistoryEntry = {
  amount: number;                      // Сумма ставки
  timestamp: number;                   // Время изменения
  reason: 'initial' | 'raise' | 'carried';  // Причина изменения
  fromRoundId?: string;                // Из какого раунда перенесена (для carried)
};

/**
 * Коллекция ставок
 */
export type BidCollection = {
  id: string;                          // Уникальный идентификатор ставки
  
  // Связи
  auctionId: string;                   // ID аукциона
  roundId: string;                     // ID текущего раунда
  userId: string;                      // ID пользователя
  
  // Сумма
  amount: number;                      // Текущая сумма ставки в Stars
  initialAmount: number;               // Начальная сумма (при создании)
  
  // Статус
  status: BidStatus;                   // Текущий статус ставки
  
  // Ранжирование
  rank?: number;                       // Текущая позиция в рейтинге (1 = лучший)
  
  // История изменений
  history: BidHistoryEntry[];          // История изменений ставки
  
  // Перенос между раундами
  originalRoundId?: string;            // ID раунда, где ставка была создана изначально
  carriedFromRoundId?: string;         // ID раунда, откуда ставка была перенесена
  carriedToRoundId?: string;           // ID раунда, куда ставка была перенесена
  carryCount: number;                  // Сколько раз ставка переносилась
  
  // Временные метки
  placedAt: number;                    // Время размещения ставки
  lastUpdatedAt: number;               // Время последнего обновления
  
  // Служебные поля
  createdAt: number;
  updatedAt: number;
};

