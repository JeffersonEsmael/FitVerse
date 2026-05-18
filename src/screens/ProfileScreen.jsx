import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid3x3, Award, ChevronRight, ScanLine, MessageCircle, Video, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import GymBagIcon from '../components/icons/GymBagIcon';
import ShapeIcon from '../components/icons/ShapeIcon';
import VideoCard from '../components/feed/VideoCard';

function StatBox({ label, value, icon: Icon, color, onClick }) {
  return (
    <motion.div style={{...statStyles.box, cursor: onClick ? 'pointer' : 'default'}} whileTap={{ scale: 0.95 }} onClick={onClick}>
      <Icon size={16} color={color} />
      <span style={{ ...statStyles.value, color }}>{value}</span>
      <span style={statStyles.label}>{label}</span>
    </motion.div>
  );
}

export default function ProfileScreen() {
  const { user, profile, isProfileLoading } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const { fetchUserPosts, fetchGymBagVideos } = useFeedStore();
  
  const [activeProfileTab, setActiveProfileTab] = useState('videos');
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [gymBagVideos, setGymBagVideos] = useState([]);
  const [gymBagLoaded, setGymBagLoaded] = useState(false);
  
  // For full screen video viewing
  const [selectedPost, setSelectedPost] = useState(null);

  const p = profile || {};

  // Calculate total shapes dynamically
  const totalShapes = userPosts.reduce((sum, post) => sum + (post.shapes || 0), 0);

  // Fetch posts
  useEffect(() => {
    if (activeProfileTab === 'videos' && user?.uid && !postsLoaded) {
      fetchUserPosts(user.uid).then((posts) => {
        setUserPosts(posts);
        setPostsLoaded(true);
      });
    }
  }, [activeProfileTab, user?.uid, postsLoaded, fetchUserPosts]);

  // Fetch gym bag
  useEffect(() => {
    if (activeProfileTab === 'gymbag' && user?.uid && !gymBagLoaded) {
      fetchGymBagVideos(user.uid).then((videos) => {
        setGymBagVideos(videos);
        setGymBagLoaded(true);
      });
    }
  }, [activeProfileTab, user?.uid, gymBagLoaded, fetchGymBagVideos]);

  const handleDM = () => {
    navigate('conversations');
  };

  // Loading skeleton state
  if (isProfileLoading && !profile) {
    return (
      <ScreenWrapper screenKey="profile">
        <div style={styles.container}>
          <div style={{...styles.header, justifyContent: 'center'}}>
            <div style={{width: 100, height: 24, background: '#22223A', borderRadius: 12}} />
          </div>
          <div style={styles.profileCard}>
             <div style={{width: 88, height: 88, borderRadius: '50%', background: '#22223A', marginBottom: 16}} />
             <div style={{width: 150, height: 20, background: '#22223A', borderRadius: 10}} />
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenKey="profile">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.headerBtnLeft} onClick={() => navigate('create_post')}>
            <Plus size={24} color="#00D4FF" />
          </button>
          <h2 style={styles.title}>Perfil</h2>
          <button style={styles.headerBtnRight} onClick={() => navigate('edit_profile')}>
            <Settings size={22} color="#B0B0C8" />
          </button>
        </div>

        {/* Profile card */}
        <motion.div style={styles.profileCard} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h3 style={styles.usernameCenter}>@{p.username || 'user'}</h3>
          <span style={styles.displayNameCenter}>{p.display_name || 'Usuário'}</span>

          <div style={styles.statsAvatarRow}>
            <div style={styles.statsRightAligned}>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{p.total_videos || 0}</span>
                <span style={styles.statLabelInline}>posts</span>
              </div>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{p.followers || 0}</span>
                <span style={styles.statLabelInline}>seguidores</span>
              </div>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{p.following || 0}</span>
                <span style={styles.statLabelInline}>seguindo</span>
              </div>
            </div>

            <div style={styles.avatarSection}>
              <div style={styles.avatar}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={styles.avatarImg} /> : (
                  <div style={styles.avatarPlaceholder}>{p.display_name?.charAt(0) || '?'}</div>
                )}
              </div>
              <div style={styles.levelBadge}>Lv.{p.level || 1}</div>
            </div>
          </div>

          <div style={styles.bioContainer}>
            {p.bio && <p style={styles.bioCenter}>{p.bio}</p>}
            {p.fitness_goals?.length > 0 && (
              <div style={styles.goalsCenter}>
                {p.fitness_goals.map((g) => (
                  <span key={g} style={styles.goalChip}>{g}</span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
          <StatBox label="Ranking" value={`#${p.rank_position || '-'}`} icon={Award} color="#FFD700" onClick={() => navigate('ranking')} />
          <StatBox label="DM" value="Chat" icon={MessageCircle} color="#00D4FF" onClick={handleDM} />
        </div>

        {/* Quick access */}
        <div style={styles.quickAccess}>
          <motion.button
            style={styles.quickBtn}
            onClick={() => navigate('nutriscan')}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ ...styles.quickIcon, background: 'rgba(57,255,20,0.12)' }}>
              <ScanLine size={20} color="#39FF14" />
            </div>
            <div style={styles.quickInfo}>
              <span style={styles.quickTitle}>NutriScan</span>
              <span style={styles.quickDesc}>Escanear refeição com IA</span>
            </div>
            <ChevronRight size={16} color="#6C6C88" />
          </motion.button>
        </div>

        {/* Content tabs */}
        <div style={styles.contentTabs}>
          <button
            style={{ ...styles.contentTab, ...(activeProfileTab === 'videos' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('videos')}
          >
            <Grid3x3 size={18} /> Vídeos
          </button>
          <button
            style={{ ...styles.contentTab, ...(activeProfileTab === 'gymbag' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('gymbag')}
          >
            <GymBagIcon filled={false} size={18} color={activeProfileTab === 'gymbag' ? '#00D4FF' : '#6C6C88'} /> Gym Bag
          </button>
          <button
            style={{ ...styles.contentTab, ...(activeProfileTab === 'badges' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('badges')}
          >
            <Award size={18} /> Badges
          </button>
        </div>

        {/* Content - Videos */}
        {activeProfileTab === 'videos' && (
          <div style={styles.videoGrid}>
            {userPosts.length === 0 && postsLoaded ? (
              <div style={styles.emptyGrid}>
                <Video size={32} color="#6C6C88" />
                <span style={styles.emptyGridText}>Nenhum post ainda</span>
              </div>
            ) : (
              userPosts.map((post) => (
                <motion.div
                  key={post.id}
                  style={styles.videoThumb}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedPost(post)}
                >
                  {post.mediaType === 'image' ? (
                    <img src={post.videoUrl} alt="" style={styles.thumbMedia} />
                  ) : (
                    <video src={post.videoUrl} style={styles.thumbMedia} muted preload="metadata" />
                  )}
                  <div style={styles.videoOverlay}>
                    <div style={styles.viewsBadge}>
                      {post.mediaType === 'image' ? <ImageIcon size={10} /> : '▶'} {post.views || 0}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Content - Gym Bag */}
        {activeProfileTab === 'gymbag' && (
          <div style={styles.videoGrid}>
            {gymBagVideos.length === 0 && gymBagLoaded ? (
              <div style={styles.emptyGrid}>
                <GymBagIcon filled={false} size={32} color="#6C6C88" />
                <span style={styles.emptyGridText}>Posts salvos aparecerão aqui</span>
              </div>
            ) : (
              gymBagVideos.map((post) => (
                <motion.div
                  key={post.id}
                  style={styles.videoThumb}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedPost(post)}
                >
                  {post.mediaType === 'image' ? (
                    <img src={post.videoUrl} alt="" style={styles.thumbMedia} />
                  ) : (
                    <video src={post.videoUrl} style={styles.thumbMedia} muted preload="metadata" />
                  )}
                  <div style={styles.videoOverlay}>
                    <div style={styles.viewsBadge}>
                      {post.mediaType === 'image' ? <ImageIcon size={10} /> : '▶'} {post.views || 0}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Content - Badges */}
        {activeProfileTab === 'badges' && (
          <div style={styles.emptyGrid}>
            <Award size={32} color="#6C6C88" />
            <span style={styles.emptyGridText}>Conquistas em breve 🏆</span>
          </div>
        )}
      </div>

      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            style={styles.fullScreenModal}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div style={styles.modalHeader}>
              <button style={styles.modalCloseBtn} onClick={() => setSelectedPost(null)}>
                <X size={28} color="#FFF" />
              </button>
            </div>
            
            <div style={styles.modalContent}>
              <VideoCard video={selectedPost} isActive={true} index={0} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '80px' },
  header: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px', position: 'relative' },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  headerBtnLeft: { position: 'absolute', left: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  headerBtnRight: { position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  profileCard: {
    padding: '0 0 16px 0',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  usernameCenter: { fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: '0 0 4px', textAlign: 'center' },
  displayNameCenter: { fontSize: '14px', color: '#fff', marginBottom: '16px', textAlign: 'center' },
  statsAvatarRow: {
    display: 'flex',
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '16px'
  },
  statsRightAligned: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
  },
  statItemInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  statValueInline: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  statLabelInline: {
    fontSize: '14px',
    color: '#B0B0C8',
  },
  avatarSection: { position: 'relative', flexShrink: 0 },
  avatar: { width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #00D4FF', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,212,255,0.3)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '32px', fontFamily: "'Outfit', sans-serif" },
  levelBadge: { position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', borderRadius: '9999px', background: 'linear-gradient(135deg, #00D4FF, #0088CC)', color: '#fff', fontSize: '11px', fontWeight: 700, border: '2px solid #0A0A0F' },
  bioContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  bioCenter: { fontSize: '14px', color: '#B0B0C8', textAlign: 'center', lineHeight: '1.4', margin: '0 0 10px', maxWidth: '80%' },
  goalsCenter: { display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' },
  goalChip: { padding: '4px 10px', borderRadius: '9999px', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', fontSize: '12px', fontWeight: 600 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' },
  quickAccess: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  quickIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  quickInfo: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' },
  quickTitle: { fontSize: '14px', fontWeight: 600, color: '#fff' },
  quickDesc: { fontSize: '12px', color: '#6C6C88' },
  contentTabs: { display: 'flex', gap: '4px', marginBottom: '12px' },
  contentTab: { flex: 1, padding: '10px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#6C6C88', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'Inter', sans-serif" },
  contentTabActive: { background: 'rgba(0,212,255,0.1)', color: '#00D4FF', borderColor: 'rgba(0,212,255,0.2)' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '20px' },
  videoThumb: { aspectRatio: '9/16', borderRadius: '8px', background: 'linear-gradient(180deg, #1A1A2E, #22223A)', position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  thumbMedia: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  videoOverlay: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '16px 6px 6px', background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)' },
  viewsBadge: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#fff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)' },
  emptyGrid: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '40px 0', gridColumn: '1 / -1' },
  emptyGridText: { fontSize: '13px', color: '#6C6C88' },
  fullScreenModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#000',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column'
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
    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)'
  },
  modalCloseBtn: {
    background: 'rgba(0,0,0,0.4)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)'
  },
  modalContent: {
    flex: 1,
    height: '100%',
    position: 'relative'
  }
};

const statStyles = {
  box: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' },
  value: { fontSize: '18px', fontWeight: 800, fontFamily: "'Outfit', sans-serif" },
  label: { fontSize: '11px', color: '#6C6C88', fontWeight: 500 },
};
