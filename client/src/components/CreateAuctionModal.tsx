import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, CreateAuctionData } from '../api';
import styles from './CreateAuctionModal.module.css';

interface Props {
  onClose: () => void;
}

export function CreateAuctionModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [minBidAmount, setMinBidAmount] = useState(10);
  const [bidStep, setBidStep] = useState(5);

  // Rounds config
  const [rounds, setRounds] = useState([{ itemsCount: 3, durationSeconds: 60 }]);

  // Anti-sniping
  const [antiSnipingEnabled, setAntiSnipingEnabled] = useState(false);
  const [thresholdSeconds, setThresholdSeconds] = useState(10);
  const [extensionSeconds, setExtensionSeconds] = useState(30);
  const [maxExtensions, setMaxExtensions] = useState(5);

  const addRound = () => {
    setRounds([...rounds, { itemsCount: 3, durationSeconds: 60 }]);
  };

  const removeRound = (index: number) => {
    if (rounds.length > 1) {
      setRounds(rounds.filter((_, i) => i !== index));
    }
  };

  const updateRound = (index: number, field: 'itemsCount' | 'durationSeconds', value: number) => {
    const updated = [...rounds];
    updated[index] = { ...updated[index], [field]: value };
    setRounds(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: CreateAuctionData = {
        title,
        description: description || undefined,
        minBidAmount,
        bidStep,
        rounds,
      };

      if (antiSnipingEnabled) {
        data.antiSniping = {
          enabled: true,
          thresholdSeconds,
          extensionSeconds,
          maxExtensions,
        };
      }

      const result = await api.createAuction(data);
      navigate(`/auctions/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Создать аукцион</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Название аукциона</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Awesome Auction"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Описание (опционально)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание аукциона..."
              rows={2}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Мин. ставка (Stars)</label>
              <input
                type="number"
                value={minBidAmount}
                onChange={(e) => setMinBidAmount(Number(e.target.value))}
                min={1}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Шаг ставки</label>
              <input
                type="number"
                value={bidStep}
                onChange={(e) => setBidStep(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Раунды</h3>
              <button type="button" onClick={addRound} className={styles.addBtn}>+ Добавить</button>
            </div>
            {rounds.map((round, index) => (
              <div key={index} className={styles.roundRow}>
                <span className={styles.roundNum}>#{index + 1}</span>
                <div className={styles.field}>
                  <label>Подарков</label>
                  <input
                    type="number"
                    value={round.itemsCount}
                    onChange={(e) => updateRound(index, 'itemsCount', Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Длительность (сек)</label>
                  <input
                    type="number"
                    value={round.durationSeconds}
                    onChange={(e) => updateRound(index, 'durationSeconds', Number(e.target.value))}
                    min={10}
                    required
                  />
                </div>
                {rounds.length > 1 && (
                  <button type="button" onClick={() => removeRound(index)} className={styles.removeBtn}>✕</button>
                )}
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={antiSnipingEnabled}
                onChange={(e) => setAntiSnipingEnabled(e.target.checked)}
              />
              <span>Включить Anti-Sniping</span>
            </label>

            {antiSnipingEnabled && (
              <div className={styles.antiSnipingFields}>
                <div className={styles.field}>
                  <label>Порог (сек до конца)</label>
                  <input
                    type="number"
                    value={thresholdSeconds}
                    onChange={(e) => setThresholdSeconds(Number(e.target.value))}
                    min={5}
                  />
                </div>
                <div className={styles.field}>
                  <label>Продление (сек)</label>
                  <input
                    type="number"
                    value={extensionSeconds}
                    onChange={(e) => setExtensionSeconds(Number(e.target.value))}
                    min={5}
                  />
                </div>
                <div className={styles.field}>
                  <label>Макс. продлений</label>
                  <input
                    type="number"
                    value={maxExtensions}
                    onChange={(e) => setMaxExtensions(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Создание...' : 'Создать аукцион'}
          </button>
        </form>
      </div>
    </div>
  );
}

