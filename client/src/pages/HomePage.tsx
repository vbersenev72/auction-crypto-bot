import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CreateAuctionModal } from '../components/CreateAuctionModal';
import styles from './HomePage.module.css';

export function HomePage() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Обновляем профиль при возврате на главную
  useEffect(() => {
    refreshProfile();
  }, []);

  const handleDeposit = async () => {
    const amount = prompt('Сколько Stars добавить?', '500');
    if (amount) {
      const { api } = await import('../api');
      await api.deposit(Number(amount));
      await refreshProfile();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.logo}>🎯 Auction</h1>
        <div className={styles.userInfo}>
          <span className={styles.username}>{user?.username}</span>
          <span className={styles.balance}>💰 {user?.availableBalance} Stars</span>
          <button onClick={handleDeposit} className={styles.depositBtn}>+</button>
          <button onClick={logout} className={styles.logoutBtn}>Выход</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.grid}>
          <button className={styles.card} onClick={() => setShowCreateModal(true)}>
            <span className={styles.cardIcon}>➕</span>
            <span className={styles.cardTitle}>Создать аукцион</span>
            <span className={styles.cardDesc}>Запустите новый аукцион</span>
          </button>

          <button className={styles.card} onClick={() => navigate('/my-auctions')}>
            <span className={styles.cardIcon}>📋</span>
            <span className={styles.cardTitle}>Мои аукционы</span>
            <span className={styles.cardDesc}>Аукционы, которые вы создали</span>
          </button>

          <button className={styles.card} onClick={() => navigate('/my-gifts')}>
            <span className={styles.cardIcon}>🎁</span>
            <span className={styles.cardTitle}>Мои подарки</span>
            <span className={styles.cardDesc}>Выигранные призы</span>
          </button>

          <button className={styles.card} onClick={() => navigate('/active-auctions')}>
            <span className={styles.cardIcon}>🔥</span>
            <span className={styles.cardTitle}>Текущие аукционы</span>
            <span className={styles.cardDesc}>Участвуйте прямо сейчас</span>
          </button>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{user?.stats.totalBidsPlaced || 0}</span>
            <span className={styles.statLabel}>Ставок</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{user?.stats.totalWins || 0}</span>
            <span className={styles.statLabel}>Побед</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{user?.stats.totalSpent || 0}</span>
            <span className={styles.statLabel}>Потрачено</span>
          </div>
        </div>
      </main>

      {showCreateModal && (
        <CreateAuctionModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

