import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Users, X, Camera, Plus, Check, Star } from 'lucide-react';
import { useRankingStore } from '../../stores/rankingStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';

export default function ChallengesView() {
  const { challenges, fetchChallenges, joinChallenge, performCheckIn, leaderboard } = useRankingStore();
  const { navigate } = useNavigationStore();
  const { user, profile } = useAuthStore();

  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState('Treino Concluído');
  const [metricValue, setMetricValue] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const fileInputRef = useRef(null);

  // Challenge participants/leaderboard state
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [showAllDiscover, setShowAllDiscover] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Load participants when a challenge is selected
  useEffect(() => {
    if (selectedChallenge) {
      loadParticipants(selectedChallenge.id);
    }
  }, [selectedChallenge]);

  const loadParticipants = async (challengeId) => {
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
  };

  const generateMockParticipants = (challengeId) => {
    const activeChallenge = challenges.find(c => c.id === challengeId);
    if (!activeChallenge) return;

    const mock = leaderboard.slice(0, 5).map((u, idx) => ({
      userId: u.uid,
      progress: Math.max(1, Math.min(activeChallenge.duration || 30, Math.round((activeChallenge.duration || 30) * (0.8 - idx * 0.15)))),
      displayName: u.displayName,
      username: u.username,
      photoURL: u.photoURL,
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
  };

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
        
        // Refresh challenges
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

  // Split challenges list
  const completedChallenges = challenges.filter(c => (c.joined || c.creator_id === user?.uid) && (c.progress || 0) >= (c.duration || 30));
  const createdChallenges = challenges.filter(c => c.creator_id === user?.uid && (c.progress || 0) < (c.duration || 30));
  const joinedChallenges = challenges.filter(c => c.joined && c.creator_id !== user?.uid && (c.progress || 0) < (c.duration || 30));
  const discoverChallenges = challenges.filter(c => !c.joined);

  const renderChallengeCard = (c) => {
    const pct = Math.round(((c.progress || 0) / (c.duration || 30)) * 100);
    return (
      <motion.div
        key={c.id}
        style={{ ...challStyles.card, borderLeft: `4px solid ${c.color || '#00D4FF'}` }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
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
            <button 
              style={{ ...challStyles.joinBtn, background: c.color || '#00D4FF' }} 
              onClick={(e) => handleJoin(e, c)}
            >
              Participar
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  const renderDiscoverCard = (c) => {
    return (
      <motion.div
        key={c.id}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
          padding: '14px',
          cursor: 'pointer',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'center',
          height: '145px',
          borderTop: `4px solid ${c.color || '#00D4FF'}`,
        }}
        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedChallenge(c)}
      >
        <span style={{ fontSize: '32px', marginBottom: '4px' }}>{c.icon || '🏆'}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontFamily: "'Outfit', sans-serif" }}>
            {c.title}
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
            {c.duration || 30} dias • {c.reward || 100} XP
          </span>
        </div>
        <button
          style={{
            padding: '4px 12px',
            borderRadius: '8px',
            border: 'none',
            background: c.color || '#00D4FF',
            color: c.color === '#FFD700' || c.color === '#39FF14' ? '#000' : '#fff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Outfit', sans-serif",
            marginTop: '4px'
          }}
          onClick={(e) => handleJoin(e, c)}
        >
          Participar
        </button>
      </motion.div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>Desafios Fitness</h2>
      </div>

      <div style={styles.scrollArea}>
        {/* Section: Descobrir Desafios (2x2 Grid at the top) */}
        <div style={styles.sectionHeaderRow}>
          <h3 style={styles.sectionTitle}>🔍 Descobrir Desafios ({discoverChallenges.length})</h3>
        </div>
        {discoverChallenges.length === 0 ? (
          <div style={styles.emptyChallengesCard}>
            <span style={styles.emptyText}>Nenhum novo desafio disponível no momento.</span>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginTop: '6px'
            }}>
              {(showAllDiscover ? discoverChallenges : discoverChallenges.slice(0, 4)).map(renderDiscoverCard)}
            </div>
            {discoverChallenges.length > 4 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', marginBottom: '8px' }}>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00D4FF',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    padding: '4px 0',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onClick={() => setShowAllDiscover(prev => !prev)}
                >
                  {showAllDiscover ? 'Ver menos' : 'Ver mais desafios →'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Section: Participando */}
        <div style={{ ...styles.sectionHeaderRow, marginTop: '20px' }}>
          <h3 style={styles.sectionTitle}>💪 Participando ({joinedChallenges.length})</h3>
        </div>
        {joinedChallenges.length === 0 ? (
          <div style={styles.emptyChallengesCard}>
            <span style={styles.emptyText}>Você não aderiu a nenhum desafio ainda.</span>
            <span style={styles.emptySubtext}>Dê uma olhada nos desafios disponíveis acima!</span>
          </div>
        ) : (
          joinedChallenges.map(renderChallengeCard)
        )}

        {/* Section: Criados por Você */}
        <div style={{ ...styles.sectionHeaderRow, marginTop: '20px' }}>
          <h3 style={styles.sectionTitle}>🏆 Criados por Você ({createdChallenges.length})</h3>
        </div>
        {createdChallenges.length === 0 ? (
          <div style={styles.emptyChallengesCard}>
            <span style={styles.emptyText}>Você não criou nenhum desafio ainda.</span>
          </div>
        ) : (
          createdChallenges.map(renderChallengeCard)
        )}

        {/* Section: Concluídos */}
        <div style={{ ...styles.sectionHeaderRow, marginTop: '20px' }}>
          <h3 style={styles.sectionTitle}>✅ Concluídos ({completedChallenges.length})</h3>
        </div>
        {completedChallenges.length === 0 ? (
          <div style={styles.emptyChallengesCard}>
            <span style={styles.emptyText}>Nenhum desafio concluído ainda. Foco no objetivo! 🚀</span>
          </div>
        ) : (
          completedChallenges.map(renderChallengeCard)
        )}

        {/* Section: Criar Desafio (At the very bottom) */}
        <div style={{ ...styles.sectionHeaderRow, marginTop: '24px' }}>
          <h3 style={styles.sectionTitle}>➕ Criar Desafio</h3>
        </div>
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.06) 0%, rgba(0, 212, 255, 0.01) 100%)',
          border: '1px dashed rgba(0, 212, 255, 0.25)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '12px',
          marginTop: '6px',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '32px' }}>🎯</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Crie seu próprio Desafio!</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', maxWidth: '280px', lineHeight: '1.4' }}>
              Defina as regras, a duração e a recompensa em XP para motivar a galera da comunidade.
            </span>
          </div>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              background: '#00D4FF',
              border: 'none',
              color: '#000',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              boxShadow: '0 4px 14px rgba(0, 212, 255, 0.25)',
              marginTop: '4px'
            }}
            onClick={() => navigate('create', { params: { type: 'challenge' } })}
          >
            + Criar Novo Desafio
          </button>
        </div>
      </div>

      {/* MODAL / DRAWER: Challenge Details */}
      <AnimatePresence>
        {selectedChallenge && (
          <>
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChallenge(null)}
            />
            <motion.div
              style={modalStyles.sheet}
              initial={{ y: '100%', x: '-50%' }}
              animate={{ y: 0, x: '-50%' }}
              exit={{ y: '100%', x: '-50%' }}
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

                    <h4 style={{ ...modalStyles.subtitle, marginTop: '20px', marginBottom: '10px' }}>📊 Quadro de Líderes</h4>
                    <div style={modalStyles.membersList}>
                      {loadingParticipants ? (
                        <div style={modalStyles.loadingMembers}>Carregando placar...</div>
                      ) : participants.length === 0 ? (
                        <div style={modalStyles.loadingMembers}>Nenhum participante ativo ainda.</div>
                      ) : (
                        participants.map((p, idx) => (
                          <div key={p.userId} style={modalStyles.memberRow}>
                            <span style={modalStyles.memberPos}>{idx + 1}</span>
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

                    {(selectedChallenge.progress || 0) < (selectedChallenge.duration || 30) ? (
                      <motion.button
                        style={{ ...modalStyles.actionBtn, background: selectedChallenge.color || '#00D4FF' }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowCheckInModal(true)}
                      >
                        Realizar Check-In Diário
                      </motion.button>
                    ) : (
                      <div style={modalStyles.completedBadge}>
                        🎉 Desafio Concluído! Excelente trabalho!
                      </div>
                    )}
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
            <motion.div
              style={{ ...modalStyles.backdrop, zIndex: 100000 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckInModal(false)}
            />
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
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    background: '#0A0A0F',
    paddingTop: '64px', // Space below the Feed topBar tabs
    paddingBottom: '90px', // Space for BottomNav
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 16px 8px 16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.2)',
    padding: '6px 12px',
    borderRadius: '10px',
    color: '#00D4FF',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 16px 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '12px 0 4px 0',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#B0B0C8',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  emptyChallengesCard: {
    padding: '24px 16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
  },
  emptySubtext: {
    fontSize: '11px',
    color: '#6C6C88',
    fontFamily: "'Inter', sans-serif",
  },
  inlineCreateBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: '#00D4FF',
    border: 'none',
    color: '#000',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    marginTop: '6px',
  },
};

const challStyles = {
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '14px',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
  },
  header: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  icon: {
    fontSize: '28px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
  },
  desc: {
    fontSize: '12px',
    color: '#6C6C88',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  creatorBadge: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#00D4FF',
    padding: '2px 6px',
    borderRadius: '6px',
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid rgba(0,212,255,0.2)',
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '9999px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participants: {
    fontSize: '11px',
    color: '#6C6C88',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  progress: {
    fontSize: '11px',
    color: '#B0B0C8',
    fontWeight: 600,
  },
  reward: {
    fontSize: '12px',
    fontWeight: 700,
  },
  footerDiscover: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  joinBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    color: '#000',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
};

const modalStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 9999,
    backdropFilter: 'blur(10px)',
  },
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '500px',
    background: '#0A0A0F',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderTopLeftRadius: '32px',
    borderTopRightRadius: '32px',
    padding: '20px',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    boxSizing: 'border-box',
  },
  handle: {
    width: '36px',
    height: '4px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '2px',
    alignSelf: 'center',
    marginBottom: '12px',
  },
  headerRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '14px',
    width: '100%',
  },
  iconBg: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: '24px',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  title: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  badge: {
    display: 'inline-block',
    width: 'max-content',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '6px',
    border: '1px solid',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '16px',
    paddingBottom: '24px',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#B0B0C8',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  description: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: '1.5',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    margin: '8px 0',
  },
  statBox: {
    padding: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statLabel: {
    fontSize: '10px',
    color: '#6C6C88',
    fontFamily: "'Inter', sans-serif",
  },
  statValue: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  userProgressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  progressText: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
  },
  progressBarTrack: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginTop: '6px',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '9999px',
    transition: 'width 0.5s ease-out',
  },
  actionBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    color: '#000',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    marginTop: '24px',
  },
  completedBadge: {
    background: 'rgba(57,255,20,0.1)',
    border: '1px solid #39FF14',
    color: '#39FF14',
    padding: '14px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: '14px',
    fontFamily: "'Outfit', sans-serif",
    marginTop: '24px',
    boxShadow: '0 0 12px rgba(57,255,20,0.2)',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '10px',
    maxHeight: '180px',
    overflowY: 'auto',
  },
  loadingMembers: {
    fontSize: '12px',
    color: '#6C6C88',
    textAlign: 'center',
    padding: '12px',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 8px',
    borderRadius: '10px',
  },
  memberPos: {
    width: '20px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#6C6C88',
    textAlign: 'center',
  },
  memberAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
  },
  memberName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    flex: 1,
  },
  memberProgress: {
    fontSize: '12px',
    fontWeight: 700,
  },
  checkInModal: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    margin: 'auto',
    height: 'fit-content',
    width: '90%',
    maxWidth: '420px',
    background: '#0F0F15',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '20px',
    zIndex: 101000,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box',
  },
  checkInHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
  },
  checkInTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  checkInForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  checkInField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  checkInLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#B0B0C8',
    fontFamily: "'Inter', sans-serif",
  },
  checkInInput: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
  },
  photoUploadBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px',
    border: '1px dashed rgba(0,212,255,0.3)',
    borderRadius: '12px',
    background: 'rgba(0,212,255,0.02)',
    cursor: 'pointer',
  },
  photoUploadText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif",
  },
  photoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: '140px',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.6)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
};
