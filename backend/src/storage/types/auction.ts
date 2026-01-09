/**
 * Статус аукциона
 */
export type AuctionStatus = 
  | 'draft'       // Черновик - аукцион создан, но не запущен
  | 'scheduled'   // Запланирован - ожидает начала
  | 'active'      // Активен - идёт один из раундов
  | 'paused'      // Приостановлен
  | 'completed'   // Завершён - все раунды прошли
  | 'cancelled';  // Отменён

/**
 * Конфигурация раундов аукциона
 */
export type RoundConfig = {
  roundNumber: number;        // Номер раунда (1, 2, 3...)
  itemsCount: number;         // Количество подарков в этом раунде
  durationSeconds: number;    // Длительность раунда в секундах
};

/**
 * Настройки anti-sniping механизма
 */
export type AntiSnipingConfig = {
  enabled: boolean;                    // Включен ли anti-sniping
  thresholdSeconds: number;            // За сколько секунд до конца срабатывает (например, 60)
  extensionSeconds: number;            // На сколько секунд продлевается раунд
  maxExtensions: number;               // Максимальное количество продлений
};

/**
 * Основная коллекция аукциона
 */
export type AuctionCollection = {
  id: string;                          // Уникальный идентификатор аукциона
  
  // Основная информация
  title: string;                       // Название аукциона
  description: string;                 // Описание
  imageUrl?: string;                   // URL изображения (опционально)
  
  // Конфигурация раундов
  totalRounds: number;                 // Общее количество раундов
  totalItems: number;                  // Общее количество подарков во всех раундах
  roundsConfig: RoundConfig[];         // Конфигурация каждого раунда
  
  // Текущее состояние
  currentRound: number;                // Текущий раунд (0 = не начат, 1+ = номер раунда)
  status: AuctionStatus;               // Статус аукциона
  
  // Ставки
  minBidAmount: number;                // Минимальная ставка в Stars
  bidStep: number;                     // Минимальный шаг ставки
  
  // Anti-sniping
  antiSniping: AntiSnipingConfig;      // Настройки anti-sniping
  
  // Временные метки
  scheduledStartAt?: number;           // Запланированное время начала (timestamp)
  startedAt?: number;                  // Фактическое время начала (timestamp)
  endedAt?: number;                    // Время завершения (timestamp)
  
  // Создатель
  createdBy: string;                   // ID пользователя-создателя
  
  // Служебные поля
  createdAt: number;
  updatedAt: number;
};

