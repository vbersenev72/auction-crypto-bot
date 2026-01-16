import { useState, useEffect } from 'react';
import { api, AuctionResults as AuctionResultsType } from '../api';
import styles from './AuctionResults.module.css';

interface Props {
  auctionId: string;
}

export function AuctionResults({ auctionId }: Props) {
  const [results, setResults] = useState<AuctionResultsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overall' | number>('overall');

  useEffect(() => {
    api.getAuctionResults(auctionId)
      .then(res => setResults(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [auctionId]);

  if (loading) {
    return <div className={styles.loading}>Загрузка результатов...</div>;
  }

  if (!results) {
    return <div className={styles.error}>Не удалось загрузить результаты</div>;
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{results.stats.totalParticipants}</span>
          <span className={styles.statLabel}>участников</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{results.stats.totalBids}</span>
          <span className={styles.statLabel}>ставок</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{results.stats.totalGiftsAwarded}</span>
          <span className={styles.statLabel}>подарков</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{results.stats.totalWinners}</span>
          <span className={styles.statLabel}>победителей</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overall' ? styles.active : ''}`}
          onClick={() => setActiveTab('overall')}
        >
          🏆 Итоги
        </button>
        {results.rounds.map(round => (
          <button
            key={round.roundNumber}
            className={`${styles.tab} ${activeTab === round.roundNumber ? styles.active : ''}`}
            onClick={() => setActiveTab(round.roundNumber)}
          >
            Раунд {round.roundNumber}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {activeTab === 'overall' ? (
          <div className={styles.overallResults}>
            <h3>Победители аукциона</h3>
            {results.overallWinners.length === 0 ? (
              <div className={styles.noData}>Нет победителей</div>
            ) : (
              <div className={styles.winnersList}>
                {results.overallWinners.map((winner, idx) => (
                  <div key={winner.username} className={styles.winnerCard}>
                    <div className={styles.winnerRank}>
                      {getRankEmoji(idx + 1) || `#${idx + 1}`}
                    </div>
                    <div className={styles.winnerInfo}>
                      <span className={styles.winnerName}>{winner.username}</span>
                      <span className={styles.winnerStats}>
                        🎁 {winner.giftsWon} подарков • 💰 {winner.totalSpent} Stars
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.roundResults}>
            {results.rounds
              .filter(r => r.roundNumber === activeTab)
              .map(round => (
                <div key={round.roundNumber}>
                  <div className={styles.roundHeader}>
                    <h3>Раунд {round.roundNumber}</h3>
                    <span className={styles.roundMeta}>
                      🎁 {round.itemsCount} подарков • 📊 {round.totalBids} ставок
                    </span>
                  </div>

                  <div className={styles.section}>
                    <h4>🏆 Победители раунда</h4>
                    {round.winners.length === 0 ? (
                      <div className={styles.noData}>Нет победителей</div>
                    ) : (
                      <div className={styles.roundWinners}>
                        {round.winners.map((w, idx) => (
                          <div key={`${w.username}-${w.giftNumber}`} className={styles.roundWinner}>
                            <span className={styles.giftBadge}>🎁 #{w.giftNumber}</span>
                            <span className={styles.roundWinnerRank}>
                              {getRankEmoji(idx + 1) || `#${idx + 1}`}
                            </span>
                            <span className={styles.roundWinnerName}>{w.username}</span>
                            <span className={styles.roundWinnerAmount}>{w.amount} ⭐</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.section}>
                    <h4>📋 Все участники раунда</h4>
                    {round.participants.length === 0 ? (
                      <div className={styles.noData}>Нет участников</div>
                    ) : (
                      <div className={styles.participantsList}>
                        {round.participants.map(p => (
                          <div 
                            key={p.username} 
                            className={`${styles.participant} ${p.isWinner ? styles.isWinner : ''}`}
                          >
                            <span className={styles.pRank}>#{p.rank}</span>
                            <span className={styles.pName}>{p.username}</span>
                            <span className={styles.pAmount}>{p.amount} ⭐</span>
                            {p.isWinner && <span className={styles.pWinnerBadge}>🏆</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
