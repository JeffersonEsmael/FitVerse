import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, TrendingUp, TrendingDown, Minus, Star, Users, ArrowLeft, Plus, X, Camera } from 'lucide-react';
import { useRankingStore } from '../stores/rankingStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import ScreenWrapper from '../components/layout/ScreenWrapper';

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

const medals = ['🥇', '🥈', '🥉'];

function PodiumCard({ user, position, isChallenge }) {
  const sizes = [{ h: 160, w: 100 }, { h: 140, w: 90 }, { h: 120, w: 90 }];
  const s = sizes[position];
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const glows = ['rgba(255,215,0,0.4)', 'rgba(192,192,192,0.3)', 'rgba(205,127,50,0.3)'];

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
      <span style={{ ...podStyles.points, color: colors[position] }}>
        {isChallenge ? `${user.points} dias` : `${formatNum(user.points)} pts`}
      </span>
      <div style={{ ...podStyles.bar, height: s.h, background: `linear-gradient(180deg, ${colors[position]}22, ${colors[position]}08)`, borderTop: `2px solid ${colors[position]}` }}>
        <span style={{ ...podStyles.pos, color: colors[position] }}>{position + 1}</span>
      </div>
    </motion.div>
  );
}

function RankRow({ user, position, isChallenge }) {
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
      <span style={rowStyles.pos}>{position + 1}</span>
      <div style={rowStyles.avatar}>
        {user.photoURL ? <img src={user.photoURL} alt="" style={podStyles.avatarImg} /> : (
          <div style={rowStyles.avatarPlaceholder}>{user.displayName?.charAt(0)}</div>
        )}
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
        <span style={rowStyles.points}>
          {isChallenge ? `${user.points} dias` : formatNum(user.points)}
        </span>
        {!isChallenge && <TrendIcon size={14} color={trendColor} />}
      </div>
    </motion.div>
  );
}

export default function RankingScreen() {
  const { leaderboard, challenges, period, setPeriod, userRank, userPoints, fetchLeaderboard, fetchChallenges, joinChallenge, leaveChallenge, performCheckIn } = useRankingStore();
  const { screenParams, goBack, navigate } = useNavigationStore();
  const { user, profile } = useAuthStore();

  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // Challenge leaderboard/participants state
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const isChallengeRanking = !!selectedChallengeId;
  const activeChallenge = challenges.find(c => c.id === selectedChallengeId);

  const activeLeaderboard = isChallengeRanking
    ? participants.map(p => ({
        uid: p.userId,
        displayName: p.displayName,
        username: p.username,
        photoURL: p.photoURL,
        points: p.progress, // maps progress to points
        progress: p.progress,
        streak: p.progress,
        level: 1,
        trend: 'same',
        badges: [],
      }))
    : leaderboard;

  const top3 = activeLeaderboard.slice(0, 3);
  const rest = activeLeaderboard.slice(3);

  let displayRank = userRank;
  let displayPoints = userPoints;

  if (isChallengeRanking) {
    const userIndex = participants.findIndex(p => p.userId === user?.uid);
    displayRank = userIndex !== -1 ? userIndex + 1 : '-';
    displayPoints = userIndex !== -1 ? participants[userIndex].progress : 0;
  }

  // Split challenges list
  const completedChallenges = challenges.filter(c => (c.joined || c.creator_id === user?.uid) && (c.progress || 0) >= (c.duration || 30));
  const createdChallenges = challenges.filter(c => c.creator_id === user?.uid && (c.progress || 0) < (c.duration || 30));
  const joinedChallenges = challenges.filter(c => c.joined && c.creator_id !== user?.uid && (c.progress || 0) < (c.duration || 30));
  const discoverChallenges = challenges.filter(c => !c.joined);

  useEffect(() => {
    fetchLeaderboard();
    fetchChallenges();
  }, [fetchLeaderboard, fetchChallenges]);

  useEffect(() => {
    if (screenParams?.challengeId) {
      setSelectedChallengeId(screenParams.challengeId);
    }
  }, [screenParams]);

  // Load participants for the main filtered challenge ranking
  useEffect(() => {
    if (selectedChallengeId) {
      loadParticipants(selectedChallengeId);
    }
  }, [selectedChallengeId]);

  async function loadParticipants(challengeId) {
    setLoadingParticipants(true);
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          progress,
          user_id,
          profiles (
            id,
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId)
        .order('progress', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        setParticipants(data.map(p => ({
          userId: p.user_id,
          progress: p.progress,
          displayName: p.profiles?.display_name || 'Competidor',
          username: p.profiles?.username || 'user',
          photoURL: p.profiles?.avatar_url || '',
        })));
      } else {
        generateMockParticipants(challengeId);
      }
    } catch {
      generateMockParticipants(challengeId);
    } finally {
      setLoadingParticipants(false);
    }
  }

  function generateMockParticipants(challengeId) {
    const activeChallenge = challenges.find(c => c.id === challengeId) || selectedChallenge;
    if (!activeChallenge) return;

    const mock = leaderboard.slice(0, 5).map((user, idx) => ({
      userId: user.uid,
      progress: Math.max(1, Math.min(activeChallenge.duration || 30, Math.round((activeChallenge.duration || 30) * (0.8 - idx * 0.15)))),
      displayName: user.displayName,
      username: user.username,
      photoURL: user.photoURL,
    }));

    if (activeChallenge.joined && !mock.some(m => m.userId === (user?.uid || 'fituser'))) {
      mock.push({
        userId: user?.uid || 'fituser',
        progress: activeChallenge.progress || 0,
        displayName: profile?.display_name || 'Você',
        username: profile?.username || 'fituser',
        photoURL: profile?.avatar_url || '',
      });
    }

    mock.sort((a, b) => b.progress - a.progress);
    setParticipants(mock);
  }

  // Load participants for the active challenge modal
  useEffect(() => {
    if (selectedChallenge) {
      loadParticipants(selectedChallenge.id);
    }
  }, [selectedChallenge]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedChallenge) return;
    setIsSubmittingCheckIn(true);
    try {
      const res = await performCheckIn(selectedChallenge.id, {
        activityTitle,
        photoFile,
        photoPreview,
        metricValue,
      });

      if (res.success) {
        alert('Check-in diário realizado com sucesso! 💪 Pontos de XP adicionados e post de treino publicado no Feed!');
        setShowCheckInModal(false);
        setSelectedChallenge(null);
        // Reset states
        setActivityTitle('Treino Concluído');
        setMetricValue(1);
        setPhotoFile(null);
        setPhotoPreview(null);
        
        // Refresh challenges progress
        fetchChallenges();
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao realizar o check-in.');
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  const handleJoin = async (e, challenge) => {
    e.stopPropagation();
    await joinChallenge(challenge.id);
    alert(`Você aderiu ao desafio: ${challenge.title}! 🏆`);
    fetchChallenges();
  };

  const getMetricLabel = (type) => {
    const mapping = {
      treino: 'Treinos',
      minutos: 'Minutos',
      calorias: 'Calorias',
      km: 'km',
      passos: 'Passos',
    };
    return mapping[type] || 'Atividade';
  };

  const renderChallengeCard = (c) => {
    const pct = Math.round(((c.progress || 0) / (c.duration || 30)) * 100);
    return (
      <motion.div
        key={c.id}
        style={{ ...challStyles.card, borderLeft: `4px solid ${c.color || '#00D4FF'}` }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedChallenge(c)}
      >
        <div style={challStyles.header}>
          <span style={challStyles.icon}>{c.icon || '🏆'}</span>
          <div style={challStyles.info}>
            <span style={challStyles.title}>{c.title}</span>
            <span style={challStyles.desc}>{c.description}</span>
          </div>
          {c.creator_id === user?.uid && (
            <span style={challStyles.creatorBadge}>Criador</span>
          )}
        </div>
        {c.joined && (
          <>
            <div style={challStyles.progressTrack}>
              <motion.div
                style={{ ...challStyles.progressFill, background: c.color || '#00D4FF', width: `${pct}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <div style={challStyles.footer}>
              <span style={challStyles.participants}>
                <Users size={12} style={{ marginRight: 4 }} /> {c.participants || 0}
              </span>
              <span style={challStyles.progress}>{c.progress || 0}/{c.duration || 30} dias</span>
              <span style={{ ...challStyles.reward, color: c.color || '#00D4FF' }}>+{c.reward || 100} XP</span>
            </div>
          </>
        )}
        {!c.joined && (
          <div style={challStyles.footerDiscover}>
            <span style={challStyles.participants}>
              <Users size={12} style={{ marginRight: 4 }} /> {c.participants || 0} participantes
            </span>
            <button style={{ ...challStyles.joinBtn, background: c.color || '#00D4FF' }} onClick={(e) => handleJoin(e, c)}>
              Participar
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <ScreenWrapper screenKey="ranking">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <button style={styles.backBtn} onClick={goBack}>
              <ArrowLeft size={22} color="#fff" />
            </button>
            <Trophy size={22} color="#FFD700" />
            <h2 style={styles.title}>Ranking de Líderes</h2>
          </div>
        </div>

        {/* Tab content: RANKING */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Challenge selector dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '8px 16px',
            backdropFilter: 'blur(20px)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: "'Outfit', sans-serif" }}>
              Filtrar Placar:
            </span>
            <select
              value={selectedChallengeId || 'global'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedChallengeId(val === 'global' ? null : val);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#fff',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <option value="global" style={{ color: '#000', backgroundColor: '#fff' }}>🌐 Geral (Amigos)</option>
              {challenges.filter(c => c.joined || c.creator_id === user?.uid).map((c) => (
                <option key={c.id} value={c.id} style={{ color: '#000', backgroundColor: '#fff' }}>
                  {c.icon} {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Period tabs (only shown for global ranking) */}
          {!isChallengeRanking && (
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
          )}

          {/* Your rank banner */}
          <motion.div style={styles.myRank} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <div style={styles.myRankLeft}>
              <span style={styles.myRankLabel}>Sua Posição</span>
              <span style={styles.myRankPos}>{displayRank}</span>
            </div>
            <div style={styles.myRankRight}>
              <span style={styles.myRankPts}>
                {isChallengeRanking ? `${displayPoints} dias` : `${formatNum(displayPoints)} pts`}
              </span>
              {isChallengeRanking ? (
                <span style={{ fontSize: '18px' }}>{activeChallenge?.icon || '🏆'}</span>
              ) : (
                <Star size={16} color="#FFD700" />
              )}
            </div>
          </motion.div>

          {/* Podium */}
          <div style={styles.podium}>
            {[1, 0, 2].map((pos) => top3[pos] && <PodiumCard key={pos} user={top3[pos]} position={pos} isChallenge={isChallengeRanking} />)}
          </div>

          {/* Leaderboard */}
          <div style={styles.leaderboard}>
            {rest.map((user, i) => (
              <RankRow key={user.uid} user={user} position={i + 3} isChallenge={isChallengeRanking} />
            ))}
          </div>
        </div>
      </div>

    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '90px' },
  header: { marginBottom: '16px' },
  headerTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', position: 'relative' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  createBtn: { marginLeft: 'auto', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  mainTabs: { display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '4px', gap: '4px', marginTop: '8px' },
  mainTab: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' },
  mainTabActive: { background: 'rgba(0,212,255,0.12)', color: '#00D4FF', boxShadow: 'inset 0 1px 0 rgba(0,212,255,0.2)' },
  challengesTabContent: { display: 'flex', flexDirection: 'column', gap: '12px' },
  sectionHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  sectionTitle: { fontSize: '15px', fontWeight: 700, color: '#B0B0C8', fontFamily: "'Outfit', sans-serif", margin: 0 },
  emptyChallengesCard: { padding: '24px 16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' },
  emptyText: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" },
  emptySubtext: { fontSize: '12px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" },
  inlineCreateBtn: { padding: '8px 16px', borderRadius: '10px', background: '#00D4FF', border: 'none', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", marginTop: '4px' },
  // ranking specific
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tab: { flex: 1, padding: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#6C6C88', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' },
  tabActive: { background: 'rgba(0,212,255,0.15)', color: '#00D4FF', borderColor: 'rgba(0,212,255,0.3)' },
  myRank: { background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.08))', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '14px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  myRankLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  myRankLabel: { fontSize: '12px', color: '#B0B0C8', fontFamily: "'Inter', sans-serif" },
  myRankPos: { fontSize: '28px', fontWeight: 800, color: '#00D4FF', fontFamily: "'Outfit', sans-serif" },
  myRankRight: { display: 'flex', alignItems: 'center', gap: '6px' },
  myRankPts: { fontSize: '18px', fontWeight: 700, color: '#FFD700', fontFamily: "'Outfit', sans-serif" },
  podium: { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '8px', marginBottom: '24px', height: '240px' },
  leaderboard: { display: 'flex', flexDirection: 'column', gap: '6px' },
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
  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', transition: 'background 0.2s', border: '1px solid transparent' },
  highlighted: { background: 'rgba(0,212,255,0.08)', borderColor: 'rgba(0,212,255,0.15)' },
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
