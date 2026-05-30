import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid3x3, Award, ChevronRight, ScanLine, MessageCircle, Video, Image as ImageIcon, Plus, Trophy, Flame, Target, Dumbbell, Zap, Star, X, Camera } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import { useRankingStore } from '../stores/rankingStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import GymBagIcon from '../components/icons/GymBagIcon';
import ShapeIcon from '../components/icons/ShapeIcon';
import ProfileChallengeCard from '../components/profile/ProfileChallengeCard';

// Badge definitions with unlock criteria
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
    <motion.div style={{...statStyles.box, cursor: onClick ? 'pointer' : 'default'}} whileTap={onClick ? { scale: 0.95 } : {}} onClick={onClick}>
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
        opacity: unlocked ? 1 : 0.4,
        border: unlocked ? `1px solid ${badge.color}30` : '1px solid rgba(255,255,255,0.05)',
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: unlocked ? 1 : 0.4, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div style={{
        ...badgeStyles.iconContainer,
        background: unlocked ? badge.gradient : 'rgba(255,255,255,0.05)',
        boxShadow: unlocked ? `0 4px 16px ${badge.color}30` : 'none',
      }}>
        {typeof badge.icon === 'string' ? (
          <span style={{ fontSize: '24px' }}>{badge.icon}</span>
        ) : typeof badge.icon === 'function' ? (
          <badge.icon size={24} color={unlocked ? '#fff' : '#6C6C88'} />
        ) : (
          React.createElement(badge.icon, { size: 24, color: unlocked ? '#fff' : '#6C6C88' })
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

function ChallengeCarousel({ challenge }) {
  const photos = challenge.checkins || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  if (photos.length === 0) {
    return (
      <div style={tabStyles.emptyCarousel}>
        <span style={{ fontSize: '32px', marginBottom: '8px' }}>📸</span>
        <span style={tabStyles.emptyCarouselText}>Nenhuma foto de check-in realizada ainda</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textAlign: 'center', padding: '0 20px' }}>
          Realize check-ins diários com foto para criar seu diário visual do desafio!
        </span>
      </div>
    );
  }

  const handlePrev = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (diff > 50) {
      handleNext(e);
    } else if (diff < -50) {
      handlePrev(e);
    }
    setTouchStart(null);
  };

  return (
    <div 
      style={tabStyles.carouselContainer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={photos[activeIndex].photo_url}
        alt={photos[activeIndex].activity_title || ''}
        style={tabStyles.carouselImg}
      />
      <div style={tabStyles.carouselCaption}>
        <span style={tabStyles.carouselCaptionText}>
          {photos[activeIndex].activity_title || 'Treino Concluído'}
        </span>
        <span style={tabStyles.carouselDate}>
          {new Date(photos[activeIndex].created_at).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {photos.length > 1 && (
        <>
          <button onClick={handlePrev} style={{ ...tabStyles.arrowBtn, left: '12px' }}>‹</button>
          <button onClick={handleNext} style={{ ...tabStyles.arrowBtn, right: '12px' }}>›</button>

          <div style={tabStyles.indicators}>
            {photos.map((_, idx) => (
              <span
                key={idx}
                style={{
                  ...tabStyles.dot,
                  backgroundColor: idx === activeIndex ? (challenge.color || '#00D4FF') : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProfileScreen() {
  const { user, profile, isProfileLoading, refreshProfile } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const currentScreen = useNavigationStore((s) => s.currentScreen);
  const { fetchUserPosts, fetchGymBagVideos } = useFeedStore();
  const { fetchChallenges, performCheckIn } = useRankingStore();
  
  const [activeProfileTab, setActiveProfileTab] = useState('videos');
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [gymBagVideos, setGymBagVideos] = useState([]);
  const [gymBagLoaded, setGymBagLoaded] = useState(false);
  const [showMedalsModal, setShowMedalsModal] = useState(false);
  const [profileChallenges, setProfileChallenges] = useState([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activityTitle, setActivityTitle] = useState('Treino Concluído');
  const [metricValue, setMetricValue] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const fileInputRef = React.useRef(null);

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
        loadProfileChallenges();
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao realizar o check-in.');
    } finally {
      setIsSubmittingCheckIn(false);
    }
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

  const filteredUserPosts = useMemo(() => {
    return userPosts.filter((post) => post.category !== 'desafio');
  }, [userPosts]);

  // Compute badges
  const badges = useMemo(() => {
    return BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      unlocked: badge.check({ ...p, followers: followersCount }, userPosts, gymBagVideos),
    }));
  }, [p, followersCount, userPosts, gymBagVideos]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const completedChallengesCount = useMemo(() => {
    return profileChallenges.filter(c => (c.progress || 0) >= (c.duration || 30)).length;
  }, [profileChallenges]);

  const challengeMedals = useMemo(() => {
    return profileChallenges
      .filter(c => (c.progress || 0) >= (c.duration || 30))
      .map(c => ({
        id: `completed_challenge_${c.id}`,
        name: `Desafio: ${c.title}`,
        description: `Concluiu o desafio de ${c.duration} dias!`,
        icon: c.icon || '🏆',
        color: c.color || '#FFD700',
        gradient: `linear-gradient(135deg, ${c.color || '#FFD700'}, #FFA500)`,
        unlocked: true,
      }));
  }, [profileChallenges]);

  const allBadgesAndMedals = useMemo(() => {
    return [...badges, ...challengeMedals];
  }, [badges, challengeMedals]);

  const totalMedalsCount = unlockedCount + completedChallengesCount;

  // Refresh profile when screen becomes active to ensure real-time data
  useEffect(() => {
    if (currentScreen === 'profile' && user?.uid) {
      refreshProfile();
      fetchUserPosts(user.uid).then((posts) => {
        setUserPosts(posts);
        setPostsLoaded(true);
      });
      fetchGymBagVideos(user.uid).then((videos) => {
        setGymBagVideos(videos);
        setGymBagLoaded(true);
      });
      fetchChallenges();
    }
  }, [currentScreen, user?.uid, refreshProfile, fetchUserPosts, fetchGymBagVideos, fetchChallenges]);

  const loadProfileChallenges = useCallback(async () => {
    if (!user?.uid) return;
    await Promise.resolve();
    setIsLoadingChallenges(true);
    try {
      // Step 1: Fetch participations (simple query, no embedded join)
      const { data: participations, error: partError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, progress')
        .eq('user_id', user.uid);

      if (partError) throw partError;
      console.log('[Profile] Participations found:', participations?.length || 0);

      if (participations && participations.length > 0) {
        const challengeIds = participations.map((p) => p.challenge_id);

        // Step 2: Fetch challenges by IDs
        const { data: challengesData, error: chalError } = await supabase
          .from('challenges')
          .select('*')
          .in('id', challengeIds);

        if (chalError) throw chalError;
        console.log('[Profile] Challenges fetched:', challengesData?.length || 0);

        // Step 3: Fetch checkins for each challenge
        const enriched = (await Promise.all((challengesData || []).map(async (challenge) => {
          const participation = participations.find((p) => p.challenge_id === challenge.id);
          const { data: checkins } = await supabase
            .from('challenge_checkins')
            .select('photo_url, created_at, activity_title')
            .eq('challenge_id', challenge.id)
            .eq('user_id', user.uid)
            .order('created_at', { ascending: false });

          return {
            ...challenge,
            progress: participation?.progress || 0,
            checkins: checkins || []
          };
        }))).filter(Boolean);
        console.log('[Profile] Enriched challenges:', enriched.length);
        setProfileChallenges(enriched);
      } else {
        setProfileChallenges([]);
      }
    } catch (err) {
      console.error('Error loading profile challenges:', err);
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.uid) {
      loadProfileChallenges();
    }
  }, [user?.uid, loadProfileChallenges]);

  useEffect(() => {
    if (activeProfileTab === 'challenges' && user?.uid) {
      loadProfileChallenges();
    }
  }, [activeProfileTab, user?.uid, loadProfileChallenges]);

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
      setGymBagLoaded(false);
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
          <div style={styles.profileCardHeader}>
            <div style={styles.profileInfoBlock}>
              <h3 style={styles.usernameLeft}>@{p.username || 'user'}</h3>
              <span style={styles.displayNameLeft}>{p.display_name || 'Usuário'}</span>

              <div style={styles.statsRowLeft}>
                <div style={styles.statItemLeft}>
                  <span style={styles.statValueLeft}>{filteredUserPosts.length}</span>
                  <span style={styles.statLabelLeft}>posts</span>
                </div>
                <div style={styles.statItemLeft}>
                  <span style={styles.statValueLeft}>{followersCount}</span>
                  <span style={styles.statLabelLeft}>seguidores</span>
                </div>
                <div style={styles.statItemLeft}>
                  <span style={styles.statValueLeft}>{followingCount}</span>
                  <span style={styles.statLabelLeft}>seguindo</span>
                </div>
              </div>
            </div>

            <div style={styles.avatarContainerRight}>
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
          <div style={{ ...styles.statsGrid, width: '100%', marginTop: '20px', marginBottom: 0 }}>
            <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
            <StatBox label="Medalhas" value={totalMedalsCount} icon={Award} color="#FFD700" onClick={() => setShowMedalsModal(true)} />
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
            style={{ ...styles.contentTab, ...(activeProfileTab === 'challenges' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('challenges')}
          >
            <Trophy size={18} /> Desafios
            {profileChallenges.length > 0 && <span style={styles.badgeCountChip}>{profileChallenges.length}</span>}
          </button>
        </div>

        {/* Content - Videos */}
        {activeProfileTab === 'videos' && (
          <div style={styles.videoGrid}>
            {filteredUserPosts.length === 0 && postsLoaded ? (
              <div style={styles.emptyGrid}>
                <Video size={32} color="rgba(255,255,255,0.4)" />
                <span style={styles.emptyGridText}>Nenhum post ainda</span>
              </div>
            ) : (
              filteredUserPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  style={styles.videoThumb}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate('post_details', { params: { post, allPosts: filteredUserPosts, startIndex: idx } })}
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
              gymBagVideos.map((post, idx) => (
                <motion.div
                  key={post.id}
                  style={styles.videoThumb}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate('post_details', { params: { post, allPosts: gymBagVideos, startIndex: idx } })}
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

        {/* Content - Challenges */}
        {activeProfileTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {isLoadingChallenges ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '40px 0' }}>
                Carregando desafios...
              </div>
            ) : profileChallenges.length === 0 ? (
              <div style={styles.emptyGrid}>
                <Trophy size={32} color="rgba(255,255,255,0.4)" />
                <span style={styles.emptyGridText}>Nenhum desafio ativo</span>
                <button
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    background: '#00D4FF',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onClick={() => navigate('ranking', { params: { tab: 'challenges' } })}
                >
                  Descobrir Desafios
                </button>
              </div>
            ) : (
              <div style={styles.challengeGrid}>
                {profileChallenges.map((challenge) => (
                  <ProfileChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onClick={() => setSelectedChallenge(challenge)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Medalhas (Badges) */}
      <AnimatePresence>
        {showMedalsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMedalsModal(false)}
            />
            {/* Sheet */}
            <motion.div
              style={modalStyles.sheet}
              initial={{ y: '100%', x: '-50%' }}
              animate={{ y: 0, x: '-50%' }}
              exit={{ y: '100%', x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              <div style={modalStyles.handle} />
              
              <div style={modalStyles.headerRow}>
                <div style={{ ...modalStyles.iconBg, backgroundColor: 'rgba(255,215,0,0.1)' }}>
                  <Trophy size={24} color="#FFD700" />
                </div>
                <div style={modalStyles.headerInfo}>
                  <h3 style={modalStyles.title}>Suas Medalhas</h3>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
                    {totalMedalsCount} de {badges.length + completedChallengesCount} conquistas
                  </span>
                </div>
                <button style={modalStyles.closeBtn} onClick={() => setShowMedalsModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>

              {/* Progress Bar */}
              <div style={{ padding: '16px 0 8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={modalStyles.progressBarTrack}>
                  <motion.div
                    style={{
                      ...modalStyles.progressBarFill,
                      backgroundColor: '#FFD700',
                      width: `${((totalMedalsCount) / (badges.length + completedChallengesCount || 1)) * 100}%`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((totalMedalsCount) / (badges.length + completedChallengesCount || 1)) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>

              {/* Body */}
              <div style={{ ...modalStyles.body, overflowY: 'auto' }}>
                <div style={badgeStyles.grid}>
                  {allBadgesAndMedals.map((badge, i) => (
                    <BadgeCard key={badge.id} badge={badge} unlocked={badge.unlocked} index={i} />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: Detalhes do Desafio */}
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
              initial={{ y: '100%', x: '-50%' }}
              animate={{ y: 0, x: '-50%' }}
              exit={{ y: '100%', x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            >
              <div style={modalStyles.handle} />
              
              <div style={modalStyles.headerRow}>
                <div style={{ ...modalStyles.iconBg, backgroundColor: `${selectedChallenge.color || '#00D4FF'}15` }}>
                  <span style={{ fontSize: '24px' }}>{selectedChallenge.icon || '🏆'}</span>
                </div>
                <div style={modalStyles.headerInfo}>
                  <h3 style={modalStyles.title}>{selectedChallenge.title}</h3>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
                    {selectedChallenge.progress || 0} de {selectedChallenge.duration || 30} dias concluídos
                  </span>
                </div>
                <button style={modalStyles.closeBtn} onClick={() => setSelectedChallenge(null)}>
                  <X size={20} color="#fff" />
                </button>
              </div>

              {/* Body */}
              <div style={{ ...modalStyles.body, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Carousel */}
                <ChallengeCarousel challenge={selectedChallenge} />

                {/* Progress Bar & Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Progresso Geral</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: selectedChallenge.color || '#00D4FF' }}>
                      {Math.min(100, Math.round(((selectedChallenge.progress || 0) / (selectedChallenge.duration || 30)) * 100))}%
                    </span>
                  </div>
                  <div style={modalStyles.progressBarTrack}>
                    <motion.div
                      style={{
                        ...modalStyles.progressBarFill,
                        background: Math.round(((selectedChallenge.progress || 0) / (selectedChallenge.duration || 30)) * 100) >= 100
                          ? 'linear-gradient(90deg, #39FF14, #00CC00)'
                          : `linear-gradient(90deg, ${selectedChallenge.color || '#00D4FF'}, ${selectedChallenge.color || '#00D4FF'}88)`,
                        width: `${Math.min(100, Math.round(((selectedChallenge.progress || 0) / (selectedChallenge.duration || 30)) * 100))}%`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.round(((selectedChallenge.progress || 0) / (selectedChallenge.duration || 30)) * 100))}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>

                {/* Description / Rules */}
                {selectedChallenge.description && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Regras & Descrição</span>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: '1.4', whiteSpace: 'pre-line' }}>{selectedChallenge.description}</p>
                  </div>
                )}

                {/* Action buttons */}
                {(selectedChallenge.progress || 0) < (selectedChallenge.duration || 30) ? (
                  <button
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      background: selectedChallenge.color || '#00D4FF',
                      color: selectedChallenge.color === '#FFD700' || selectedChallenge.color === '#39FF14' ? '#000' : '#fff',
                      fontWeight: 750,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontFamily: "'Outfit', sans-serif",
                      border: 'none',
                      marginTop: '8px'
                    }}
                    onClick={() => setShowCheckInModal(true)}
                  >
                    <Camera size={16} />
                    Registrar Check-In Diário
                  </button>
                ) : (
                  <div
                    style={{
                      background: 'rgba(57,255,20,0.1)',
                      border: '1px solid #39FF14',
                      color: '#39FF14',
                      padding: '14px',
                      borderRadius: '16px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      fontFamily: "'Outfit', sans-serif",
                      marginTop: '8px',
                      boxShadow: '0 0 12px rgba(57,255,20,0.2)',
                    }}
                  >
                    🎉 Desafio Concluído! Excelente trabalho!
                  </div>
                )}

                <button
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontFamily: "'Outfit', sans-serif",
                    marginTop: '8px'
                  }}
                  onClick={() => {
                    setSelectedChallenge(null);
                    navigate('ranking', { params: { tab: 'challenges' } });
                  }}
                >
                  <Trophy size={16} color={selectedChallenge.color || '#00D4FF'} />
                  Ver Classificação
                </button>
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
              style={{ ...modalStyles.backdrop, zIndex: 100001 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCheckInModal(false)}
            />
            {/* Card Modal Form */}
            <motion.div
              style={{ ...modalStyles.checkInModal, zIndex: 100002 }}
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
    alignItems: 'center',
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
    textAlign: 'center',
    width: '100%',
    letterSpacing: '-0.5px'
  },
  displayNameLeft: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '12px',
    textAlign: 'center',
    width: '100%'
  },
  statsRowLeft: {
    display: 'flex',
    justifyContent: 'center',
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
  bioContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '12px',
  },
  bioCenter: { fontSize: '14px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: '1.4', margin: '0 0 12px', maxWidth: '90%' },
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
  badgeCountChip: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#0A0A0F',
    background: '#FFD700',
    borderRadius: '10px',
    padding: '2px 6px',
    marginLeft: '2px',
  },
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
  },
  challengeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '8px',
    marginBottom: '20px',
  },
  challengeGridCard: {
    aspectRatio: '9/16',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardCoverImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 1,
  },
  cardGradientPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    zIndex: 1,
  },
  cardPlaceholderEmoji: {
    fontSize: '28px',
    marginBottom: '4px',
  },
  cardPlaceholderText: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.85) 100%)',
    zIndex: 2,
  },
  cardContent: {
    position: 'relative',
    zIndex: 3,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '8px',
    boxSizing: 'border-box',
  },
  carouselBadge: {
    alignSelf: 'flex-end',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '6px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleOverlay: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    lineHeight: '1.2',
    marginTop: 'auto',
    marginBottom: '6px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  challengeProgressTrackGrid: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: 'rgba(255, 255, 255, 0.15)',
    zIndex: 4,
    overflow: 'hidden',
  },
  challengeProgressFillGrid: {
    height: '100%',
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

const badgeStyles = {
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  summary: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    borderRadius: '24px',
    background: 'rgba(255,215,0,0.05)',
    border: '1px solid rgba(255,215,0,0.15)',
    backdropFilter: 'blur(20px)',
    marginBottom: '8px',
  },
  summaryIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    background: 'rgba(255,215,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  progressBar: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #FFD700, #FFA500)',
    boxShadow: '0 0 8px rgba(255,215,0,0.4)',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    gap: '8px',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  iconContainer: {
    width: '56px',
    height: '56px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  name: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    textAlign: 'center',
  },
  description: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
  },
  unlockedBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #39FF14, #00CC00)',
    color: '#0A0A0F',
    fontSize: '12px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(57,255,20,0.4)',
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
    maxHeight: '80vh',
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
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  body: {
    flex: 1,
    paddingTop: '12px',
    paddingBottom: '12px',
  },
  progressBarTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out',
  },
  // Check-In Modal Form
  checkInModal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '420px',
    background: '#0F0F15',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxSizing: 'border-box'
  },
  checkInHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px'
  },
  checkInTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0
  },
  checkInForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  checkInField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  checkInLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#B0B0C8',
    fontFamily: "'Inter', sans-serif"
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
    boxSizing: 'border-box'
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
    cursor: 'pointer'
  },
  photoUploadText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif"
  },
  photoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: '140px',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  photoPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
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
    justifyContent: 'center'
  },
  confirmBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  },
};

const tabStyles = {
  carouselContainer: {
    position: 'relative',
    width: '100%',
    height: '320px',
    borderRadius: '16px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  carouselCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  carouselCaptionText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  carouselDate: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif",
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.5)',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(5px)',
    zIndex: 10,
  },
  indicators: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '6px',
    zIndex: 10,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'all 0.2s',
  },
  emptyCarousel: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
  },
  emptyCarouselText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    fontFamily: "'Outfit', sans-serif",
    textAlign: 'center',
  },
};
