import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Music, Play, Video, Image as ImageIcon, Users, Trophy, Dumbbell, X, Camera, Check, Star } from 'lucide-react';
import { useSocialStore } from '../stores/socialStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ExerciseVideoModal from '../components/workout/ExerciseVideoModal';
import { useRankingStore } from '../stores/rankingStore';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';

// Utility to format views counts (e.g., 1,2k, 10k, 1,2M)
function formatViews(views) {
  if (!views || views < 0) return '0';
  if (views < 1000) return `${views}`;
  if (views < 1000000) {
    const val = views / 1000;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',');
    return `${formatted}k`;
  } else {
    const val = views / 1000000;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',');
    return `${formatted}M`;
  }
}

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [selectedExercise, setSelectedExercise] = useState(null);

  // Challenge details modal state
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState('Treino Concluído');
  const [metricValue, setMetricValue] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const fileInputRef = useRef(null);

  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const { 
    challenges, 
    fetchChallenges, 
    joinChallenge, 
    leaveChallenge, 
    performCheckIn, 
    leaderboard 
  } = useRankingStore();
  const { user, profile } = useAuthStore();

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

  const isExpired = (c) => c.expires_at && new Date(c.expires_at) < new Date();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  const { 
    searchUsers, 
    searchVideos, 
    searchSounds, 
    searchChallenges,
    searchResults, 
    isSearching, 
    clearSearch 
  } = useSocialStore();
  
  const navigate = useNavigationStore((s) => s.navigate);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'users') {
        searchUsers(query);
      } else if (activeTab === 'videos') {
        searchVideos(query);
      } else if (activeTab === 'sounds') {
        searchSounds(query);
      } else {
        searchChallenges(query);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeTab, searchUsers, searchVideos, searchSounds, searchChallenges]);

  // Limpar busca ao sair
  useEffect(() => {
    return () => clearSearch();
  }, [clearSearch]);

  const handleOpenProfile = (userId) => {
    navigate('public_profile', { params: { userId } });
  };

  const handlePlaySound = (soundUrl) => {
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.play().then(() => {
      alert('Tocando prévia do som selecionado! 🎵');
      setTimeout(() => audio.pause(), 4000);
    }).catch(() => {
      alert('Som Original selecionado para gravação! 🎵');
    });
  };

  return (
    <ScreenWrapper screenKey="explore">
      {/* Liquid Bubble Animated Backgrounds */}
      <motion.div
        style={styles.bgBlob1}
        animate={{ x: [0, 50, -30, 0], y: [0, -30, 50, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={styles.bgBlob2}
        animate={{ x: [0, -40, 40, 0], y: [0, 50, -40, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div style={styles.container}>
        {/* Header with Search Bar & Filter Tabs */}
        <div style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={20} color="rgba(255,255,255,0.6)" />
            <input
              style={styles.searchInput}
              placeholder={
                activeTab === 'users'
                  ? 'Pesquisar usuários...'
                  : activeTab === 'videos'
                  ? 'Pesquisar vídeos, dicas ou treinos...'
                  : activeTab === 'sounds'
                  ? 'Pesquisar exercícios...'
                  : 'Pesquisar desafios fitness...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={styles.filterTabs}>
            {['users', 'videos', 'sounds', 'challenges'].map((tab) => (
              <button
                key={tab}
                style={{
                  ...styles.filterTab,
                  ...(activeTab === tab ? styles.filterTabActive : {}),
                }}
                onClick={() => {
                  setActiveTab(tab);
                  clearSearch();
                }}
              >
                {tab === 'users' ? 'Usuários' : tab === 'videos' ? 'Vídeos' : tab === 'sounds' ? 'Exercícios' : 'Desafios'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isSearching ? (
            <div style={styles.centerMessage}>Buscando...</div>
          ) : query.length >= 2 && searchResults.length === 0 ? (
            <div style={styles.centerMessage}>Nenhum resultado encontrado.</div>
          ) : query.length < 2 ? (
            activeTab === 'challenges' ? (
              <div style={styles.resultsList}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  ✨ Sugestões de Desafios
                </span>
                {challenges.filter(c => !isExpired(c)).slice(0, 4).map((challenge) => {
                  return (
                    <motion.div
                      key={challenge.id}
                      style={{ ...styles.challengeCard, borderLeft: `4px solid ${challenge.color || '#00D4FF'}` }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedChallenge(challenge)}
                    >
                      <div style={styles.challengeHeader}>
                        <span style={styles.challengeIcon}>{challenge.icon || '🏆'}</span>
                        <div style={styles.challengeInfo}>
                          <span style={styles.challengeTitle}>{challenge.title}</span>
                          <span style={styles.challengeDesc}>{challenge.description}</span>
                          {challenge.expires_at && (
                            <span style={{ fontSize: '11px', color: '#FF6B35', fontWeight: 500, marginTop: '2px' }}>
                              Disponível até {formatDate(challenge.expires_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={styles.challengeFooter}>
                        <span style={styles.challengeParticipants}>
                          <Users size={12} style={{ marginRight: 4 }} /> {challenge.participants || 0} participantes
                        </span>
                        <span style={{ ...styles.challengeReward, color: challenge.color || '#00D4FF' }}>
                          {challenge.duration || 30} dias • +{challenge.reward || 100} XP
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.centerMessage}>
                Digite pelo menos 2 caracteres para buscar {activeTab === 'users' ? 'usuários' : activeTab === 'videos' ? 'vídeos' : activeTab === 'sounds' ? 'exercícios' : 'desafios'}.
              </div>
            )
          ) : (
            <div style={styles.resultsList}>
              {/* Tab: Users */}
              {activeTab === 'users' && searchResults.map((u) => (
                <motion.div
                  key={u.id}
                  style={styles.userCard}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenProfile(u.id)}
                >
                  <div style={styles.avatar}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username} style={styles.avatarImg} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>
                        {u.display_name?.charAt(0) || u.username?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.userInfo}>
                    <span style={styles.displayName}>{u.display_name || u.username}</span>
                    <span style={styles.username}>@{u.username}</span>
                    <span style={styles.followers}>{u.followers || 0} seguidores</span>
                  </div>

                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </motion.div>
              ))}

              {/* Tab: Videos */}
              {activeTab === 'videos' && (
                <div style={styles.videoGrid}>
                  {searchResults.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      style={styles.videoThumb}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate('post_details', { params: { post, allPosts: searchResults, startIndex: idx } })}
                    >
                      {post.media_type === 'image' || post.media_type === 'carousel' ? (
                        <img src={post.video_url} alt="" style={styles.thumbMedia} />
                      ) : (
                        <video src={post.video_url} style={styles.thumbMedia} muted preload="metadata" />
                      )}
                      <div style={styles.videoOverlay}>
                        <div style={styles.viewsBadge}>
                          <Play size={11} fill="white" stroke="none" /> {formatViews(post.views)}
                        </div>
                        <span style={styles.thumbCaption}>{post.caption}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Tab: Exercícios */}
              {activeTab === 'sounds' && searchResults.map((sound) => (
                <motion.div
                  key={sound.id}
                  style={styles.soundRow}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedExercise(sound.caption);
                  }}
                >
                  <div style={{ ...styles.soundDisc, background: 'rgba(57,255,20,0.1)' }}>
                    <Dumbbell size={18} color="#39FF14" />
                  </div>
                  
                  <div style={styles.soundInfo}>
                    <span style={styles.soundTitle}>{sound.caption || 'Exercício Fitness'}</span>
                    <span style={styles.soundCreator}>Exercício pré-registrado</span>
                    <span style={styles.soundDuration}>Toque para ver a execução em vídeo</span>
                  </div>

                  <button 
                    style={{ ...styles.useSoundBtn, background: '#39FF14', color: '#0A0A0F', fontWeight: 'bold' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedExercise(sound.caption);
                    }}
                  >
                    Ver
                  </button>
                </motion.div>
              ))}

              {/* Tab: Challenges */}
              {activeTab === 'challenges' && searchResults.map((challenge) => {
                return (
                  <motion.div
                    key={challenge.id}
                    style={{ ...styles.challengeCard, borderLeft: `4px solid ${challenge.color || '#00D4FF'}` }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedChallenge(challenge)}
                  >
                    <div style={styles.challengeHeader}>
                      <span style={styles.challengeIcon}>{challenge.icon || '🏆'}</span>
                      <div style={styles.challengeInfo}>
                        <span style={styles.challengeTitle}>{challenge.title}</span>
                        <span style={styles.challengeDesc}>{challenge.description}</span>
                        {challenge.expires_at && (
                          <span style={{ fontSize: '11px', color: '#FF6B35', fontWeight: 500, marginTop: '2px' }}>
                            Disponível até {formatDate(challenge.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={styles.challengeFooter}>
                      <span style={styles.challengeParticipants}>
                        <Users size={12} style={{ marginRight: 4 }} /> {challenge.participants || 0} participantes
                      </span>
                      <span style={{ ...styles.challengeReward, color: challenge.color || '#00D4FF' }}>
                        {challenge.duration || 30} dias • +{challenge.reward || 100} XP
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ExerciseVideoModal
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exerciseName={selectedExercise}
      />

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
                {selectedChallenge.expires_at && (
                  <p style={{ fontSize: '12px', color: '#FF6B35', fontWeight: 600, margin: '4px 0 0 0' }}>
                    ⏳ Válido até: {formatDate(selectedChallenge.expires_at)}
                  </p>
                )}

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

                    {isExpired(selectedChallenge) ? (
                      <div style={{ ...modalStyles.completedBadge, background: 'rgba(255,45,85,0.1)', border: '1px solid #FF2D55', color: '#FF2D55', boxShadow: '0 0 12px rgba(255,45,85,0.2)' }}>
                        ⏳ Desafio Finalizado (Expirou em {formatDate(selectedChallenge.expires_at)})
                      </div>
                    ) : (selectedChallenge.progress || 0) < (selectedChallenge.duration || 30) ? (
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
                    disabled={isExpired(selectedChallenge)}
                    onClick={(e) => {
                      if (isExpired(selectedChallenge)) return;
                      handleJoin(e, selectedChallenge);
                      setSelectedChallenge(null);
                    }}
                  >
                    {isExpired(selectedChallenge) ? 'Desafio Expirado' : 'Participar do Desafio'}
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

    </ScreenWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '10%', left: '-20%', zIndex: 0, pointerEvents: 'none',
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(57,255,20,0.1) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '50%', right: '-10%', zIndex: 0, pointerEvents: 'none',
  },
  header: {
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '12px 16px',
    gap: '12px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    paddingBottom: '100px',
  },
  centerMessage: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '40px',
    fontSize: '14px',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '24px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.2)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '20px',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  displayName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  username: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  followers: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  filterTab: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.2s ease',
  },
  filterTabActive: {
    background: 'rgba(0, 212, 255, 0.15)',
    color: '#00D4FF',
    borderColor: 'rgba(0, 212, 255, 0.3)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  videoThumb: {
    aspectRatio: '9/16',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  thumbMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 8px 8px 8px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  viewsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    color: '#fff',
    fontWeight: 700,
  },
  thumbCaption: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: "'Inter', sans-serif",
  },
  soundRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    backdropFilter: 'blur(30px)',
  },
  soundDisc: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #111, #333)',
    border: '2px solid rgba(0, 212, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  soundInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  soundTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  soundCreator: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif",
  },
  soundDuration: {
    fontSize: '10px',
    color: '#39FF14',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  useSoundBtn: {
    padding: '8px 16px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  fullScreenModal: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '500px',
    height: '100%',
    background: '#000',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 'max(env(safe-area-inset-top, 0px), 16px) 16px 16px',
    display: 'flex',
    justifyContent: 'flex-start',
    zIndex: 10,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
  },
  modalCloseBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(20px)',
  },
  modalContent: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  challengeCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', marginBottom: '12px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)' },
  challengeHeader: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' },
  challengeIcon: { fontSize: '30px' },
  challengeInfo: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  challengeTitle: { fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" },
  challengeDesc: { fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", lineHeight: '1.4' },
  challengeProgressTrack: { width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '10px' },
  challengeProgressFill: { height: '100%', borderRadius: '9999px' },
  challengeFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  challengeParticipants: { fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', fontFamily: "'Inter', sans-serif" },
  challengeProgress: { fontSize: '11px', color: '#B0B0C8', fontWeight: 500, fontFamily: "'Inter', sans-serif" },
  challengeReward: { fontSize: '12px', fontWeight: 800, fontFamily: "'Inter', sans-serif" },
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
