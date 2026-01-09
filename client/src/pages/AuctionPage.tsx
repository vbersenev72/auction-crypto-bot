import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Auction, LeaderboardEntry } from '../api';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import styles from './AuctionPage.module.css';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'только что';
  if (seconds < 60) return `${seconds} сек назад`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч назад`;
}

function formatTimer(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function AuctionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bidAmount, setBidAmount] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [myBid, setMyBid] = useState<{ amount: number; rank?: number } | null>(null);

  // Автоподключаемся к сокету только если аукцион активен
  const shouldConnect = auction?.status === 'active';
  
  const {
    connected,
    timer,
    leaderboard,
    roundEnd,
    auctionEnd,
    clearRoundEnd,
    clearAuctionEnd,
  } = useSocket(id || null, shouldConnect);

  const fetchAuction = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getAuction(id);
      setAuction(res.data);
      setBidAmount(res.data.minBidAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load auction');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  // Fetch my bid
  useEffect(() => {
    if (!id) return;
    api.getMyBidInAuction(id).then((res) => {
      if (res.data) {
        setMyBid({ amount: res.data.amount, rank: res.data.rank });
        setBidAmount(res.data.amount + (auction?.bidStep || 5));
      }
    }).catch(() => {});
  }, [id, auction?.bidStep, leaderboard]);

  const handlePlaceBid = async () => {
    if (!id || placing) return;
    setPlacing(true);
    setError('');
    try {
      const res = await api.placeBid(id, bidAmount);
      setMyBid({ amount: res.data.amount, rank: res.data.rank });
      setBidAmount(res.data.amount + (auction?.bidStep || 5));
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    } finally {
      setPlacing(false);
    }
  };

  const handleStartAuction = async () => {
    if (!id) return;
    try {
      await api.startAuction(id);
      await fetchAuction();
      // После fetchAuction статус станет 'active' и сокет подключится автоматически
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start auction');
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Загрузка...</div></div>;
  }

  if (!auction) {
    return <div className={styles.container}><div className={styles.error}>Аукцион не найден</div></div>;
  }

  const displayLeaderboard: LeaderboardEntry[] = leaderboard.length > 0
    ? leaderboard
    : (auction.leaderboard || []);

  const currentRound = timer?.roundNumber || auction.currentRound;
  const timeLeft = timer?.timeRemaining ?? auction.currentRoundData?.timeRemaining ?? null;
  const itemsInRound = timer?.itemsCount ?? auction.currentRoundData?.bidsCount ?? 3;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backBtn}>← Назад</button>
        <div className={styles.headerInfo}>
          <h1>{auction.title}</h1>
          <span className={`${styles.status} ${styles[auction.status]}`}>
            {auction.status}
          </span>
        </div>
        <div className={styles.balance}>💰 {user?.availableBalance} Stars</div>
      </header>

      <div className={styles.main}>
        {/* Timer and Round Info */}
        {auction.status === 'active' && (
          <div className={styles.timerSection}>
            <div className={styles.roundInfo}>
              <span>Раунд {currentRound} / {auction.totalRounds}</span>
              <span>🎁 {itemsInRound} подарков</span>
            </div>
            <div className={styles.timer}>
              {timeLeft !== null ? formatTimer(timeLeft) : '--:--'}
            </div>
            {connected && <span className={styles.live}>🔴 LIVE</span>}
          </div>
        )}

        {/* Draft auction - start button */}
        {(auction.status === 'draft' || auction.status === 'pending') && auction.createdBy === user?.id && (
          <div className={styles.pendingSection}>
            <p>Аукцион готов к запуску</p>
            <button onClick={handleStartAuction} className={styles.startBtn}>
              🚀 Запустить аукцион
            </button>
          </div>
        )}

        {/* Leaderboard */}
        <div className={styles.leaderboard}>
          <h2>Лидерборд</h2>
          {displayLeaderboard.length === 0 ? (
            <div className={styles.noData}>Пока нет ставок</div>
          ) : (
            <div className={styles.leaderList}>
              {displayLeaderboard.slice(0, 10).map((entry, index) => {
                const isMe = entry.username === user?.username || entry.isCurrentUser;
                return (
                  <div
                    key={`${entry.username}-${index}`}
                    className={`${styles.leaderItem} ${entry.isWinning ? styles.winning : ''} ${isMe ? styles.isMe : ''}`}
                  >
                    <div className={styles.rank}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                    </div>
                    <div className={styles.username}>
                      {entry.username}
                      {isMe && <span className={styles.youBadge}>ВЫ</span>}
                    </div>
                    <div className={styles.bidInfo}>
                      <span className={styles.amount}>{entry.amount} ⭐</span>
                      {entry.timestamp && (
                        <span className={styles.time}>{formatTimeAgo(entry.timestamp)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* My current bid */}
        {myBid && (
          <div className={styles.myBid}>
            <span>Ваша ставка:</span>
            <span className={styles.myBidAmount}>{myBid.amount} ⭐</span>
            {myBid.rank && <span className={styles.myBidRank}>Место: #{myBid.rank}</span>}
          </div>
        )}

        {/* Bid input */}
        {auction.status === 'active' && (
          <div className={styles.bidSection}>
            <div className={styles.bidInput}>
              <button
                onClick={() => setBidAmount(Math.max(auction.minBidAmount, bidAmount - auction.bidStep))}
                className={styles.bidBtn}
              >
                -
              </button>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Number(e.target.value))}
                min={auction.minBidAmount}
              />
              <button
                onClick={() => setBidAmount(bidAmount + auction.bidStep)}
                className={styles.bidBtn}
              >
                +
              </button>
            </div>
            <button
              onClick={handlePlaceBid}
              disabled={placing || bidAmount < auction.minBidAmount}
              className={styles.placeBidBtn}
            >
              {placing ? 'Отправка...' : `Сделать ставку ${bidAmount} ⭐`}
            </button>
            {error && <div className={styles.bidError}>{error}</div>}
          </div>
        )}

        {/* Auction completed */}
        {auction.status === 'completed' && (
          <div className={styles.completed}>
            <h2>🎉 Аукцион завершён</h2>
          </div>
        )}

        {/* Round End Modal */}
        {roundEnd && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>🏆 Раунд {roundEnd.roundNumber} завершён!</h2>
              <div className={styles.winners}>
                {roundEnd.winners.map((w, i) => (
                  <div key={i} className={styles.winner}>
                    <span>🎁 Подарок #{w.giftNumber}</span>
                    <span className={styles.winnerName}>{w.username}</span>
                    <span>{w.amount} ⭐</span>
                  </div>
                ))}
              </div>
              {roundEnd.nextRound ? (
                <p>Следующий раунд: {roundEnd.nextRound}</p>
              ) : (
                <p>Это был последний раунд!</p>
              )}
              <button onClick={clearRoundEnd} className={styles.modalBtn}>
                Продолжить
              </button>
            </div>
          </div>
        )}

        {/* Auction End Modal */}
        {auctionEnd && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h2>🎉 Аукцион завершён!</h2>
              <div className={styles.finalLeaderboard}>
                {auctionEnd.finalLeaderboard.slice(0, 5).map((entry) => (
                  <div key={entry.rank} className={styles.finalEntry}>
                    <span>#{entry.rank}</span>
                    <span>{entry.username}</span>
                    <span>{entry.amount} ⭐</span>
                    {entry.won && <span className={styles.wonBadge}>🏆</span>}
                  </div>
                ))}
              </div>
              <button onClick={() => { clearAuctionEnd(); navigate('/'); }} className={styles.modalBtn}>
                На главную
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

