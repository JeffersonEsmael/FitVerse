import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Grid3x3, Award, MessageCircle, Video, Image as ImageIcon, X } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import { useSocialStore } from '../stores/socialStore';
import { useChatStore } from '../stores/chatStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';
import VideoCard from '../components/feed/VideoCard';

function StatBox({ label, value, icon: Icon, color }) {
  return (
    <div style={statStyles.box}>
      <Icon size={16} color={color} />
      <span style={{ ...statStyles.value, color }}>{value}</span>
      <span style={statStyles.label}>{label}</span>
    </div>
  );
}

export default function PublicProfileScreen() {
  const { user } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const { screenParams } = useNavigationStore((s) => s);
  const { fetchUserPosts } = useFeedStore();
  const { fetchPublicProfile, followUser, unfollowUser, checkIfFollowing } = useSocialStore();
  const { getOrCreateConversation } = useChatStore();
  
  const [activeTab, setActiveTab] = useState('videos');
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const userId = screenParams?.userId;

  useEffect(() => {
    if (!userId) {
      navigate('explore');
      return;
    }

    if (user?.uid === userId) {
      navigate('profile'); // redirect to own profile
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      const [profData, postsData, followingStatus] = await Promise.all([
        fetchPublicProfile(userId),
        fetchUserPosts(userId),
        checkIfFollowing(user?.uid, userId)
      ]);
      
      setProfile(profData);
      setUserPosts(postsData);
      setIsFollowing(followingStatus);
      setIsLoading(false);
    };

    loadData();
  }, [userId, user?.uid, fetchPublicProfile, fetchUserPosts, checkIfFollowing, navigate]);

  const handleFollowToggle = async () => {
    if (!user || isActionLoading) return;
    setIsActionLoading(true);
    
    // Optimistic UI update
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);
    setProfile(p => ({
      ...p,
      followers: p.followers + (!isFollowing ? 1 : -1)
    }));

    let result;
    if (!isFollowing) {
      result = await followUser(user.uid, userId);
    } else {
      result = await unfollowUser(user.uid, userId);
    }

    // Revert on error
    if (!result.success) {
      setIsFollowing(previousState);
      setProfile(p => ({
        ...p,
        followers: p.followers + (previousState ? 1 : -1)
      }));
    }
    
    setIsActionLoading(false);
  };

  const handleMessage = async () => {
    if (!user || !profile) return;
    const conversationId = await getOrCreateConversation(user.uid, profile.id);
    if (conversationId) {
      navigate('messages', {
        params: {
          conversationId,
          otherUser: {
            id: profile.id,
            display_name: profile.display_name,
            username: profile.username,
            avatar_url: profile.avatar_url
          }
        }
      });
    }
  };

  if (isLoading || !profile) {
    return (
      <ScreenWrapper screenKey="public_profile">
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

  const totalShapes = userPosts.reduce((sum, post) => sum + (post.shapes || 0), 0);

  return (
    <ScreenWrapper screenKey="public_profile">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.headerBtnLeft} onClick={() => navigate('explore')}>
            <ChevronLeft size={28} color="#fff" />
          </button>
          <h2 style={styles.title}>{profile.username}</h2>
        </div>

        {/* Profile card */}
        <motion.div style={styles.profileCard} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h3 style={styles.usernameCenter}>@{profile.username}</h3>
          <span style={styles.displayNameCenter}>{profile.display_name}</span>

          <div style={styles.statsAvatarRow}>
            <div style={styles.statsRightAligned}>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{profile.total_videos || userPosts.length}</span>
                <span style={styles.statLabelInline}>posts</span>
              </div>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{profile.followers || 0}</span>
                <span style={styles.statLabelInline}>seguidores</span>
              </div>
              <div style={styles.statItemInline}>
                <span style={styles.statValueInline}>{profile.following || 0}</span>
                <span style={styles.statLabelInline}>seguindo</span>
              </div>
            </div>

            <div style={styles.avatarSection}>
              <div style={styles.avatar}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={styles.avatarImg} /> : (
                  <div style={styles.avatarPlaceholder}>{profile.display_name?.charAt(0) || '?'}</div>
                )}
              </div>
              <div style={styles.levelBadge}>Lv.{profile.level || 1}</div>
            </div>
          </div>

          <div style={styles.bioContainer}>
            {profile.bio && <p style={styles.bioCenter}>{profile.bio}</p>}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionRow}>
            <motion.button 
              style={{...styles.followBtn, background: isFollowing ? 'rgba(255,255,255,0.1)' : '#00D4FF', color: isFollowing ? '#fff' : '#0A0A0F'}}
              onClick={handleFollowToggle}
              whileTap={{ scale: 0.95 }}
            >
              {isFollowing ? 'Seguindo' : 'Seguir'}
            </motion.button>
            <motion.button 
              style={styles.messageBtn}
              onClick={handleMessage}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle size={18} />
              Mensagem
            </motion.button>
          </div>
        </motion.div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
          <StatBox label="Ranking" value={`#${profile.rank_position || '-'}`} icon={Award} color="#FFD700" />
        </div>

        {/* Content tabs */}
        <div style={styles.contentTabs}>
          <button
            style={{ ...styles.contentTab, ...(activeTab === 'videos' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveTab('videos')}
          >
            <Grid3x3 size={18} /> Vídeos
          </button>
          <button
            style={{ ...styles.contentTab, ...(activeTab === 'badges' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveTab('badges')}
          >
            <Award size={18} /> Badges
          </button>
        </div>

        {/* Content - Videos */}
        {activeTab === 'videos' && (
          <div style={styles.videoGrid}>
            {userPosts.length === 0 ? (
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

        {/* Content - Badges */}
        {activeTab === 'badges' && (
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
  title: { fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  headerBtnLeft: { position: 'absolute', left: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
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
  statItemInline: { display: 'flex', alignItems: 'center', gap: '4px' },
  statValueInline: { fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" },
  statLabelInline: { fontSize: '14px', color: '#B0B0C8' },
  avatarSection: { position: 'relative', flexShrink: 0 },
  avatar: { width: '88px', height: '88px', borderRadius: '50%', border: '3px solid #00D4FF', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,212,255,0.3)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '32px', fontFamily: "'Outfit', sans-serif" },
  levelBadge: { position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', padding: '2px 10px', borderRadius: '9999px', background: 'linear-gradient(135deg, #00D4FF, #0088CC)', color: '#fff', fontSize: '11px', fontWeight: 700, border: '2px solid #0A0A0F' },
  bioContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: '16px' },
  bioCenter: { fontSize: '14px', color: '#B0B0C8', textAlign: 'center', lineHeight: '1.4', margin: '0 0 10px', maxWidth: '80%' },
  actionRow: { display: 'flex', gap: '12px', width: '100%', padding: '0 16px' },
  followBtn: { flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  messageBtn: { flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: "'Inter', sans-serif" },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' },
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
  fullScreenModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' },
  modalHeader: { position: 'absolute', top: 0, left: 0, right: 0, padding: 'max(env(safe-area-inset-top, 0px), 16px) 16px 16px', display: 'flex', justifyContent: 'flex-start', zIndex: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' },
  modalCloseBtn: { background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' },
  modalContent: { flex: 1, height: '100%', position: 'relative' }
};

const statStyles = {
  box: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' },
  value: { fontSize: '18px', fontWeight: 800, fontFamily: "'Outfit', sans-serif" },
  label: { fontSize: '11px', color: '#6C6C88', fontWeight: 500 },
};
