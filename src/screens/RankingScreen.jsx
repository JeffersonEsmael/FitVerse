import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, TrendingUp, TrendingDown, Minus, Star, Users } from 'lucide-react';
import { useRankingStore } from '../stores/rankingStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const medals = ['🥇', '🥈', '🥉'];

function PodiumCard({ user, position }) {
  const sizes = [{ h: 140, w: 90 }, { h: 160, w: 100 }, { h: 120, w: 90 }];
  const order = [1, 0, 2];
  const idx = order.indexOf(position);
  const s = sizes[position];
  const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
  const glows = ['rgba(192,192,192,0.3)', 'rgba(255,215,0,0.4)', 'rgba(205,127,50,0.3)'];

  return (
    <motion.div
      style={{ ...podStyles.card, width: s.w, alignSelf: 'flex-end' }}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: position * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div style={{ position: 'relative' }}>
        <div style={{ ...podStyles.avatar, border: `3px solid ${colors[position]}`, boxShadow: `0 0 15px ${glows[position]}` }}>
          {user.photoURL ? <img src={user.photoURL} alt="" style={podStyles.avatarImg} /> : (
            <div style={podStyles.avatarPlaceholder}>{user.displayName?.charAt(0)}</div>
          )}
        </div>
        <span style={podStyles.medal}>{medals[position]}</span>
      </div>
      <span style={podStyles.name}>{user.displayName?.split(' ')[0]}</span>
      <span style={{ ...podStyles.points, color: colors[position] }}>{formatNum(user.points)} pts</span>
      <div style={{ ...podStyles.bar, height: s.h, background: `linear-gradient(180deg, ${colors[position]}22, ${colors[position]}08)`, borderTop: `2px solid ${colors[position]}` }}>
        <span style={{ ...podStyles.pos, color: colors[position] }}>#{position + 1}</span>
      </div>
    </motion.div>
  );
}

function RankRow({ user, position }) {
  const TrendIcon = user.trend === 'up' ? TrendingUp : user.trend === 'down' ? TrendingDown : Minus;
  const trendColor = user.trend === 'up' ? '#39FF14' : user.trend === 'down' ? '#FF2D55' : '#6C6C88';
  const isHighlighted = user.username === 'fituser';

  return (
    <motion.div
      style={{ ...rowStyles.row, ...(isHighlighted ? rowStyles.highlighted : {}) }}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: position * 0.05 }}
      whileHover={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <span style={rowStyles.pos}>#{position + 1}</span>
      <div style={rowStyles.avatar}>
        <div style={rowStyles.avatarPlaceholder}>{user.displayName?.charAt(0)}</div>
      </div>
      <div style={rowStyles.info}>
        <span style={rowStyles.name}>{user.displayName}</span>
        <div style={rowStyles.meta}>
          <Flame size={12} color="#FF6B35" />
          <span style={rowStyles.streak}>{user.streak}d</span>
          <span style={rowStyles.level}>Lv.{user.level}</span>
        </div>
      </div>
      <div style={rowStyles.right}>
        <span style={rowStyles.points}>{formatNum(user.points)}</span>
        <TrendIcon size={14} color={trendColor} />
      </div>
    </motion.div>
  );
}

function ChallengeCard({ challenge }) {
  const pct = Math.round((challenge.progress / challenge.duration) * 100);
  return (
    <motion.div
      style={{ ...challStyles.card, borderLeft: `3px solid ${challenge.color}` }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={challStyles.header}>
        <span style={challStyles.icon}>{challenge.icon}</span>
        <div style={challStyles.info}>
          <span style={challStyles.title}>{challenge.title}</span>
          <span style={challStyles.desc}>{challenge.description}</span>
        </div>
      </div>
      <div style={challStyles.progressTrack}>
        <motion.div
          style={{ ...challStyles.progressFill, background: challenge.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <div style={challStyles.footer}>
        <span style={challStyles.participants}>
          <Users size={12} /> {challenge.participants}
        </span>
        <span style={challStyles.progress}>{challenge.progress}/{challenge.duration} dias</span>
        <span style={{ ...challStyles.reward, color: challenge.color }}>+{challenge.reward} pts</span>
      </div>
    </motion.div>
  );
}

export default function RankingScreen() {
  const { leaderboard, challenges, period, setPeriod, userRank, userPoints } = useRankingStore();
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <ScreenWrapper screenKey="ranking">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <Trophy size={24} color="#FFD700" />
            <h2 style={styles.title}>FriendRanking</h2>
          </div>
          {/* Period tabs */}
          <div style={styles.tabs}>
            {['weekly', 'monthly'].map((p) => (
              <button
                key={p}
                style={{ ...styles.tab, ...(period === p ? styles.tabActive : {}) }}
                onClick={() => setPeriod(p)}
              >
                {p === 'weekly' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>

        {/* Your rank banner */}
        <motion.div style={styles.myRank} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div style={styles.myRankLeft}>
            <span style={styles.myRankLabel}>Sua Posição</span>
            <span style={styles.myRankPos}>#{userRank}</span>
          </div>
          <div style={styles.myRankRight}>
            <span style={styles.myRankPts}>{formatNum(userPoints)} pts</span>
            <Star size={16} color="#FFD700" />
          </div>
        </motion.div>

        {/* Podium */}
        <div style={styles.podium}>
          {[1, 0, 2].map((pos) => top3[pos] && <PodiumCard key={pos} user={top3[pos]} position={pos} />)}
        </div>

        {/* Leaderboard */}
        <div style={styles.leaderboard}>
          {rest.map((user, i) => (
            <RankRow key={user.uid} user={user} position={i + 3} />
          ))}
        </div>

        {/* Challenges */}
        <div style={styles.challengeSection}>
          <h3 style={styles.sectionTitle}>🏆 Desafios Ativos</h3>
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' },
  header: { marginBottom: '16px' },
  headerTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  tabs: { display: 'flex', gap: '8px' },
  tab: { flex: 1, padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#6C6C88', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' },
  tabActive: { background: 'rgba(0,212,255,0.15)', color: '#00D4FF', borderColor: 'rgba(0,212,255,0.3)' },
  myRank: { background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.08))', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '14px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  myRankLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  myRankLabel: { fontSize: '12px', color: '#B0B0C8', fontFamily: "'Inter', sans-serif" },
  myRankPos: { fontSize: '28px', fontWeight: 800, color: '#00D4FF', fontFamily: "'Outfit', sans-serif" },
  myRankRight: { display: 'flex', alignItems: 'center', gap: '6px' },
  myRankPts: { fontSize: '18px', fontWeight: 700, color: '#FFD700', fontFamily: "'Outfit', sans-serif" },
  podium: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '8px', marginBottom: '24px', height: '260px' },
  leaderboard: { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' },
  challengeSection: { marginBottom: '32px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: '12px' },
};

const podStyles = {
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  avatar: { width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '20px', fontFamily: "'Outfit', sans-serif" },
  medal: { position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', fontSize: '20px' },
  name: { fontSize: '12px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif", textAlign: 'center', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  points: { fontSize: '11px', fontWeight: 700, fontFamily: "'Inter', sans-serif" },
  bar: { width: '100%', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8px' },
  pos: { fontSize: '18px', fontWeight: 800, fontFamily: "'Outfit', sans-serif" },
};

const rowStyles = {
  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', transition: 'background 0.2s' },
  highlighted: { background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' },
  pos: { width: '32px', fontSize: '14px', fontWeight: 700, color: '#6C6C88', fontFamily: "'Outfit', sans-serif", textAlign: 'center' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #1A1A2E, #22223A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0B0C8', fontWeight: 600, fontSize: '16px' },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  name: { fontSize: '14px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" },
  meta: { display: 'flex', alignItems: 'center', gap: '6px' },
  streak: { fontSize: '11px', color: '#FF6B35', fontWeight: 600 },
  level: { fontSize: '11px', color: '#6C6C88' },
  right: { display: 'flex', alignItems: 'center', gap: '6px' },
  points: { fontSize: '14px', fontWeight: 700, color: '#FFD700', fontFamily: "'Inter', sans-serif" },
};

const challStyles = {
  card: { background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px', marginBottom: '10px', cursor: 'pointer' },
  header: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' },
  icon: { fontSize: '28px' },
  info: { display: 'flex', flexDirection: 'column', gap: '2px' },
  title: { fontSize: '15px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" },
  desc: { fontSize: '12px', color: '#6C6C88' },
  progressTrack: { width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '8px' },
  progressFill: { height: '100%', borderRadius: '9999px' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  participants: { fontSize: '11px', color: '#6C6C88', display: 'flex', alignItems: 'center', gap: '4px' },
  progress: { fontSize: '11px', color: '#B0B0C8', fontWeight: 500 },
  reward: { fontSize: '12px', fontWeight: 700 },
};
