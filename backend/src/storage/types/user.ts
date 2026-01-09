/**
 * Статистика пользователя по аукционам
 */
export type UserAuctionStats = {
  totalBidsPlaced: number;             // Общее количество размещённых ставок
  totalAuctionsParticipated: number;   // Количество аукционов, в которых участвовал
  totalWins: number;                   // Общее количество побед
  totalSpent: number;                  // Общая сумма потраченных Stars на выигрыши
  totalRefunded: number;               // Общая сумма возвратов
};

/**
 * Коллекция пользователей
 */
export type UserCollection = {
  id: string;                          // Уникальный идентификатор пользователя
  
  // Аутентификация
  username: string;                    // Имя пользователя
  passwordHash: string;                // Хеш пароля
  
  // Баланс
  balance: number;                     // Текущий баланс в Stars
  reservedBalance: number;             // Зарезервированный баланс (активные ставки)
                                       // Доступный баланс = balance - reservedBalance
  
  // Статистика
  stats: UserAuctionStats;             // Статистика по аукционам
  
  // Служебные поля
  createdAt: number;
  updatedAt: number;
  lastActivityAt?: number;             // Время последней активности
};
