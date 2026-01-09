import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Gift } from '../api';
import styles from './MyGiftsPage.module.css';

export function MyGiftsPage() {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyGifts()
      .then((res) => setGifts(res.data))
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#fbbf24',
      awarded: '#22c55e',
      claimed: '#3b82f6',
    };
    return (
      <span className={styles.badge} style={{ backgroundColor: colors[status] || '#6b7280' }}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate('/')} className={styles.backBtn}>← Назад</button>
        <h1>Мои подарки</h1>
      </header>

      {gifts.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎁</span>
          <p>У вас пока нет выигранных подарков</p>
          <button onClick={() => navigate('/active-auctions')} className={styles.joinBtn}>
            Участвовать в аукционах
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {gifts.map((gift) => (
            <div key={gift.id} className={styles.card}>
              <div className={styles.giftIcon}>🎁</div>
              <div className={styles.giftInfo}>
                <div className={styles.giftHeader}>
                  <span className={styles.giftNum}>Подарок #{gift.giftNumber}</span>
                  {getStatusBadge(gift.status)}
                </div>
                {gift.winningAmount && (
                  <div className={styles.amount}>
                    Выигран за: <span>{gift.winningAmount} Stars</span>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/auctions/${gift.auctionId}`)}
                  className={styles.viewBtn}
                >
                  Смотреть аукцион →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

