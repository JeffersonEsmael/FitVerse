import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid3x3, Award, ChevronRight, ScanLine, MessageCircle, Video, Image as ImageIcon, Plus, Trophy, Flame, Target, Dumbbell, Zap, Star, X, Camera, Play, MoreVertical, Check, MapPin, QrCode, Calendar, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import { useRankingStore } from '../stores/rankingStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useGymStore } from '../stores/gymStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';
import ProfileChallengeCard from '../components/profile/ProfileChallengeCard';

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
  const { fetchUserPosts } = useFeedStore();
  const { fetchChallenges, performCheckIn } = useRankingStore();
  
  const {
    seriesList,
    activeSeriesId,
    fetchSeries,
    createSeries,
    updateSeries,
    setActiveSeries,
    toggleExerciseDone,
    incrementWorkoutProgress,
    deleteSeries
  } = useWorkoutStore();

  const {
    gymsList,
    checkins,
    isLoading: isGymLoading,
    error: gymError,
    fetchGyms,
    fetchUserCheckins,
    linkUserToGym,
    performGymCheckin
  } = useGymStore();

  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [checkinSuccessMessage, setCheckinSuccessMessage] = useState('');
  const [checkinErrorMessage, setCheckinErrorMessage] = useState('');
  const [isPerformingScan, setIsPerformingScan] = useState(false);
  const [showChangeGymList, setShowChangeGymList] = useState(false);

  useEffect(() => {
    fetchGyms();
    if (user?.uid) {
      fetchUserCheckins(user.uid);
    }
  }, [user?.uid, fetchGyms, fetchUserCheckins]);
  
  const [activeProfileTab, setActiveProfileTab] = useState('videos');
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  
  // Minha Série Modal states
  const [showEditSeriesModal, setShowEditSeriesModal] = useState(false);
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [seriesModalName, setSeriesModalName] = useState('');
  const [seriesModalFrequency, setSeriesModalFrequency] = useState('3x por semana');
  const [seriesModalTotal, setSeriesModalTotal] = useState(30);
  const [seriesModalExercises, setSeriesModalExercises] = useState([]);
  
  // Local state for editing an exercise inside form
  const [tempExerciseName, setTempExerciseName] = useState('');
  const [tempExerciseSets, setTempExerciseSets] = useState(4);
  const [tempExerciseReps, setTempExerciseReps] = useState('10');
  const [tempExerciseWeight, setTempExerciseWeight] = useState(0);



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
      unlocked: badge.check({ ...p, followers: followersCount }, userPosts, []),
    }));
  }, [p, followersCount, userPosts]);

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
      fetchSeries(user.uid);
      fetchChallenges();
    }
  }, [currentScreen, user?.uid, refreshProfile, fetchUserPosts, fetchSeries, fetchChallenges]);

  const loadProfileChallenges = useCallback(async () => {
    if (!user?.uid) return;
    await Promise.resolve();
    setIsLoadingChallenges(true);
    try {
      // Strategy 1: Use rankingStore as primary source (has joined challenges from current session)
      const { useRankingStore } = await import('../stores/rankingStore');
      const rankingChallenges = useRankingStore.getState().challenges || [];
      const joinedFromStore = rankingChallenges.filter(c => c.joined);
      console.log('[Profile] Joined challenges from rankingStore:', joinedFromStore.length);

      // Strategy 2: Also try DB for challenge_participants
      let dbProgressMap = {};
      try {
        const { data: participations } = await supabase
          .from('challenge_participants')
          .select('challenge_id, progress')
          .eq('user_id', user.uid);
        
        if (participations && participations.length > 0) {
          console.log('[Profile] DB participations found:', participations.length);
          participations.forEach(p => {
            dbProgressMap[p.challenge_id] = p.progress;
          });

          // Add DB challenges that aren't in store
          const storeIds = new Set(joinedFromStore.map(c => c.id));
          const missingIds = participations
            .map(p => p.challenge_id)
            .filter(id => !storeIds.has(id));

          if (missingIds.length > 0) {
            const { data: missingChallenges } = await supabase
              .from('challenges')
              .select('*')
              .in('id', missingIds);
            
            if (missingChallenges) {
              missingChallenges.forEach(c => {
                joinedFromStore.push({
                  ...c,
                  joined: true,
                  progress: dbProgressMap[c.id] || 0,
                });
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('[Profile] DB participations query failed:', dbErr.message);
      }

      // Merge progress from DB
      const allJoined = joinedFromStore.map(c => ({
        ...c,
        progress: c.progress || dbProgressMap[c.id] || 0,
      }));

      console.log('[Profile] Total joined challenges:', allJoined.length);

      if (allJoined.length > 0) {
        // Fetch checkins from challenge_checkins table
        let allDbCheckins = [];
        try {
          const { data: dbCheckins } = await supabase
            .from('challenge_checkins')
            .select('challenge_id, photo_url, created_at, activity_title')
            .eq('user_id', user.uid)
            .order('created_at', { ascending: false });
          allDbCheckins = dbCheckins || [];
        } catch {
          console.warn('[Profile] challenge_checkins query failed');
        }

        // Fallback: also fetch desafio posts from videos table as alternate photo source
        let desafioPosts = [];
        try {
          const { data: videoPosts } = await supabase
            .from('videos')
            .select('video_url, caption, created_at, category')
            .eq('user_id', user.uid)
            .eq('category', 'desafio')
            .order('created_at', { ascending: false });
          desafioPosts = videoPosts || [];
        } catch {
          console.warn('[Profile] desafio posts query failed');
        }
        console.log('[Profile] Desafio posts found:', desafioPosts.length);

        const enriched = allJoined.map((challenge) => {
          // Get checkins from DB
          let checkins = allDbCheckins
            .filter(c => c.challenge_id === challenge.id)
            .map(c => ({ photo_url: c.photo_url, created_at: c.created_at, activity_title: c.activity_title }));

          // If no DB checkins, try to match desafio posts by challenge title in caption
          if (checkins.length === 0 && desafioPosts.length > 0) {
            const titleLower = (challenge.title || '').toLowerCase();
            const matchedPosts = desafioPosts.filter(p => 
              (p.caption || '').toLowerCase().includes(titleLower)
            );
            if (matchedPosts.length > 0) {
              checkins = matchedPosts.map(p => ({
                photo_url: p.video_url,
                created_at: p.created_at,
                activity_title: 'Check-in',
              }));
            }
          }

          // Update progress: use max of store progress, db progress, or checkin count
          const effectiveProgress = Math.max(
            challenge.progress || 0,
            dbProgressMap[challenge.id] || 0,
            checkins.length
          );

          return {
            ...challenge,
            progress: effectiveProgress,
            checkins,
          };
        });

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

  // Load challenges: first populate rankingStore, then load profile challenges
  useEffect(() => {
    if (user?.uid) {
      // Ensure fetchChallenges completes first so rankingStore has joined data
      fetchChallenges().then(() => {
        loadProfileChallenges();
      });
    }
  }, [user?.uid, fetchChallenges, loadProfileChallenges]);

  useEffect(() => {
    if (activeProfileTab === 'challenges' && user?.uid) {
      fetchChallenges().then(() => {
        loadProfileChallenges();
      });
    }
  }, [activeProfileTab, user?.uid, fetchChallenges, loadProfileChallenges]);

  // Fetch posts
  useEffect(() => {
    if (activeProfileTab === 'videos' && user?.uid && !postsLoaded) {
      fetchUserPosts(user.uid).then((posts) => {
        setUserPosts(posts);
        setPostsLoaded(true);
      });
    }
  }, [activeProfileTab, user?.uid, postsLoaded, fetchUserPosts]);

  // Fetch series
  useEffect(() => {
    if (activeProfileTab === 'serie' && user?.uid) {
      fetchSeries(user.uid);
    }
  }, [activeProfileTab, user?.uid, fetchSeries]);

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

  const lastCheckIn = checkins[0];
  const todayStr = new Date().toLocaleDateString('pt-BR');
  const checkedInToday = lastCheckIn && new Date(lastCheckIn.created_at).toLocaleDateString('pt-BR') === todayStr;

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
            <MoreVertical size={24} color="#fff" />
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
              {/* Streak Badge */}
              {p.streak >= 3 && (
                <div style={styles.streakBadge}>
                  🔥 {p.streak}
                </div>
              )}
              <div style={styles.avatar}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={styles.avatarImg} /> : (
                  <div style={styles.avatarPlaceholder}>{p.display_name?.charAt(0) || '?'}</div>
                )}
              </div>
              {/* Mastery Title */}
              <span style={styles.masteryTitle}>Maromba</span>
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
            <StatBox label="Minha Série" value="Série" icon={Dumbbell} color="#00D4FF" onClick={() => setActiveProfileTab('serie')} />
          </div>
        </motion.div>

        {/* Quick access */}
        <div style={styles.quickAccess}>
          {/* NutriScan */}
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
          </motion.button>

          {/* Gym Check-in */}
          <motion.button
            style={styles.quickBtn}
            onClick={() => {
              setCheckinSuccessMessage('');
              setCheckinErrorMessage('');
              setManualTokenInput('');
              setShowQrScanModal(true);
            }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ ...styles.quickIcon, background: 'rgba(57,255,20,0.15)' }}>
              <QrCode size={20} color="#39FF14" />
            </div>
            <div style={styles.quickInfo}>
              <span style={styles.quickTitle}>Check-in</span>
              <span style={styles.quickDesc}>
                {checkedInToday 
                  ? `Concluído! 🔥 ${p.streak || 0}d` 
                  : p.gym_id 
                    ? `🔥 ${p.streak || 0} dias ativos` 
                    : 'Escaneie o QR Code'}
              </span>
            </div>
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
            style={{ ...styles.contentTab, ...(activeProfileTab === 'challenges' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('challenges')}
          >
            <Trophy size={18} /> Desafios
            {profileChallenges.length > 0 && <span style={styles.badgeCountChip}>{profileChallenges.length}</span>}
          </button>
          <button
            style={{ ...styles.contentTab, ...(activeProfileTab === 'serie' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveProfileTab('serie')}
          >
            <Dumbbell size={18} /> Série
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
                      <Play size={10} fill="#fff" stroke="none" /> {formatViews(post.views)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Content - Série */}
        {activeProfileTab === 'serie' && (
          <div style={workoutStyles.container}>
            {seriesList.length === 0 ? (
              <div style={workoutStyles.emptyState}>
                <Dumbbell size={48} color="rgba(255,255,255,0.2)" />
                <span style={workoutStyles.emptyTitle}>Nenhuma Série Cadastrada</span>
                <span style={workoutStyles.emptyText}>Crie uma série de treinos para começar a acompanhar seu progresso e ganhar XP!</span>
                <button
                  style={workoutStyles.createBtn}
                  onClick={() => {
                    setSeriesModalName('');
                    setSeriesModalFrequency('3x por semana');
                    setSeriesModalTotal(30);
                    setSeriesModalExercises([
                      { id: 'ex_new_1', name: 'Exercício 1', sets: 4, reps: '10', weight: 10, done_today: false }
                    ]);
                    setShowCreateSeriesModal(true);
                  }}
                >
                  Criar Série
                </button>
              </div>
            ) : (() => {
              const activeSeries = seriesList.find(s => s.id === activeSeriesId) || seriesList[0];
              if (!activeSeries) return null;
              const pct = Math.round(((activeSeries.progress_completed || 0) / (activeSeries.progress_total || 30)) * 100);

              return (
                <div style={workoutStyles.activeSeriesContainer}>
                  {/* Select active series dropdown if multiple */}
                  {seriesList.length > 1 && (
                    <div style={workoutStyles.selectorRow}>
                      <span style={workoutStyles.selectorLabel}>Alternar Série:</span>
                      <select
                        value={activeSeriesId || ''}
                        onChange={(e) => setActiveSeries(user?.uid, e.target.value)}
                        style={workoutStyles.selectorSelect}
                      >
                        {seriesList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Series Header Card */}
                  <div style={workoutStyles.headerCard}>
                    <div style={workoutStyles.headerTop}>
                      <div>
                        <h4 style={workoutStyles.seriesTitle}>{activeSeries.name}</h4>
                        <span style={workoutStyles.seriesFreq}>{activeSeries.weekly_frequency}</span>
                      </div>
                      <div style={workoutStyles.headerActions}>
                        <button
                          style={workoutStyles.headerActionBtn}
                          onClick={() => {
                            setSeriesModalName(activeSeries.name);
                            setSeriesModalFrequency(activeSeries.weekly_frequency);
                            setSeriesModalTotal(activeSeries.progress_total);
                            setSeriesModalExercises(activeSeries.exercises || []);
                            setShowEditSeriesModal(true);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          style={{ ...workoutStyles.headerActionBtn, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                          onClick={() => {
                            setSeriesModalName('');
                            setSeriesModalFrequency('3x por semana');
                            setSeriesModalTotal(30);
                            setSeriesModalExercises([
                              { id: 'ex_new_1', name: 'Exercício 1', sets: 4, reps: '10', weight: 10, done_today: false }
                            ]);
                            setShowCreateSeriesModal(true);
                          }}
                        >
                          Nova
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={workoutStyles.progressSection}>
                      <div style={workoutStyles.progressLabels}>
                        <span style={workoutStyles.progressLabel}>Progresso Geral</span>
                        <span style={workoutStyles.progressVal}>{activeSeries.progress_completed || 0}/{activeSeries.progress_total || 30} treinos</span>
                      </div>
                      <div style={workoutStyles.progressTrack}>
                        <motion.div
                          style={{ ...workoutStyles.progressFill, width: `${Math.min(100, pct)}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, pct)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Exercises List Header */}
                  <div style={workoutStyles.exercisesHeader}>
                    <h5 style={workoutStyles.exercisesTitle}>Exercícios de Hoje</h5>
                    <span style={workoutStyles.exercisesCount}>{activeSeries.exercises?.length || 0} exercícios</span>
                  </div>

                  {/* Exercises Grid/List */}
                  <div style={workoutStyles.exercisesList}>
                    {(!activeSeries.exercises || activeSeries.exercises.length === 0) ? (
                      <div style={workoutStyles.noExercisesCard}>
                        <span>Nenhum exercício cadastrado nesta série.</span>
                        <button
                          style={workoutStyles.addExerciseInlineBtn}
                          onClick={() => {
                            setSeriesModalName(activeSeries.name);
                            setSeriesModalFrequency(activeSeries.weekly_frequency);
                            setSeriesModalTotal(activeSeries.progress_total);
                            setSeriesModalExercises(activeSeries.exercises || []);
                            setShowEditSeriesModal(true);
                          }}
                        >
                          Adicionar Exercícios
                        </button>
                      </div>
                    ) : (
                      activeSeries.exercises.map((ex) => {
                        return (
                          <div
                            key={ex.id}
                            style={{
                              ...workoutStyles.exerciseCard,
                              ...(ex.done_today ? workoutStyles.exerciseCardDone : {}),
                            }}
                          >
                            <div style={workoutStyles.exerciseInfo}>
                              <span style={workoutStyles.exerciseName}>{ex.name}</span>
                              <span style={workoutStyles.exerciseMeta}>
                                {ex.sets} séries x {ex.reps} reps {ex.weight > 0 ? `• ${ex.weight}kg` : ''}
                              </span>
                            </div>

                            <button
                              style={{
                                ...workoutStyles.doneBtn,
                                ...(ex.done_today ? workoutStyles.doneBtnActive : {}),
                              }}
                              onClick={() => toggleExerciseDone(user?.uid, activeSeries.id, ex.id)}
                            >
                              {ex.done_today ? <Check size={16} color="#000" strokeWidth={3} /> : 'Fazer'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Concluir Treino Button */}
                  {activeSeries.exercises?.length > 0 && (
                    <motion.button
                      style={{
                        ...workoutStyles.finishWorkoutBtn,
                        opacity: activeSeries.exercises.some(ex => ex.done_today) ? 1 : 0.5,
                      }}
                      whileTap={activeSeries.exercises.some(ex => ex.done_today) ? { scale: 0.97 } : {}}
                      onClick={() => {
                        if (!activeSeries.exercises.some(ex => ex.done_today)) {
                          alert('Marque pelo menos um exercício como feito antes de concluir o treino!');
                          return;
                        }
                        incrementWorkoutProgress(user?.uid, activeSeries.id);
                        alert('Treino concluído com sucesso! +150 XP adicionados! 💪🔥');
                      }}
                    >
                      Concluir Treino de Hoje
                    </motion.button>
                  )}
                </div>
              );
            })()}
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
              <>
                <div style={styles.challengeGrid}>
                  {profileChallenges.map((challenge) => (
                    <ProfileChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      onClick={() => setSelectedChallenge(challenge)}
                    />
                  ))}
                </div>
                <button
                  style={{
                    alignSelf: 'center',
                    marginTop: '16px',
                    padding: '12px 24px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '20px',
                  }}
                  onClick={() => navigate('ranking', { params: { tab: 'challenges' } })}
                >
                  <Trophy size={16} color="#FFD700" />
                  Descobrir mais Desafios
                </button>
              </>
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
                    navigate('ranking', { params: { tab: 'ranking', challengeId: selectedChallenge.id } });
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



      {/* MODAL: Criar Série */}
      <AnimatePresence>
        {showCreateSeriesModal && (
          <>
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateSeriesModal(false)}
            />
            <motion.div
              style={{ ...modalStyles.workoutModal, zIndex: 100002 }}
              initial={{ y: '100px', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100px', opacity: 0 }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>Criar Nova Série</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowCreateSeriesModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>
              <div style={{ ...modalStyles.modalScrollBody, display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Nome da Série</label>
                  <input
                    type="text"
                    placeholder="Ex: Hipertrofia A ou Treino de Pernas"
                    value={seriesModalName}
                    onChange={(e) => setSeriesModalName(e.target.value)}
                    style={modalStyles.checkInInput}
                  />
                </div>
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Frequência Semanal</label>
                  <select
                    value={seriesModalFrequency}
                    onChange={(e) => setSeriesModalFrequency(e.target.value)}
                    style={modalStyles.checkInInput}
                  >
                    <option value="1x por semana">1x por semana</option>
                    <option value="2x por semana">2x por semana</option>
                    <option value="3x por semana">3x por semana</option>
                    <option value="4x por semana">4x por semana</option>
                    <option value="5x por semana">5x por semana</option>
                    <option value="6x por semana">6x por semana</option>
                    <option value="Diário">Diário</option>
                  </select>
                </div>
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Meta Total de Treinos</label>
                  <input
                    type="number"
                    min={1}
                    value={seriesModalTotal}
                    onChange={(e) => setSeriesModalTotal(Math.max(1, parseInt(e.target.value) || 30))}
                    style={modalStyles.checkInInput}
                  />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                  <label style={modalStyles.checkInLabel}>Adicionar Exercício</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
                    <input
                      type="text"
                      placeholder="Nome do Exercício"
                      value={tempExerciseName}
                      onChange={(e) => setTempExerciseName(e.target.value)}
                      style={modalStyles.checkInInput}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Séries</span>
                        <input
                          type="number"
                          min={1}
                          value={tempExerciseSets}
                          onChange={(e) => setTempExerciseSets(Math.max(1, parseInt(e.target.value) || 4))}
                          style={modalStyles.checkInInput}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Reps</span>
                        <input
                          type="text"
                          value={tempExerciseReps}
                          onChange={(e) => setTempExerciseReps(e.target.value)}
                          style={modalStyles.checkInInput}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Carga (kg)</span>
                        <input
                          type="number"
                          min={0}
                          value={tempExerciseWeight}
                          onChange={(e) => setTempExerciseWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                          style={modalStyles.checkInInput}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: '10px',
                        background: '#00D4FF',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '4px',
                        fontFamily: "'Outfit', sans-serif"
                      }}
                      onClick={() => {
                        if (!tempExerciseName.trim()) {
                          alert('Informe o nome do exercício!');
                          return;
                        }
                        const newEx = {
                          id: `ex_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                          name: tempExerciseName,
                          sets: tempExerciseSets,
                          reps: tempExerciseReps,
                          weight: tempExerciseWeight,
                          done_today: false
                        };
                        setSeriesModalExercises([...seriesModalExercises, newEx]);
                        setTempExerciseName('');
                      }}
                    >
                      + Adicionar à Lista
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={modalStyles.checkInLabel}>Exercícios Adicionados ({seriesModalExercises.length})</span>
                  {seriesModalExercises.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Nenhum exercício adicionado ainda</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                      {seriesModalExercises.map((ex, idx) => (
                        <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{ex.name}</span>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{ex.sets}x{ex.reps} • {ex.weight}kg</span>
                          </div>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            onClick={() => {
                              setSeriesModalExercises(seriesModalExercises.filter((_, i) => i !== idx));
                            }}
                          >
                            <X size={16} color="#FF2D55" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <motion.button
                style={{ ...modalStyles.confirmBtn, background: '#39FF14', color: '#000', marginTop: '10px' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!seriesModalName.trim()) {
                    alert('Informe o nome da série!');
                    return;
                  }
                  if (seriesModalExercises.length === 0) {
                    alert('Adicione pelo menos um exercício à série!');
                    return;
                  }
                  createSeries(user?.uid, seriesModalName, seriesModalFrequency, seriesModalTotal, seriesModalExercises);
                  setShowCreateSeriesModal(false);
                  alert('Série criada com sucesso!');
                }}
              >
                Salvar Série
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: Editar Série */}
      <AnimatePresence>
        {showEditSeriesModal && (
          <>
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditSeriesModal(false)}
            />
            <motion.div
              style={{ ...modalStyles.workoutModal, zIndex: 100002 }}
              initial={{ y: '100px', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100px', opacity: 0 }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>Editar Série</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowEditSeriesModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>
              <div style={{ ...modalStyles.modalScrollBody, display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Nome da Série</label>
                  <input
                    type="text"
                    placeholder="Ex: Hipertrofia A ou Treino de Pernas"
                    value={seriesModalName}
                    onChange={(e) => setSeriesModalName(e.target.value)}
                    style={modalStyles.checkInInput}
                  />
                </div>
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Frequência Semanal</label>
                  <select
                    value={seriesModalFrequency}
                    onChange={(e) => setSeriesModalFrequency(e.target.value)}
                    style={modalStyles.checkInInput}
                  >
                    <option value="1x por semana">1x por semana</option>
                    <option value="2x por semana">2x por semana</option>
                    <option value="3x por semana">3x por semana</option>
                    <option value="4x por semana">4x por semana</option>
                    <option value="5x por semana">5x por semana</option>
                    <option value="6x por semana">6x por semana</option>
                    <option value="Diário">Diário</option>
                  </select>
                </div>
                <div style={modalStyles.checkInField}>
                  <label style={modalStyles.checkInLabel}>Meta Total de Treinos</label>
                  <input
                    type="number"
                    min={1}
                    value={seriesModalTotal}
                    onChange={(e) => setSeriesModalTotal(Math.max(1, parseInt(e.target.value) || 30))}
                    style={modalStyles.checkInInput}
                  />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                  <label style={modalStyles.checkInLabel}>Adicionar Exercício</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
                    <input
                      type="text"
                      placeholder="Nome do Exercício"
                      value={tempExerciseName}
                      onChange={(e) => setTempExerciseName(e.target.value)}
                      style={modalStyles.checkInInput}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Séries</span>
                        <input
                          type="number"
                          min={1}
                          value={tempExerciseSets}
                          onChange={(e) => setTempExerciseSets(Math.max(1, parseInt(e.target.value) || 4))}
                          style={modalStyles.checkInInput}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Reps</span>
                        <input
                          type="text"
                          value={tempExerciseReps}
                          onChange={(e) => setTempExerciseReps(e.target.value)}
                          style={modalStyles.checkInInput}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Carga (kg)</span>
                        <input
                          type="number"
                          min={0}
                          value={tempExerciseWeight}
                          onChange={(e) => setTempExerciseWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                          style={modalStyles.checkInInput}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        padding: '10px',
                        background: '#00D4FF',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginTop: '4px',
                        fontFamily: "'Outfit', sans-serif"
                      }}
                      onClick={() => {
                        if (!tempExerciseName.trim()) {
                          alert('Informe o nome do exercício!');
                          return;
                        }
                        const newEx = {
                          id: `ex_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                          name: tempExerciseName,
                          sets: tempExerciseSets,
                          reps: tempExerciseReps,
                          weight: tempExerciseWeight,
                          done_today: false
                        };
                        setSeriesModalExercises([...seriesModalExercises, newEx]);
                        setTempExerciseName('');
                      }}
                    >
                      + Adicionar à Lista
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={modalStyles.checkInLabel}>Exercícios da Série ({seriesModalExercises.length})</span>
                  {seriesModalExercises.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Nenhum exercício nesta série</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                      {seriesModalExercises.map((ex, idx) => (
                        <div key={ex.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>{ex.name}</span>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{ex.sets}x{ex.reps} • {ex.weight}kg</span>
                          </div>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            onClick={() => {
                              setSeriesModalExercises(seriesModalExercises.filter((_, i) => i !== idx));
                            }}
                          >
                            <X size={16} color="#FF2D55" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#FF2D55',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                  onClick={() => {
                    const confirmDel = window.confirm('Deseja realmente excluir esta série?');
                    if (confirmDel) {
                      deleteSeries(user?.uid, activeSeriesId);
                      setShowEditSeriesModal(false);
                      alert('Série excluída com sucesso!');
                    }
                  }}
                >
                  Excluir Série
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1.5,
                    padding: '14px',
                    borderRadius: '12px',
                    background: '#39FF14',
                    border: 'none',
                    color: '#000',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif"
                  }}
                  onClick={() => {
                    if (!seriesModalName.trim()) {
                      alert('Informe o nome da série!');
                      return;
                    }
                    if (seriesModalExercises.length === 0) {
                      alert('A série precisa ter pelo menos um exercício!');
                      return;
                    }
                    updateSeries(user?.uid, activeSeriesId, {
                      name: seriesModalName,
                      weekly_frequency: seriesModalFrequency,
                      progress_total: seriesModalTotal,
                      exercises: seriesModalExercises
                    });
                    setShowEditSeriesModal(false);
                    alert('Série atualizada!');
                  }}
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: Leitor de QR Code Simulado */}
      <AnimatePresence>
        {showQrScanModal && (
          <>
            {/* Backdrop */}
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isPerformingScan) setShowQrScanModal(false);
              }}
            />
            {/* Modal Box */}
            <motion.div
              style={styles.scannerModal}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
            >
              <div style={styles.scannerHeader}>
                <h3 style={styles.scannerTitle}>Leitor de QR Code</h3>
                <button
                  style={styles.scannerCloseBtn}
                  onClick={() => setShowQrScanModal(false)}
                  disabled={isPerformingScan}
                >
                  <X size={20} color="#fff" />
                </button>
              </div>

              {checkinSuccessMessage ? (
                <div style={styles.scannerSuccessContainer}>
                  <div style={styles.scannerSuccessIconBg}>
                    <Check size={40} color="#0A0A0F" strokeWidth={3} />
                  </div>
                  <h4 style={styles.scannerSuccessTitle}>Presença Confirmada!</h4>
                  <p style={styles.scannerSuccessDesc}>{checkinSuccessMessage}</p>
                  <button
                    style={styles.scannerSuccessBtn}
                    onClick={() => {
                      setShowQrScanModal(false);
                      setCheckinSuccessMessage('');
                    }}
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div style={styles.scannerBody}>
                  {/* Viewfinder simulation */}
                  <div style={styles.viewfinderContainer}>
                    <div style={styles.viewfinderCornerTL} />
                    <div style={styles.viewfinderCornerTR} />
                    <div style={styles.viewfinderCornerBL} />
                    <div style={styles.viewfinderCornerBR} />
                    <motion.div
                      style={styles.scannerLaser}
                      animate={{ top: ['0%', '98%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    />
                    {isPerformingScan ? (
                      <span style={styles.viewfinderStatusText}>Processando check-in...</span>
                    ) : (
                      <span style={styles.viewfinderStatusText}>Aponte a câmera ou use a simulação abaixo</span>
                    )}
                  </div>

                  {checkinErrorMessage && (
                    <div style={styles.scannerErrorMsg}>
                      ⚠️ {checkinErrorMessage}
                    </div>
                  )}

                  {/* Manual token input */}
                  <div style={styles.manualInputRow}>
                    <input
                      type="text"
                      placeholder="Token do QR Code manualmente"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      style={styles.manualInput}
                      disabled={isPerformingScan}
                    />
                    <button
                      style={styles.manualInputBtn}
                      onClick={async () => {
                        if (!manualTokenInput.trim()) return;
                        setIsPerformingScan(true);
                        setCheckinErrorMessage('');
                        try {
                          const res = await performGymCheckin(user.uid, manualTokenInput.trim());
                          if (res.success) {
                            setCheckinSuccessMessage(
                              `Check-in realizado com sucesso na unidade ${res.gym.name}! Seu streak atual é de ${res.newStreak} dias.`
                            );
                            // Refresh checkins history
                            fetchUserCheckins(user.uid);
                          }
                        } catch (err) {
                          setCheckinErrorMessage(err.message || 'Falha ao realizar check-in.');
                        } finally {
                          setIsPerformingScan(false);
                        }
                      }}
                      disabled={isPerformingScan}
                    >
                      Confirmar
                    </button>
                  </div>

                  {/* Fast Simulation Options */}
                  <div style={styles.simulationContainer}>
                    <span style={styles.simulationTitle}>Simular escaneamento físico:</span>
                    <div style={styles.simulationButtons}>
                      {gymsList.map(gym => (
                        <button
                          key={gym.id}
                          style={styles.simBtn}
                          disabled={isPerformingScan}
                          onClick={async () => {
                            setIsPerformingScan(true);
                            setCheckinErrorMessage('');
                            try {
                              const res = await performGymCheckin(user.uid, gym.qr_code_token);
                              if (res.success) {
                                setCheckinSuccessMessage(
                                  `Check-in realizado com sucesso na unidade ${res.gym.name}! Seu streak atual é de ${res.newStreak} dias.`
                                );
                                // Refresh checkins history
                                fetchUserCheckins(user.uid);
                              }
                            } catch (err) {
                              setCheckinErrorMessage(err.message || 'Falha ao realizar check-in.');
                            } finally {
                              setIsPerformingScan(false);
                            }
                          }}
                        >
                          Escanear QR {gym.name}
                        </button>
                      ))}
                      <button
                        style={styles.simBtnError}
                        disabled={isPerformingScan}
                        onClick={async () => {
                          setIsPerformingScan(true);
                          setCheckinErrorMessage('');
                          try {
                            await performGymCheckin(user.uid, 'token_invalido_teste');
                          } catch (err) {
                            setCheckinErrorMessage(err.message);
                          } finally {
                            setIsPerformingScan(false);
                          }
                        }}
                      >
                        Simular Token Inválido
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
  streakBadge: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    zIndex: 10,
    background: 'linear-gradient(135deg, #FF9500, #FF6B00)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: '800',
    padding: '4px 8px',
    borderRadius: '12px',
    boxShadow: '0 4px 10px rgba(255,107,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    fontFamily: "'Outfit', sans-serif",
  },
  masteryTitle: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#39FF14',
    background: 'rgba(57,255,20,0.1)',
    border: '1px solid rgba(57,255,20,0.2)',
    padding: '2px 10px',
    borderRadius: '10px',
    marginTop: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Outfit', sans-serif",
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
  workoutModal: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    width: '100%',
    maxWidth: '450px',
    transform: 'translateX(-50%)',
    background: '#0F0F15',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderTopLeftRadius: '28px',
    borderTopRightRadius: '28px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    boxSizing: 'border-box'
  },
  modalScrollBody: {
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px'
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

const workoutStyles = {
  container: {
    padding: '8px 0 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center'
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  emptyText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: '1.4',
    maxWidth: '280px'
  },
  createBtn: {
    padding: '12px 24px',
    borderRadius: '12px',
    background: '#39FF14',
    border: 'none',
    color: '#000',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    marginTop: '8px',
    boxShadow: '0 4px 12px rgba(57,255,20,0.3)'
  },
  activeSeriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  selectorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 14px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  selectorLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif"
  },
  selectorSelect: {
    background: 'none',
    border: 'none',
    color: '#00D4FF',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    outline: 'none',
    cursor: 'pointer'
  },
  headerCard: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  seriesTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0
  },
  seriesFreq: {
    fontSize: '12px',
    color: '#00D4FF',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    marginTop: '2px',
    display: 'inline-block'
  },
  headerActions: {
    display: 'flex',
    gap: '6px'
  },
  headerActionBtn: {
    padding: '6px 12px',
    borderRadius: '10px',
    background: 'rgba(0,212,255,0.15)',
    border: '1px solid rgba(0,212,255,0.3)',
    color: '#00D4FF',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif"
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500
  },
  progressVal: {
    color: '#fff',
    fontWeight: 700
  },
  progressTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #00D4FF, #0088CC)',
    boxShadow: '0 0 8px rgba(0,212,255,0.4)'
  },
  exercisesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px'
  },
  exercisesTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0
  },
  exercisesCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif"
  },
  exercisesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  noExercisesCard: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '16px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  },
  addExerciseInlineBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif"
  },
  exerciseCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  exerciseCardDone: {
    background: 'rgba(57,255,20,0.03)',
    borderColor: 'rgba(57,255,20,0.15)'
  },
  exerciseInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    paddingRight: '12px'
  },
  exerciseName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  exerciseMeta: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif"
  },
  doneBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    minWidth: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },
  doneBtnActive: {
    background: '#39FF14',
    border: '1px solid #39FF14',
    color: '#000',
    boxShadow: '0 0 10px rgba(57,255,20,0.3)'
  },
  finishWorkoutBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    background: 'linear-gradient(90deg, #39FF14 0%, #00CC00 100%)',
    border: 'none',
    color: '#000',
    fontWeight: 800,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    boxShadow: '0 6px 16px rgba(57,255,20,0.25)',
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  gymCard: {
    padding: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  gymCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gymCardHeaderLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flex: 1,
  },
  gymCardTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  gymCardSub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
    display: 'block',
    marginTop: '2px',
  },
  gymCardDesc: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: '1.4',
    margin: 0,
    fontFamily: "'Inter', sans-serif",
  },
  gymOptionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '6px',
  },
  gymOptionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    gap: '12px',
  },
  gymOptionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
  },
  gymOptionName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  gymOptionAddr: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
  },
  gymConnectBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    background: '#00D4FF',
    border: 'none',
    color: '#0A0A0F',
    fontWeight: 700,
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  gymCancelBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'center',
    fontFamily: "'Outfit', sans-serif",
    marginTop: '6px',
  },
  gymChangeLink: {
    background: 'none',
    border: 'none',
    color: '#00D4FF',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  gymStatsRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  gymStatBox: {
    flex: 1,
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gymStatLabel: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
  },
  gymStatValue: {
    fontSize: '13px',
    color: '#fff',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
  },
  gymStatValueStreak: {
    fontSize: '13px',
    color: '#FF9500',
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
  },
  gymCheckinBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    background: 'linear-gradient(90deg, #39FF14 0%, #00FF66 100%)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(57,255,20,0.3)',
    marginTop: '4px',
  },
  scannerModal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '440px',
    background: '#0A0A0F',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '32px',
    padding: '24px',
    zIndex: 100000,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  scannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  scannerTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  scannerCloseBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  scannerBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  viewfinderContainer: {
    position: 'relative',
    width: '100%',
    height: '200px',
    background: '#040406',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '20px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderCornerTL: { position: 'absolute', top: '16px', left: '16px', width: '20px', height: '20px', borderTop: '3px solid #39FF14', borderLeft: '3px solid #39FF14', borderTopLeftRadius: '4px' },
  viewfinderCornerTR: { position: 'absolute', top: '16px', right: '16px', width: '20px', height: '20px', borderTop: '3px solid #39FF14', borderRight: '3px solid #39FF14', borderTopRightRadius: '4px' },
  viewfinderCornerBL: { position: 'absolute', bottom: '16px', left: '16px', width: '20px', height: '20px', borderBottom: '3px solid #39FF14', borderLeft: '3px solid #39FF14', borderBottomLeftRadius: '4px' },
  viewfinderCornerBR: { position: 'absolute', bottom: '16px', right: '16px', width: '20px', height: '20px', borderBottom: '3px solid #39FF14', borderRight: '3px solid #39FF14', borderBottomRightRadius: '4px' },
  scannerLaser: {
    position: 'absolute',
    left: '16px',
    right: '16px',
    height: '2px',
    background: '#39FF14',
    boxShadow: '0 0 8px #39FF14, 0 0 12px #39FF14',
    zIndex: 2,
  },
  viewfinderStatusText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif",
    textAlign: 'center',
    padding: '0 24px',
    zIndex: 3,
  },
  manualInputRow: {
    display: 'flex',
    gap: '8px',
  },
  manualInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
  },
  manualInputBtn: {
    padding: '12px 16px',
    background: '#00D4FF',
    color: '#0A0A0F',
    border: 'none',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  simulationContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '16px',
  },
  simulationTitle: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
    fontFamily: "'Outfit', sans-serif",
  },
  simulationButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  simBtn: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  simBtnError: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,45,85,0.05)',
    border: '1px solid rgba(255,45,85,0.15)',
    borderRadius: '10px',
    color: '#FF2D55',
    fontSize: '12px',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  scannerErrorMsg: {
    padding: '10px 12px',
    background: 'rgba(255,45,85,0.05)',
    border: '1px solid rgba(255,45,85,0.15)',
    borderRadius: '12px',
    color: '#FF2D55',
    fontSize: '12px',
    fontFamily: "'Inter', sans-serif",
  },
  scannerSuccessContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px 8px 8px',
    textAlign: 'center',
  },
  scannerSuccessIconBg: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#39FF14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 0 20px rgba(57,255,20,0.4)',
  },
  scannerSuccessTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: '0 0 8px 0',
  },
  scannerSuccessDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
    fontFamily: "'Inter', sans-serif",
  },
  scannerSuccessBtn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  }
};
