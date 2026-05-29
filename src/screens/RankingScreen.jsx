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

function PodiumCard({ user, position }) {
  const sizes = [{ h: 140, w: 90 }, { h: 160, w: 100 }, { h: 120, w: 90 }];
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
        <span style={rowStyles.points}>{formatNum(user.points)}</span>
        <TrendIcon size={14} color={trendColor} />
      </div>
    </motion.div>
  );
}

export default function RankingScreen() {
  const { leaderboard, challenges, period, setPeriod, userRank, userPoints, fetchLeaderboard, fetchChallenges, joinChallenge, performCheckIn } = useRankingStore();
  const { screenParams, goBack, navigate } = useNavigationStore();
  const { user, profile } = useAuthStore();

  const [activeMainTab, setActiveMainTab] = useState('challenges'); // 'challenges' | 'ranking'
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  
  // Check-in state modal
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState('Treino Concluído');
  const [metricValue, setMetricValue] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const fileInputRef = useRef(null);

  // Challenge leaderboard/participants state
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  // Split challenges list
  const createdChallenges = challenges.filter(c => c.creator_id === user?.uid);
  const joinedChallenges = challenges.filter(c => c.joined && c.creator_id !== user?.uid);
  const discoverChallenges = challenges.filter(c => !c.joined);

  useEffect(() => {
    fetchLeaderboard();
    fetchChallenges();
  }, [fetchLeaderboard, fetchChallenges]);

  useEffect(() => {
    if (screenParams?.tab) {
      setActiveMainTab(screenParams.tab); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [screenParams]);

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
            <h2 style={styles.title}>{activeMainTab === 'challenges' ? 'Desafios Fitness' : 'Ranking de Líderes'}</h2>
            {activeMainTab === 'challenges' && (
              <button style={styles.createBtn} onClick={() => navigate('create', { params: { type: 'challenge' } })}>
                <Plus size={18} color="#fff" style={{ marginRight: 4 }} /> Criar
              </button>
            )}
          </div>
          
          {/* Main Tabs */}
          <div style={styles.mainTabs}>
            <button
              style={{ ...styles.mainTab, ...(activeMainTab === 'challenges' ? styles.mainTabActive : {}) }}
              onClick={() => setActiveMainTab('challenges')}
            >
              Desafios
            </button>
            <button
              style={{ ...styles.mainTab, ...(activeMainTab === 'ranking' ? styles.mainTabActive : {}) }}
              onClick={() => setActiveMainTab('ranking')}
            >
              FriendRanking
            </button>
          </div>
        </div>

        {/* Tab content: CHALLENGES */}
        {activeMainTab === 'challenges' && (
          <div style={styles.challengesTabContent}>
            {/* Section: Participando */}
            <div style={styles.sectionHeaderRow}>
              <h3 style={styles.sectionTitle}>💪 Participando ({joinedChallenges.length})</h3>
            </div>
            {joinedChallenges.length === 0 ? (
              <div style={styles.emptyChallengesCard}>
                <span style={styles.emptyText}>Você não aderiu a nenhum desafio de terceiros ainda.</span>
                <span style={styles.emptySubtext}>Dê uma olhada nos desafios disponíveis para descobrir abaixo!</span>
              </div>
            ) : (
              joinedChallenges.map(renderChallengeCard)
            )}

            {/* Section: Criados por mim */}
            <div style={{ ...styles.sectionHeaderRow, marginTop: '24px' }}>
              <h3 style={styles.sectionTitle}>🏆 Criados por Você ({createdChallenges.length})</h3>
            </div>
            {createdChallenges.length === 0 ? (
              <div style={styles.emptyChallengesCard}>
                <span style={styles.emptyText}>Você não criou nenhum desafio ainda.</span>
                <button
                  style={styles.inlineCreateBtn}
                  onClick={() => navigate('create', { params: { type: 'challenge' } })}
                >
                  Criar Primeiro Desafio
                </button>
              </div>
            ) : (
              createdChallenges.map(renderChallengeCard)
            )}

            {/* Section: Descobrir Desafios */}
            <div style={{ ...styles.sectionHeaderRow, marginTop: '24px' }}>
              <h3 style={styles.sectionTitle}>🔍 Descobrir Desafios ({discoverChallenges.length})</h3>
            </div>
            {discoverChallenges.length === 0 ? (
              <div style={styles.emptyChallengesCard}>
                <span style={styles.emptyText}>Nenhum novo desafio disponível no momento.</span>
              </div>
            ) : (
              discoverChallenges.map(renderChallengeCard)
            )}
          </div>
        )}

        {/* Tab content: RANKING */}
        {activeMainTab === 'ranking' && (
          <div>
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
          </div>
        )}
      </div>

      {/* MODAL / DRAWER: Challenge Details */}
      <AnimatePresence>
        {selectedChallenge && (
          <>
            {/* Backdrop */}
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChallenge(null)}
            />
            {/* Sheet */}
            <motion.div
              style={modalStyles.sheet}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              <div style={modalStyles.handle} />
              
              <div style={modalStyles.headerRow}>
                <div style={{ ...modalStyles.iconBg, backgroundColor: `${selectedChallenge.color}15` }}>
                  <span style={modalStyles.icon}>{selectedChallenge.icon || '🏆'}</span>
                </div>
                <div style={modalStyles.headerInfo}>
                  <h3 style={modalStyles.title}>{selectedChallenge.title}</h3>
                  <span style={{ ...modalStyles.badge, color: selectedChallenge.color, borderColor: `${selectedChallenge.color}44` }}>
                    Métrica: {getMetricLabel(selectedChallenge.type)}
                  </span>
                </div>
                <button style={modalStyles.closeBtn} onClick={() => setSelectedChallenge(null)}>
                  <X size={20} color="#fff" />
                </button>
              </div>

              {/* Description */}
              <div style={modalStyles.body}>
                <h4 style={modalStyles.subtitle}>Objetivo e Regras</h4>
                <p style={modalStyles.description}>{selectedChallenge.description || 'Sem descrição cadastrada.'}</p>

                <div style={modalStyles.statsGrid}>
                  <div style={modalStyles.statBox}>
                    <span style={modalStyles.statLabel}>Duração</span>
                    <span style={modalStyles.statValue}>{selectedChallenge.duration || 30} dias</span>
                  </div>
                  <div style={modalStyles.statBox}>
                    <span style={modalStyles.statLabel}>Recompensa</span>
                    <span style={{ ...modalStyles.statValue, color: selectedChallenge.color }}>+{selectedChallenge.reward || 100} XP</span>
                  </div>
                  <div style={modalStyles.statBox}>
                    <span style={modalStyles.statLabel}>Participantes</span>
                    <span style={modalStyles.statValue}>{selectedChallenge.participants || 0}</span>
                  </div>
                </div>

                {selectedChallenge.joined ? (
                  <>
                    {/* User progress progress fill */}
                    <div style={modalStyles.userProgressRow}>
                      <span style={modalStyles.subtitle}>Seu Progresso Atual</span>
                      <span style={modalStyles.progressText}>{selectedChallenge.progress || 0}/{selectedChallenge.duration || 30} dias completos</span>
                    </div>
                    <div style={modalStyles.progressBarTrack}>
                      <div
                        style={{
                          ...modalStyles.progressBarFill,
                          backgroundColor: selectedChallenge.color || '#00D4FF',
                          width: `${Math.round(((selectedChallenge.progress || 0) / (selectedChallenge.duration || 30)) * 100)}%`,
                        }}
                      />
                    </div>

                    {/* Leaderboard interna do Desafio */}
                    <h4 style={{ ...modalStyles.subtitle, marginTop: '20px', marginBottom: '10px' }}>📊 Quadro de Líderes do Desafio</h4>
                    <div style={modalStyles.membersList}>
                      {loadingParticipants ? (
                        <div style={modalStyles.loadingMembers}>Carregando placar...</div>
                      ) : participants.length === 0 ? (
                        <div style={modalStyles.loadingMembers}>Nenhum participante ativo ainda.</div>
                      ) : (
                        participants.map((p, idx) => (
                          <div key={p.userId} style={modalStyles.memberRow}>
                            <span style={modalStyles.memberPos}>#{idx + 1}</span>
                            <div style={modalStyles.memberAvatar}>
                              {p.photoURL ? <img src={p.photoURL} alt="" style={modalStyles.avatarImg} /> : (
                                <div style={modalStyles.avatarPlaceholder}>{p.displayName?.charAt(0)}</div>
                              )}
                            </div>
                            <span style={modalStyles.memberName}>{p.displayName}</span>
                            <span style={{ ...modalStyles.memberProgress, color: selectedChallenge.color }}>
                              {p.progress} dias
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Action Button: Checkin */}
                    <motion.button
                      style={{ ...modalStyles.actionBtn, background: selectedChallenge.color || '#00D4FF' }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setShowCheckInModal(true)}
                    >
                      Realizar Check-In Diário
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    style={{ ...modalStyles.actionBtn, background: selectedChallenge.color || '#00D4FF' }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      handleJoin(e, selectedChallenge);
                      setSelectedChallenge(null);
                    }}
                  >
                    Participar do Desafio
                  </motion.button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: Check-In Form */}
      <AnimatePresence>
        {showCheckInModal && selectedChallenge && (
          <>
            {/* Backdrop Check-in */}
            <motion.div
              style={{ ...modalStyles.backdrop, zIndex: 100000 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckInModal(false)}
            />
            {/* Card Modal Form */}
            <motion.div
              style={modalStyles.checkInModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>Check-in: {selectedChallenge.title}</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowCheckInModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>

              <div style={modalStyles.checkInForm}>
                {/* Title */}
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Título da Atividade</label>
                  <input
                    type="text"
                    placeholder="Ex: Treino de Pernas, Corrida na Esteira"
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    style={modalStyles.checkInInput}
                  />
                </div>

                {/* Metric value input if applicable */}
                {selectedChallenge.type !== 'treino' && (
                  <div style={modalStyles.checkInField}>
                    <label style={modalStyles.checkInLabel}>
                      Quantidade Realizada ({getMetricLabel(selectedChallenge.type)})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={metricValue}
                      onChange={(e) => setMetricValue(Math.max(1, parseFloat(e.target.value) || 1))}
                      style={modalStyles.checkInInput}
                    />
                  </div>
                )}

                {/* Photo Upload Area */}
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Comprovação (Foto)</label>
                  {photoPreview ? (
                    <div style={modalStyles.photoPreviewContainer}>
                      <img src={photoPreview} alt="Comprovação" style={modalStyles.photoPreviewImg} />
                      <button style={modalStyles.removePhotoBtn} onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                        <X size={16} color="#fff" />
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      style={modalStyles.photoUploadBox}
                      onClick={() => fileInputRef.current?.click()}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Camera size={24} color="#00D4FF" />
                      <span style={modalStyles.photoUploadText}>Tirar foto ou carregar print</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        style={{ display: 'none' }}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Confirm Button */}
                <motion.button
                  style={{
                    ...modalStyles.confirmBtn,
                    background: selectedChallenge.color || '#00D4FF',
                    color: selectedChallenge.color === '#FFD700' || selectedChallenge.color === '#39FF14' ? '#000' : '#fff',
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmCheckIn}
                  disabled={isSubmittingCheckIn}
                >
                  {isSubmittingCheckIn ? 'Realizando Check-in...' : 'Confirmar Check-in'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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

const challStyles = {
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', marginBottom: '4px', cursor: 'pointer', boxSizing: 'border-box' },
  header: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' },
  icon: { fontSize: '28px' },
  info: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  title: { fontSize: '15px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" },
  desc: { fontSize: '12px', color: '#6C6C88', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' },
  creatorBadge: { fontSize: '10px', fontWeight: 700, color: '#00D4FF', padding: '2px 6px', borderRadius: '6px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' },
  progressTrack: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px' },
  progressFill: { height: '100%', borderRadius: '9999px' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  participants: { fontSize: '11px', color: '#6C6C88', display: 'flex', alignItems: 'center', gap: '4px' },
  progress: { fontSize: '11px', color: '#B0B0C8', fontWeight: 600 },
  reward: { fontSize: '12px', fontWeight: 700 },
  footerDiscover: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
  joinBtn: { padding: '6px 14px', borderRadius: '8px', border: 'none', color: '#000', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
};

const modalStyles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, backdropFilter: 'blur(10px)' },
  sheet: { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '500px', background: '#0A0A0F', borderTop: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', padding: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', maxHeight: '85vh', boxSizing: 'border-box' },
  handle: { width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', alignSelf: 'center', marginBottom: '12px' },
  headerRow: { display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', width: '100%' },
  iconBg: { width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: '24px' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  title: { fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  badge: { display: 'inline-block', width: 'max-content', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', border: '1px solid' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  body: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', paddingBottom: '24px' },
  subtitle: { fontSize: '14px', fontWeight: 700, color: '#B0B0C8', fontFamily: "'Outfit', sans-serif", margin: 0 },
  description: { fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: 0, fontFamily: "'Inter', sans-serif" },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '8px 0' },
  statBox: { padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statLabel: { fontSize: '10px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" },
  statValue: { fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" },
  userProgressRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' },
  progressText: { fontSize: '12px', fontWeight: 600, color: '#fff' },
  progressBarTrack: { width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '9999px', overflow: 'hidden', marginTop: '6px' },
  progressBarFill: { height: '100%', borderRadius: '9999px', transition: 'width 0.5s ease-out' },
  actionBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', color: '#000', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", marginTop: '24px' },
  // Members List
  membersList: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '10px', maxHeight: '180px', overflowY: 'auto' },
  loadingMembers: { fontSize: '12px', color: '#6C6C88', textAlign: 'center', padding: '12px' },
  memberRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '10px' },
  memberPos: { width: '20px', fontSize: '12px', fontWeight: 700, color: '#6C6C88', textAlign: 'center' },
  memberAvatar: { width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 },
  memberName: { fontSize: '13px', fontWeight: 600, color: '#fff', flex: 1 },
  memberProgress: { fontSize: '12px', fontWeight: 700 },
  // Check-In Modal Form
  checkInModal: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', maxWidth: '420px', background: '#0F0F15', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '20px', zIndex: 101000, display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' },
  checkInHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' },
  checkInTitle: { fontSize: '16px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  checkInForm: { display: 'flex', flexDirection: 'column', gap: '14px' },
  checkInField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  checkInLabel: { fontSize: '12px', fontWeight: 600, color: '#B0B0C8', fontFamily: "'Inter', sans-serif" },
  checkInInput: { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box' },
  photoUploadBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px', border: '1px dashed rgba(0,212,255,0.3)', borderRadius: '12px', background: 'rgba(0,212,255,0.02)', cursor: 'pointer' },
  photoUploadText: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" },
  photoPreviewContainer: { position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden' },
  photoPreviewImg: { width: '100%', height: '100%', objectFit: 'cover' },
  removePhotoBtn: { position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { width: '100%', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" },
};
