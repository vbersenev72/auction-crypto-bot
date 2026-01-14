import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Auction } from '../api';
import styles from './AuctionsPage.module.css';

export function MyAuctionsPage() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyAuctions()
      .then((res) => setAuctions(res.data))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#fbbf24',
      scheduled: '#3b82f6',
      active: '#22c55e',
      completed: '#6b7280',
      cancelled: '#dc2626',
    };
    const labels: Record<string, string> = {
      draft: 'Черновик',
      scheduled: 'Запланирован',
      active: 'Активен',
      completed: 'Завершён',
      cancelled: 'Отменён',
    };
    return (
      <span className={styles.badge} style={{ backgroundColor: colors[status] || '#6b7280' }}>
        {labels[status] || status}
      </span>
    );
  };

  const handleStart = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.startAuction(id);
    const res = await api.getMyAuctions();
    setAuctions(res.data);
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate('/')} className={styles.backBtn}>← Назад</button>
        <h1>Мои аукционы</h1>
      </header>

      {auctions.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <p>У вас пока нет аукционов</p>
          <button onClick={() => navigate('/')} className={styles.createBtn}>
            Создать аукцион
          </button>
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
                {getStatusBadge(auction.status)}
              </div>
              {auction.description && <p className={styles.desc}>{auction.description}</p>}
              <div className={styles.info}>
                <span>🎁 {auction.totalItems} подарков</span>
                <span>🔄 {auction.totalRounds} раундов</span>
                <span>💰 Мин. ставка: {auction.minBidAmount}</span>
              </div>
              {(auction.status === 'draft' || auction.status === 'scheduled') && (
                <button
                  onClick={(e) => handleStart(auction.id, e)}
                  className={styles.startBtn}
                >
                  Запустить
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

