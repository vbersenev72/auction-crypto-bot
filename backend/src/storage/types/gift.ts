/**
 * Статус подарка
 */
export type GiftStatus = 
  | 'available'    // Доступен для выигрыша
  | 'reserved'     // Зарезервирован (в процессе определения победителя)
  | 'awarded'      // Присуждён победителю
  | 'claimed'      // Получен пользователем
  | 'expired';     // Просрочен (если есть механизм истечения)

/**
 * Коллекция подарков (призов)
 * 
 * Представляет цифровой подарок, который можно выиграть на аукционе
 */
export type GiftCollection = {
  id: string;                          // Уникальный идентификатор подарка
  
  // Связи с аукционом
  auctionId: string;                   // ID аукциона
  roundId?: string;                    // ID раунда, в котором был выигран
  
  // Порядковый номер
  giftNumber: number;                  // Номер подарка в аукционе (1, 2, 3...)
                                       // Соответствует рангу победителя
  
  // Статус
  status: GiftStatus;                  // Текущий статус подарка
  
  // Победитель
  winnerId?: string;                   // ID пользователя-победителя
  winningBidId?: string;               // ID выигравшей ставки
  winningAmount?: number;              // Сумма выигрышной ставки
  
  // Временные метки
  awardedAt?: number;                  // Время присуждения
  claimedAt?: number;                  // Время получения пользователем
  
  // Метаданные подарка (опционально)
  metadata?: {
    name?: string;                     // Название подарка
    description?: string;              // Описание
    imageUrl?: string;                 // URL изображения
    rarity?: string;                   // Редкость
    attributes?: Record<string, unknown>;  // Дополнительные атрибуты
  };
  
  // Служебные поля
  createdAt: number;
  updatedAt: number;
};

