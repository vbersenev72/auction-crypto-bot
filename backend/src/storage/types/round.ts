/**
 * Статус раунда
 */
export type RoundStatus = 
  | 'pending'     // Ожидает начала
  | 'active'      // Активен - можно делать ставки
  | 'processing'  // Обработка - определение победителей
  | 'completed';  // Завершён

/**
 * Коллекция раунда аукциона
 */
export type RoundCollection = {
  id: string;                          // Уникальный идентификатор раунда
  auctionId: string;                   // ID аукциона
  
  // Информация о раунде
  roundNumber: number;                 // Номер раунда (1, 2, 3...)
  itemsCount: number;                  // Количество подарков в этом раунде
  
  // Статус
  status: RoundStatus;                 // Текущий статус раунда
  
  // Временные рамки
  durationSeconds: number;             // Базовая длительность раунда
  startedAt?: number;                  // Время начала раунда (timestamp)
  scheduledEndAt?: number;             // Изначально запланированное время окончания
  actualEndAt?: number;                // Фактическое время окончания (с учётом продлений)
  
  // Anti-sniping расширения
  extensionsCount: number;             // Количество продлений из-за anti-sniping
  lastExtendedAt?: number;             // Время последнего продления
  
  // Статистика
  totalBidsCount: number;              // Общее количество ставок в раунде
  uniqueBiddersCount: number;          // Количество уникальных участников
  highestBidAmount: number;            // Максимальная ставка
  lowestWinningBidAmount?: number;     // Минимальная выигрышная ставка (после завершения)
  
  // Служебные поля
  createdAt: number;
  updatedAt: number;
};

