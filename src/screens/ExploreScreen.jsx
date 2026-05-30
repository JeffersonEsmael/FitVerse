import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronRight, Music, Play, Video, Image as ImageIcon, Users, Trophy } from 'lucide-react';
import { useSocialStore } from '../stores/socialStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');

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
                  ? 'Pesquisar músicas, áudios ou sons...'
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
                {tab === 'users' ? 'Usuários' : tab === 'videos' ? 'Vídeos' : tab === 'sounds' ? 'Sons' : 'Desafios'}
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
            <div style={styles.centerMessage}>
              Digite pelo menos 2 caracteres para buscar {activeTab === 'users' ? 'usuários' : activeTab === 'videos' ? 'vídeos' : activeTab === 'sounds' ? 'sons' : 'desafios'}.
            </div>
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
                      {post.media_type === 'image' ? (
                        <img src={post.video_url} alt="" style={styles.thumbMedia} />
                      ) : (
                        <video src={post.video_url} style={styles.thumbMedia} muted preload="metadata" />
                      )}
                      <div style={styles.videoOverlay}>
                        <div style={styles.viewsBadge}>
                          {post.media_type === 'image' ? <ImageIcon size={11} /> : <Play size={11} fill="white" />} {post.views || 0}
                        </div>
                        <span style={styles.thumbCaption}>{post.caption}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Tab: Sounds */}
              {activeTab === 'sounds' && searchResults.map((sound) => (
                <motion.div
                  key={sound.id}
                  style={styles.soundRow}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePlaySound(sound.video_url)}
                >
                  <div style={styles.soundDisc}>
                    <Music size={18} color="#00D4FF" />
                  </div>
                  
                  <div style={styles.soundInfo}>
                    <span style={styles.soundTitle}>Som Original — {sound.display_name || sound.username}</span>
                    <span style={styles.soundCreator}>Criado por @{sound.username}</span>
                    <span style={styles.soundDuration}>Contém áudio de alta fidelidade</span>
                  </div>

                  <button style={styles.useSoundBtn}>Usar</button>
                </motion.div>
              ))}

              {/* Tab: Challenges */}
              {activeTab === 'challenges' && searchResults.map((challenge) => {
                const pct = Math.round(((challenge.progress || 0) / (challenge.duration || 30)) * 100);
                return (
                  <motion.div
                    key={challenge.id}
                    style={{ ...styles.challengeCard, borderLeft: `4px solid ${challenge.color || '#00D4FF'}` }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('ranking')}
                  >
                    <div style={styles.challengeHeader}>
                      <span style={styles.challengeIcon}>{challenge.icon || '🏆'}</span>
                      <div style={styles.challengeInfo}>
                        <span style={styles.challengeTitle}>{challenge.title}</span>
                        <span style={styles.challengeDesc}>{challenge.description}</span>
                      </div>
                    </div>
                    <div style={styles.challengeProgressTrack}>
                      <motion.div
                        style={{ ...styles.challengeProgressFill, background: challenge.color || '#00D4FF', width: `${pct}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                      />
                    </div>
                    <div style={styles.challengeFooter}>
                      <span style={styles.challengeParticipants}>
                        <Users size={12} style={{ marginRight: 4 }} /> {challenge.participants || 0}
                      </span>
                      <span style={styles.challengeProgress}>{challenge.progress || 0}/{challenge.duration || 30} dias</span>
                      <span style={{ ...styles.challengeReward, color: challenge.color || '#00D4FF' }}>+{challenge.reward || 100} pts</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
