import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid3x3, Award, ChevronRight, ScanLine, MessageCircle, Video, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import GymBagIcon from '../components/icons/GymBagIcon';
import ShapeIcon from '../components/icons/ShapeIcon';
import VideoCard from '../components/feed/VideoCard';

function StatBox({ label, value, icon: Icon, color, onClick }) {
  return (
    <motion.div style={{...statStyles.box, cursor: onClick ? 'pointer' : 'default'}} whileTap={onClick ? { scale: 0.95 } : {}} onClick={onClick}>
      <Icon size={14} color={color} />
      <div style={statStyles.textContainer}>
        <span style={statStyles.label}>{label}</span>
        <span style={{ ...statStyles.value, color }}>{value}</span>
      </div>
    </motion.div>
  );
}

export default function ProfileScreen() {
  const { user, profile, isProfileLoading, refreshProfile } = useAuthStore();
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

  const [followersCount, setFollowersCount] = useState(p.followers || 0);
  const [followingCount, setFollowingCount] = useState(p.following || 0);

  // Sync state with profile updates
  useEffect(() => {
    if (profile) {
      setFollowersCount(profile.followers || 0);
      setFollowingCount(profile.following || 0);
    }
  }, [profile]);

  // Fetch real-time count from DB directly (bypassing RLS update latency)
  useEffect(() => {
    if (user?.uid) {
      supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.uid)
        .then(({ count }) => {
          if (count !== null) setFollowersCount(count);
        });

      supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.uid)
        .then(({ count }) => {
          if (count !== null) setFollowingCount(count);
        });
    }
  }, [user?.uid]);

  // Calculate total shapes dynamically
  const totalShapes = userPosts.reduce((sum, post) => sum + (post.shapes || 0), 0);

  // Refresh profile on mount to ensure real-time data
  useEffect(() => {
    if (user?.uid) {
      refreshProfile();
      fetchUserPosts(user.uid).then((posts) => {
        setUserPosts(posts);
        setPostsLoaded(true);
      });
    }
  }, [user?.uid, refreshProfile, fetchUserPosts]);

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
    if (activeProfileTab === 'gymbag' && user?.uid) {
      setGymBagLoaded(false);
      fetchGymBagVideos(user.uid).then((videos) => {
        setGymBagVideos(videos);
        setGymBagLoaded(true);
      });
    }
  }, [activeProfileTab, user?.uid, fetchGymBagVideos]);

  const handleDM = () => {
    navigate('conversations');
  };

  // Loading skeleton state
  if (isProfileLoading && !profile) {
    return (
      <ScreenWrapper screenKey="profile">
        <div style={styles.container}>
          <div style={{...styles.header, justifyContent: 'center'}}>
            <div style={{width: 100, height: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 12}} />
          </div>
          <div style={styles.profileCard}>
             <div style={{width: 88, height: 88, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', marginBottom: 16}} />
             <div style={{width: 150, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: 10}} />
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenKey="profile">
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
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.headerBtnLeft} onClick={() => navigate('create')}>
            <Plus size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Perfil</h2>
          <button style={styles.headerBtnRight} onClick={() => navigate('settings')}>
            <Settings size={22} color="#fff" />
          </button>
        </div>

        {/* Profile card - Glassmorphism */}
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
                <span style={styles.statValueInline}>{followersCount}</span>
                <span style={styles.statLabelInline}>seguidores</span>
              </div>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{followingCount}</span>
                <span style={styles.statLabelInline}>seguindo</span>
              </div>
            </div>

            <div style={styles.avatarSection}>
              <div style={styles.avatar}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={styles.avatarImg} /> : (
                  <div style={styles.avatarPlaceholder}>{p.display_name?.charAt(0) || '?'}</div>
                )}
              </div>
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

          {/* Stats inside profile card */}
          <div style={{ ...styles.statsGrid, width: '100%', marginTop: '24px', marginBottom: 0 }}>
            <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
            <StatBox label="Ranking" value={`#${p.rank_position || '-'}`} icon={Award} color="#FFD700" onClick={() => navigate('ranking')} />
            <StatBox label="Mensagem" value="Chat" icon={MessageCircle} color="#00D4FF" onClick={handleDM} />
          </div>
        </motion.div>

        {/* Quick access */}
        <div style={styles.quickAccess}>
          <motion.button
            style={styles.quickBtn}
            onClick={() => navigate('nutriscan')}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ ...styles.quickIcon, background: 'rgba(255,255,255,0.1)' }}>
              <ScanLine size={20} color="#fff" />
            </div>
            <div style={styles.quickInfo}>
              <span style={styles.quickTitle}>NutriScan</span>
              <span style={styles.quickDesc}>Escanear refeição com IA</span>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
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
            <GymBagIcon filled={false} size={18} color={activeProfileTab === 'gymbag' ? '#fff' : 'rgba(255,255,255,0.6)'} /> Gym Bag
          </button>
          <button
            style={{ ...styles.contentTab, ...(activeProfileTab === 'badges' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('badges')}
          >
            <Award size={18} /> Medalhas
          </button>
        </div>

        {/* Content - Videos */}
        {activeProfileTab === 'videos' && (
          <div style={styles.videoGrid}>
            {userPosts.length === 0 && postsLoaded ? (
              <div style={styles.emptyGrid}>
                <Video size={32} color="rgba(255,255,255,0.4)" />
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
                <GymBagIcon filled={false} size={32} color="rgba(255,255,255,0.4)" />
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
            <Award size={32} color="rgba(255,255,255,0.4)" />
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
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '100px', position: 'relative', zIndex: 1 },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(0,122,255,0.2) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '-5%', left: '-10%', zIndex: 0,
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(88,86,214,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '30%', right: '-10%', zIndex: 0,
  },
  header: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', position: 'relative' },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: '-0.5px' },
  headerBtnLeft: { position: 'absolute', left: 0, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  headerBtnRight: { position: 'absolute', right: 0, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  profileCard: {
    padding: '24px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '32px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  usernameCenter: { fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: '0 0 4px', textAlign: 'center', letterSpacing: '-0.5px' },
  displayNameCenter: { fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', textAlign: 'center' },
  statsAvatarRow: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    marginBottom: '20px'
  },
  statsRightAligned: {
    display: 'flex',
    gap: '20px',
  },
  statItemInline: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValueInline: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  statLabelInline: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  avatarSection: { position: 'relative', flexShrink: 0 },
  avatar: { width: '100px', height: '100px', borderRadius: '32px', border: '2px solid rgba(255,255,255,0.2)', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '36px', fontFamily: "'Outfit', sans-serif" },
  bioContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: '8px'
  },
  bioCenter: { fontSize: '15px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: '1.5', margin: '0 0 16px', maxWidth: '90%' },
  goalsCenter: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' },
  goalChip: { padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(10px)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' },
  quickAccess: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' },
  quickBtn: { display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '16px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontFamily: "'Inter', sans-serif", backdropFilter: 'blur(30px)', boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)' },
  quickIcon: { width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' },
  quickInfo: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' },
  quickTitle: { fontSize: '16px', fontWeight: 700, color: '#fff' },
  quickDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.6)' },
  contentTabs: { display: 'flex', gap: '8px', marginBottom: '16px' },
  contentTab: { flex: 1, padding: '14px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: "'Inter', sans-serif", backdropFilter: 'blur(20px)' },
  contentTabActive: { background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)' },
  videoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' },
  videoThumb: { aspectRatio: '9/16', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden', cursor: 'pointer' },
  thumbMedia: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  videoOverlay: { position: 'absolute', bottom: '0', left: '0', right: '0', padding: '24px 10px 10px', background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)' },
  viewsBadge: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#fff', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  emptyGrid: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 0', gridColumn: '1 / -1', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' },
  emptyGridText: { fontSize: '14px', color: 'rgba(255,255,255,0.5)' },
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
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(20px)'
  },
  modalContent: {
    flex: 1,
    height: '100%',
    position: 'relative'
  }
};

const statStyles = {
  box: { 
    display: 'flex', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '8px', 
    padding: '10px 8px', 
    borderRadius: '20px', 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.08)', 
    backdropFilter: 'blur(20px)', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    flex: 1
  },
  textContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'flex-start', 
    gap: '1px' 
  },
  value: { 
    fontSize: '13px', 
    fontWeight: 800, 
    fontFamily: "'Outfit', sans-serif" 
  },
  label: { 
    fontSize: '10px', 
    color: 'rgba(255,255,255,0.5)', 
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif"
  },
};
