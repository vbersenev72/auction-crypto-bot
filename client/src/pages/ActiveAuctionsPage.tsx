import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Auction } from '../api';
import styles from './AuctionsPage.module.css';

export function ActiveAuctionsPage() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuctions('active')
      .then((res) => setAuctions(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate('/')} className={styles.backBtn}>← Назад</button>
        <h1>Активные аукционы</h1>
      </header>

      {auctions.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔥</span>
          <p>Сейчас нет активных аукционов</p>
        </div>
      ) : (
        <div className={styles.list}>
          {auctions.map((auction) => (
            <div
              key={auction.id}
              className={styles.card}
              onClick={() => navigate(`/auctions/${auction.id}`)}
            >
              <div className={styles.cardHeader}>
                <h3>{auction.title}</h3>
                <span className={styles.liveBadge}>🔴 LIVE</span>
              </div>
              {auction.description && <p className={styles.desc}>{auction.description}</p>}
              <div className={styles.info}>
                <span>🎁 {auction.totalItems} подарков</span>
                <span>🔄 Раунд {auction.currentRound}/{auction.totalRounds}</span>
                <span>💰 Мин. ставка: {auction.minBidAmount}</span>
              </div>
              {auction.currentRoundData && (
                <div className={styles.roundInfo}>
                  <span>⏱️ {auction.currentRoundData.timeRemaining}с</span>
                  <span>📊 {auction.currentRoundData.bidsCount} ставок</span>
                  <span>🏆 Топ: {auction.currentRoundData.highestBid}</span>
                </div>
              )}
              <button className={styles.enterBtn}>Войти →</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

