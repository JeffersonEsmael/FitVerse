import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Grid3x3, Award, MessageCircle, Video, Image as ImageIcon, Trophy, Flame, Target, Dumbbell, Zap, Star, Plus, Check } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import { useSocialStore } from '../stores/socialStore';
import { useChatStore } from '../stores/chatStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';

// Badge definitions (same as own profile)
const BADGE_DEFINITIONS = [
  { id: 'first_post', name: 'Primeiro Post', description: 'Publicou o primeiro vídeo', icon: Video, color: '#00D4FF', gradient: 'linear-gradient(135deg, #00D4FF, #0088CC)', check: (p, posts) => posts.length >= 1 },
  { id: 'five_posts', name: '5 Posts', description: 'Publicou 5 vídeos', icon: Flame, color: '#FF9500', gradient: 'linear-gradient(135deg, #FF9500, #FF6B00)', check: (p, posts) => posts.length >= 5 },
  { id: 'ten_posts', name: '10 Posts', description: 'Publicou 10 vídeos', icon: Star, color: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)', check: (p, posts) => posts.length >= 10 },
  { id: 'first_follower', name: 'Primeiro Seguidor', description: 'Conquistou o primeiro seguidor', icon: Target, color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', check: (p) => (p.followers || 0) >= 1 },
  { id: 'ten_followers', name: 'Popular', description: '10 seguidores alcançados', icon: Zap, color: '#39FF14', gradient: 'linear-gradient(135deg, #39FF14, #00CC00)', check: (p) => (p.followers || 0) >= 10 },
  { id: 'hundred_followers', name: 'Influencer', description: '100 seguidores alcançados', icon: Trophy, color: '#FF2D55', gradient: 'linear-gradient(135deg, #FF2D55, #CC0033)', check: (p) => (p.followers || 0) >= 100 },
  { id: 'shape_collector', name: 'Shape Master', description: 'Recebeu 50 shapes em seus vídeos', icon: (props) => <ShapeIcon filled={true} size={props.size} color={props.color} />, color: '#39FF14', gradient: 'linear-gradient(135deg, #39FF14, #00E676)', check: (p, posts) => posts.reduce((sum, post) => sum + (post.shapes || 0), 0) >= 50 },
  { id: 'gym_rat', name: 'Gym Rat', description: 'Salvou 10 vídeos no Gym Bag', icon: Dumbbell, color: '#00D4FF', gradient: 'linear-gradient(135deg, #00D4FF, #00AAFF)', check: (p, posts, gymBag) => (gymBag || []).length >= 10 },
];

function StatBox({ label, value, icon: Icon, color, onClick }) {
  return (
    <motion.div 
      style={{ ...statStyles.box, cursor: onClick ? 'pointer' : 'default' }}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
    >
      <Icon size={14} color={color} />
      <div style={statStyles.textContainer}>
        <span style={statStyles.label}>{label}</span>
        <span style={{ ...statStyles.value, color }}>{value}</span>
      </div>
    </motion.div>
  );
}

function BadgeCard({ badge, unlocked, index }) {
  return (
    <motion.div
      style={{
        ...badgeStyles.card,
        opacity: unlocked ? 1 : 0.35,
        border: unlocked ? `1px solid ${badge.color}30` : '1px solid rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: unlocked ? 1 : 0.35, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div style={{
        ...badgeStyles.iconContainer,
        background: unlocked ? badge.gradient : 'rgba(255,255,255,0.05)',
        boxShadow: unlocked ? `0 4px 16px ${badge.color}30` : 'none',
      }}>
        {typeof badge.icon === 'function' ? (
          <badge.icon size={22} color={unlocked ? '#fff' : '#6C6C88'} />
        ) : (
          React.createElement(badge.icon, { size: 22, color: unlocked ? '#fff' : '#6C6C88' })
        )}
      </div>
      <span style={{
        ...badgeStyles.name,
        color: unlocked ? '#fff' : 'rgba(255,255,255,0.4)',
      }}>{badge.name}</span>
      <span style={badgeStyles.description}>{badge.description}</span>
      {unlocked && (
        <motion.div
          style={badgeStyles.unlockedBadge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          ✓
        </motion.div>
      )}
    </motion.div>
  );
}

export default function PublicProfileScreen() {
  const { user } = useAuthStore();
  const { navigate, goBack, screenParams, currentScreen } = useNavigationStore();
  const { fetchUserPosts } = useFeedStore();
  const { fetchPublicProfile, followUser, unfollowUser, checkIfFollowing } = useSocialStore();
  const { getOrCreateConversation } = useChatStore();
  
  const [activeTab, setActiveTab] = useState('videos');
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [gymBagVideos, setGymBagVideos] = useState([]);

  const userId = screenParams?.userId;

  useEffect(() => {
    if (currentScreen !== 'public_profile') return;

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
      
      // Secondary dynamic counts fetch to bypass RLS column update lags
      let followersCount = profData?.followers || 0;
      let followingCount = profData?.following || 0;
      
      try {
        const { count: fCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);
        if (fCount !== null) followersCount = fCount;

        const { count: fingCount } = await supabase
          .from('followers')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);
        if (fingCount !== null) followingCount = fingCount;
      } catch (err) {
        console.warn('Error fetching dynamic followers/following counts:', err);
      }

      // Fetch public gym bag saves
      let gymBagData = [];
      try {
        const { data } = await supabase
          .from('video_interactions')
          .select('video_id')
          .eq('user_id', userId)
          .eq('interaction_type', 'gym_bag');
        if (data) gymBagData = data;
      } catch (err) {
        console.warn('Error fetching gym bag interactions:', err);
      }

      setProfile({
        ...profData,
        followers: followersCount,
        following: followingCount
      });
      setUserPosts(postsData);
      setGymBagVideos(gymBagData);
      setIsFollowing(followingStatus);
      setIsLoading(false);
    };

    loadData();
  }, [userId, user?.uid, fetchPublicProfile, fetchUserPosts, checkIfFollowing, navigate, currentScreen]);

  const handleFollowToggle = async (e) => {
    if (e) e.stopPropagation();
    if (!user || isActionLoading) return;
    
    if (isFollowing) {
      const confirmUnfollow = window.confirm(`Deseja realmente parar de seguir @${profile.username}?`);
      if (!confirmUnfollow) return;
    }

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

  // Compute badges for this user
  const badges = useMemo(() => {
    if (!profile) return [];
    return BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      unlocked: badge.check(profile, userPosts, gymBagVideos),
    }));
  }, [profile, userPosts, gymBagVideos]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

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
      {/* Animated blobs */}
      <motion.div
        style={styles.bgBlob1}
        animate={{ x: [0, 40, -30, 0], y: [0, -30, 40, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={styles.bgBlob2}
        animate={{ x: [0, -30, 30, 0], y: [0, 40, -30, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.headerBtnLeft} onClick={() => goBack()}>
            <ChevronLeft size={28} color="#fff" />
          </button>
          <h2 style={styles.title}>{profile.username}</h2>
        </div>

        {/* Profile card */}
        <motion.div style={styles.profileCard} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div style={styles.profileCardHeader}>
            <div style={styles.profileInfoBlock}>
              <h3 style={styles.usernameLeft}>@{profile.username}</h3>
              <span style={styles.displayNameLeft}>{profile.display_name}</span>

              <div style={styles.statsRowLeft}>
                <div style={styles.statItemLeft}>
                  <span style={styles.statValueLeft}>{profile.total_videos || userPosts.length}</span>
                  <span style={styles.statLabelLeft}>posts</span>
                </div>
                <div style={styles.statItemLeft}>
                  <span style={styles.statValueLeft}>{profile.followers || 0}</span>
                  <span style={styles.statLabelLeft}>seguidores</span>
                </div>
                <div style={styles.statItemLeft}>
                  <span style={styles.statValueLeft}>{profile.following || 0}</span>
                  <span style={styles.statLabelLeft}>seguindo</span>
                </div>
              </div>
            </div>

            <div style={styles.avatarContainerRight}>
              <div style={styles.avatar}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={styles.avatarImg} /> : (
                  <div style={styles.avatarPlaceholder}>{profile.display_name?.charAt(0) || '?'}</div>
                )}
              </div>
              {user?.uid !== profile.id && (
                <motion.button
                  style={{
                    ...styles.profileFollowIconBtn,
                    backgroundColor: isFollowing ? 'rgba(255,255,255,0.1)' : '#39FF14',
                    border: isFollowing ? '2px solid rgba(255,255,255,0.3)' : '2px solid #39FF14',
                    boxShadow: isFollowing ? 'none' : '0 4px 10px rgba(57,255,20,0.4)',
                  }}
                  onClick={handleFollowToggle}
                  disabled={isActionLoading}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    rotate: isFollowing ? 360 : 0,
                    scale: isFollowing ? 1.05 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isFollowing ? (
                    <Check size={14} color="#39FF14" strokeWidth={3} />
                  ) : (
                    <Plus size={14} color="#0A0A0F" strokeWidth={3} />
                  )}
                </motion.button>
              )}
            </div>
          </div>

          <div style={styles.bioContainer}>
            {profile.bio && <p style={styles.bioCenter}>{profile.bio}</p>}
          </div>

          {/* Prominent Message button (Follow button is now the green '+' on avatar) */}
          {user?.uid !== profile.id && (
            <div style={styles.actionRow}>
              <motion.button
                style={styles.messageBtn}
                onClick={handleMessage}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle size={16} />
                <span>Mensagem</span>
              </motion.button>
            </div>
          )}

          {/* Stats inside profile card */}
          <div style={{ ...styles.statsGrid, width: '100%', marginTop: '16px', marginBottom: 0 }}>
            <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
            <StatBox label="Ranking" value={`#${profile.rank_position || '-'}`} icon={Award} color="#FFD700" />
            <StatBox label="Medalhas" value={unlockedCount} icon={Trophy} color="#FF9500" />
          </div>
        </motion.div>

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
            <Award size={18} /> Medalhas
            {unlockedCount > 0 && <span style={styles.badgeCountChip}>{unlockedCount}</span>}
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
                  onClick={() => navigate('post_details', { params: { post } })}
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
          <div style={badgeStyles.grid}>
            <div style={badgeStyles.summary}>
              <div style={badgeStyles.summaryIcon}>
                <Trophy size={24} color="#FFD700" />
              </div>
              <div style={badgeStyles.summaryInfo}>
                <span style={badgeStyles.summaryTitle}>{unlockedCount} de {badges.length} medalhas</span>
                <div style={badgeStyles.progressBar}>
                  <motion.div
                    style={{ ...badgeStyles.progressFill, width: `${(unlockedCount / badges.length) * 100}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(unlockedCount / badges.length) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
            {badges.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} unlocked={badge.unlocked} index={i} />
            ))}
          </div>
        )}
      </div>

    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '100px', position: 'relative', zIndex: 1 },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '-10%', left: '-20%', zIndex: 0, pointerEvents: 'none',
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '60%', right: '-10%', zIndex: 0, pointerEvents: 'none',
  },
  header: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', position: 'relative' },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: '-0.5px' },
  headerBtnLeft: { position: 'absolute', left: 0, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  profileCard: {
    padding: '24px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '32px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  profileCardHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: '16px',
    gap: '16px',
  },
  profileInfoBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  avatarContainerRight: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  usernameLeft: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: '0 0 4px',
    textAlign: 'left',
    letterSpacing: '-0.5px'
  },
  displayNameLeft: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px',
    textAlign: 'left'
  },
  statsRowLeft: {
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '16px',
    width: '100%',
  },
  statItemLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '55px',
  },
  statValueLeft: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  statLabelLeft: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '2px',
  },
  avatar: { width: '88px', height: '88px', borderRadius: '28px', border: '1.5px solid rgba(255,255,255,0.2)', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '32px', fontFamily: "'Outfit', sans-serif" },
  profileFollowIconBtn: {
    position: 'absolute',
    bottom: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '3px solid #0A0A0F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'all 0.2s ease',
  },
  bioContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' },
  bioCenter: { fontSize: '14px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: '1.4', margin: '0 0 12px', maxWidth: '90%' },
  actionRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    marginBottom: '8px',
  },
  messageBtn: {
    flex: 1,
    padding: '14px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    backdropFilter: 'blur(30px)',
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' },
  badgeCountChip: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#0A0A0F',
    background: '#FFD700',
    borderRadius: '10px',
    padding: '2px 6px',
    marginLeft: '2px',
  },
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    background: '#000',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column'
  },
  modalHeader: { position: 'absolute', top: 0, left: 0, right: 0, padding: 'max(env(safe-area-inset-top, 0px), 16px) 16px 16px', display: 'flex', justifyContent: 'flex-start', zIndex: 10, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' },
  modalCloseBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(20px)' },
  modalContent: { flex: 1, height: '100%', position: 'relative' }
};

const statStyles = {
  box: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', flex: 1 },
  textContainer: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' },
  value: { fontSize: '13px', fontWeight: 800, fontFamily: "'Outfit', sans-serif" },
  label: { fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
};

const badgeStyles = {
  grid: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  summary: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderRadius: '24px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)', backdropFilter: 'blur(20px)', marginBottom: '8px' },
  summaryIcon: { width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,215,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summaryInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  summaryTitle: { fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" },
  progressBar: { width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #FFD700, #FFA500)', boxShadow: '0 0 8px rgba(255,215,0,0.4)' },
  card: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', gap: '8px', position: 'relative', transition: 'all 0.2s ease' },
  iconContainer: { width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' },
  name: { fontSize: '14px', fontWeight: 700, fontFamily: "'Outfit', sans-serif", textAlign: 'center' },
  description: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: "'Inter', sans-serif" },
  unlockedBadge: { position: 'absolute', top: '12px', right: '12px', width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #39FF14, #00CC00)', color: '#0A0A0F', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(57,255,20,0.4)' },
};
