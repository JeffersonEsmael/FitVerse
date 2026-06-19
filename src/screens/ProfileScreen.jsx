import React, { useEffect, useState, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Grid3x3, Award, ChevronRight, ScanLine, MessageCircle, Video, Image as ImageIcon, Plus, Trophy, Flame, Target, Dumbbell, Zap, Star, X, Camera, Play, MoreVertical, Check, MapPin, QrCode, Calendar, Shield, Copy, Info, MessageSquare, Lock } from 'lucide-react';
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

const MASTERY_MAP = {
  none: 'Sem Maestria',
  Iniciante: '🟢 Iniciante',
  Casual: '🎮 Casual',
  Intermediário: '🟡 Intermediário',
  Avançado: '🔴 Avançado',
  Atleta: '🏃 Atleta',
  Maratonista: '👟 Maratonista',
  Maromba: '💪 Maromba',
  Jogador: '🕹️ Jogador',
  Monstro: '👹 Monstro',
  Bodybuilder: '🏋️ Bodybuilder',
  Fibrado: '⚡ Fibrado',
  'Mestre do Cardio': '🚴 Mestre do Cardio',
  'Foco Total': '🎯 Foco Total',
  Elite: '👑 Elite',
  Lutador: '🥋 Lutador'
};

import { PRESET_EXERCISES_BY_GROUP } from '../utils/exercises';
import ExerciseVideoModal from '../components/workout/ExerciseVideoModal';
import verifiedBadgeImg from '../assets/verified.png';

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
  const { user, profile, isProfileLoading, refreshProfile, updateProfile } = useAuthStore();
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
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const scanIntervalRef = React.useRef(null);
  const hasScannedRef = React.useRef(false);

  // Close QR scanner helper - stops camera and resets state
  const closeQrScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    hasScannedRef.current = false;
    setShowQrScanModal(false);
  }, []);

  // Handle scanned QR code token
  const handleQrScanned = useCallback(async (token) => {
    if (hasScannedRef.current || isPerformingScan) return;
    hasScannedRef.current = true;
    setIsPerformingScan(true);
    setCheckinErrorMessage('');
    try {
      const res = await performGymCheckin(user.uid, token);
      if (res.success) {
        setCheckinSuccessMessage(
          `Check-in realizado com sucesso na unidade ${res.gym.name}! Seu streak atual é de ${res.newStreak} dias.`
        );
        fetchUserCheckins(user.uid);
      }
    } catch (err) {
      setCheckinErrorMessage(err.message || 'Falha ao realizar check-in.');
      hasScannedRef.current = false; // allow retry on error
    } finally {
      setIsPerformingScan(false);
    }
  }, [user?.uid, isPerformingScan, performGymCheckin, fetchUserCheckins]);

  // Camera + QR scanning effect
  useEffect(() => {
    let streamRef = null;
    let barcodeDetector = null;

    if (showQrScanModal) {
      hasScannedRef.current = false;
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
        .then(stream => {
          streamRef = stream;
          setCameraStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          // Setup QR scanning via BarcodeDetector API
          if ('BarcodeDetector' in window) {
            try {
              barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            } catch (e) {
              console.warn('[QR] BarcodeDetector init failed:', e);
            }
          }

          // Start frame-by-frame scanning
          const scanFrame = async () => {
            if (hasScannedRef.current) return;
            const video = videoRef.current;
            if (!video || video.readyState < 2) return;

            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes.length > 0) {
                  const qrValue = barcodes[0].rawValue;
                  if (qrValue) {
                    console.log('[QR] Detected:', qrValue);
                    handleQrScanned(qrValue);
                    return;
                  }
                }
              } catch (e) {
                // BarcodeDetector.detect can fail on some frames
              }
            } else {
              // Fallback: canvas-based pixel check (no actual decoding without library)
              // For environments without BarcodeDetector, rely on manual input
              const canvas = canvasRef.current;
              if (canvas && video.videoWidth > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(video, 0, 0);
                // Without a JS QR decoder lib, BarcodeDetector is needed
                // Users without it can use the manual token input
              }
            }
          };

          scanIntervalRef.current = setInterval(scanFrame, 350);
        })
        .catch(err => {
          console.warn('[Profile] Camera permission denied or not available:', err);
        });
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop());
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showQrScanModal]);

  // Sync cameraStream to video element srcObject when elements are mounted/rendered
  useEffect(() => {
    if (videoRef.current) {
      if (showQrScanModal && cameraStream) {
        if (videoRef.current.srcObject !== cameraStream) {
          videoRef.current.srcObject = cameraStream;
        }
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [cameraStream, showQrScanModal]);

  useEffect(() => {
    fetchGyms();
    if (user?.uid) {
      fetchUserCheckins(user.uid);
    }
  }, [user?.uid, fetchGyms, fetchUserCheckins]);
  
  const [activeProfileTab, setActiveProfileTab] = useState('videos');
  const [showBusinessQrModal, setShowBusinessQrModal] = useState(false);
  const [showMasteryModal, setShowMasteryModal] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  
  // Minha Série Modal states
  const [showEditSeriesModal, setShowEditSeriesModal] = useState(false);
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [seriesModalName, setSeriesModalName] = useState('');
  const [seriesModalFrequency, setSeriesModalFrequency] = useState('3x por semana');
  const [seriesModalTotal, setSeriesModalTotal] = useState(30);
  const [seriesModalIsPublic, setSeriesModalIsPublic] = useState(true);
  const [seriesModalExercises, setSeriesModalExercises] = useState([]);
  
  // Local state for editing an exercise inside form
  const [tempExerciseName, setTempExerciseName] = useState('');
  const [tempExerciseSets, setTempExerciseSets] = useState(4);
  const [tempExerciseReps, setTempExerciseReps] = useState('10');
  const [tempExerciseWeight, setTempExerciseWeight] = useState(0);
  const [activePresetGroup, setActivePresetGroup] = useState('Peito');

  const updateExerciseField = (index, field, value) => {
    const updated = [...seriesModalExercises];
    if (updated[index]) {
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      setSeriesModalExercises(updated);
    }
  };




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
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
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

  // Dynamically derive fallback names from user email/metadata
  const fallbackName = user?.email ? user.email.split('@')[0] : 'user';
  const formatName = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  const fallbackDisplayName = formatName(fallbackName);

  const usernameToShow = p.username || fallbackName;
  const displayNameToShow = p.display_name || user?.user_metadata?.display_name || fallbackDisplayName;

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

  const fetchBusinessFeedbacks = useCallback(async (busId) => {
    setLoadingFeedbacks(true);
    try {
      const { data, error } = await supabase
        .from('business_feedbacks')
        .select('*')
        .eq('business_id', busId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.warn('[Profile] Error loading business feedbacks, using mock:', err.message);
      setFeedbacks([
        {
          id: 'mock_fb_1',
          user_name: 'Lucas Trainer',
          user_avatar: '',
          rating: 5,
          comment: 'Melhor academia da região! Aparelhos novos e staff super atencioso. Recomendo muito o treino de pernas com os novos leg press.',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'mock_fb_2',
          user_name: 'Ana Nutri',
          user_avatar: '',
          rating: 4,
          comment: 'Ambiente excelente, bem ventilado e higienizado. O app FlowRise integrado ajuda muito a acompanhar o treino.',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoadingFeedbacks(false);
    }
  }, []);

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
      if (profile?.profile_type === 'business') {
        fetchBusinessFeedbacks(user.uid);
      }
    }
  }, [currentScreen, user?.uid, refreshProfile, fetchUserPosts, fetchSeries, fetchChallenges, profile?.profile_type, fetchBusinessFeedbacks]);

  useEffect(() => {
    if (activeProfileTab === 'sobre' && user?.uid) {
      fetchBusinessFeedbacks(user.uid);
    }
  }, [activeProfileTab, user?.uid, fetchBusinessFeedbacks]);

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

  const getThemeBackground = (themeId) => {
    const themes = {
      green: 'radial-gradient(circle at top, rgba(57, 255, 20, 0.12) 0%, rgba(10, 10, 15, 0) 70%)',
      blue: 'radial-gradient(circle at top, rgba(0, 212, 255, 0.12) 0%, rgba(10, 10, 15, 0) 70%)',
      yellow: 'radial-gradient(circle at top, rgba(255, 215, 0, 0.12) 0%, rgba(10, 10, 15, 0) 70%)',
      pink: 'radial-gradient(circle at top, rgba(255, 45, 85, 0.12) 0%, rgba(10, 10, 15, 0) 70%)',
      orange: 'radial-gradient(circle at top, rgba(255, 149, 0, 0.12) 0%, rgba(10, 10, 15, 0) 70%)',
    };
    return themes[themeId] || 'transparent';
  };

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

      <div style={{ ...styles.container, background: getThemeBackground(p.profile_theme_color) }}>
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
          <div className="profile-card-header">
            <div style={styles.profileInfoBlock}>
              <h3 style={{ ...styles.usernameLeft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                @{usernameToShow}
                {(usernameToShow?.toLowerCase() === 'flowrise' || usernameToShow?.toLowerCase() === 'flowride') && (
                  <img src={verifiedBadgeImg} alt="verificado" style={{ width: '22px', height: '22px', marginLeft: '6px', objectFit: 'contain', flexShrink: 0 }} />
                )}
              </h3>
              <span style={styles.displayNameLeft}>{displayNameToShow}</span>

              <div className="profile-stats-row">
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
                  <div style={styles.avatarPlaceholder}>{displayNameToShow.charAt(0).toUpperCase() || '?'}</div>
                )}
              </div>
              {/* Mastery Title */}
              {p.show_mastery !== false ? (
                <span
                  style={{ ...styles.masteryTitle, cursor: 'pointer' }}
                  onClick={() => setShowMasteryModal(true)}
                >
                  {MASTERY_MAP[p.mastery] || 'Iniciante'}
                </span>
              ) : (
                <span
                  style={{
                    ...styles.masteryTitle,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setShowMasteryModal(true)}
                >
                  ❌ Sem Maestria
                </span>
              )}
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
          {p.profile_type === 'business' ? (
            <div style={{ ...styles.statsGrid, width: '100%', marginTop: '20px', marginBottom: 0 }}>
              <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
              <StatBox label="Avaliações" value={feedbacks.length} icon={Star} color="#FFD700" onClick={() => setActiveProfileTab('sobre')} />
              <StatBox label="Chat" value="Conversar" icon={MessageCircle} color="#00D4FF" onClick={() => navigate('conversations')} />
            </div>
          ) : (
            <div style={{ ...styles.statsGrid, width: '100%', marginTop: '20px', marginBottom: 0 }}>
              <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
              <StatBox label="Medalhas" value={totalMedalsCount} icon={Award} color="#FFD700" onClick={() => setShowMedalsModal(true)} />
              <StatBox label="Minha Série" value="Série" icon={Dumbbell} color="#00D4FF" onClick={() => setActiveProfileTab('serie')} />
            </div>
          )}
        </motion.div>

        {/* Quick access */}
        {p.profile_type === 'business' ? (
          <div style={styles.quickAccess}>
            {/* Business QR Code Generator */}
            <motion.button
              style={{ ...styles.quickBtn, width: '100%', flex: 'none' }}
              onClick={() => setShowBusinessQrModal(true)}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ ...styles.quickIcon, background: 'rgba(57,255,20,0.15)' }}>
                <QrCode size={20} color="#39FF14" />
              </div>
              <div style={styles.quickInfo}>
                <span style={styles.quickTitle}>Disponibilizar QR Code</span>
                <span style={styles.quickDesc}>QR Code para check-in dos alunos</span>
              </div>
            </motion.button>
          </div>
        ) : (
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
        )}

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
          {p.profile_type === 'business' ? (
            <button
              style={{ ...styles.contentTab, ...(activeProfileTab === 'sobre' ? styles.contentTabActive : {}) }}
              onClick={() => setActiveProfileTab('sobre')}
            >
              <Info size={18} /> Sobre
            </button>
          ) : (
            <button
              style={{ ...styles.contentTab, ...(activeProfileTab === 'serie' ? styles.contentTabActive : {}) }}
              onClick={() => setActiveProfileTab('serie')}
            >
              <Dumbbell size={18} /> Série
            </button>
          )}
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
                  {post.mediaType === 'image' || post.mediaType === 'carousel' ? (
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

        {/* Content - Sobre (Business details and feedbacks) */}
        {activeProfileTab === 'sobre' && p.profile_type === 'business' && (
          <div style={workoutStyles.container}>
            <div style={{
              ...styles.sobreCard,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '18px',
              padding: '24px 16px'
            }}>
              <h4 style={styles.sobreTitle}>Sobre a {p.display_name || 'Empresa'}</h4>
              
              {/* Gallery Row inside card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '4px' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    overflowX: 'auto', 
                    paddingBottom: '8px',
                    width: '100%',
                  }} 
                  className="hide-scrollbar"
                >
                  {(() => {
                    const photos = Array.isArray(p.business_photos) && p.business_photos.length > 0 
                      ? p.business_photos 
                      : [
                          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400',
                          'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=400',
                          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=400'
                        ];
                    
                    return photos.map((url, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          position: 'relative', 
                          width: 'calc((100% - 24px) / 2.5)', 
                          minWidth: '135px',
                          height: '95px', 
                          borderRadius: '12px', 
                          overflow: 'hidden', 
                          flexShrink: 0,
                          border: '1px solid rgba(255,255,255,0.08)'
                        }}
                      >
                        <img src={url} alt={`Galeria ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {i === 2 && photos.length > 3 && (
                          <div style={{
                            position: 'absolute', inset: 0, 
                            background: 'rgba(0,0,0,0.5)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: "'Outfit', sans-serif"
                          }}>
                            +{photos.length - 2}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={styles.sobreLabel}>📍 Endereço</span>
                {p.address ? (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(p.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...styles.sobreValue, color: '#00D4FF', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {p.address}
                  </a>
                ) : (
                  <span style={styles.sobreValue}>Endereço não informado</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={styles.sobreLabel}>🚗 Garagem</span>
                <span style={styles.sobreValue}>
                  {p.has_garage === 'sim' ? 'Sim' : 'Não'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                <span style={styles.sobreLabel}>⏰ Horário de Funcionamento</span>
                {(() => {
                  if (!p.operating_hours) {
                    return <span style={styles.sobreValue}>Não informado</span>;
                  }
                  try {
                    if (p.operating_hours.trim().startsWith('{')) {
                      const hoursObj = JSON.parse(p.operating_hours);
                      return (
                        <div style={styles.hoursList}>
                          {Object.entries(hoursObj).map(([day, data]) => (
                            <div key={day} style={styles.hoursRow}>
                              <span style={styles.hoursDay}>{day}</span>
                              {data.closed ? (
                                <span style={styles.hoursClosed}>Fechado</span>
                              ) : (
                                <span style={styles.hoursTime}>{data.open} às {data.close}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch (e) {
                    console.warn('Error parsing operating_hours in render:', e);
                  }
                  return <span style={styles.sobreValue}>{p.operating_hours}</span>;
                })()}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', marginTop: '8px' }}>
                {p.whatsapp ? (
                  <motion.a
                    whileTap={{ scale: 0.97 }}
                    href={`https://wa.me/${p.whatsapp}?text=${encodeURIComponent('Olá, vim pelo FlowRide e gostaria de mais informações!')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.whatsappBtn}
                  >
                    <MessageCircle size={18} color="#25D366" fill="transparent" />
                    WhatsApp
                  </motion.a>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                    WhatsApp não cadastrado
                  </span>
                )}
              </div>
            </div>

            {/* Feedbacks Header */}
            <div style={styles.feedbacksHeader}>
              <h4 style={styles.feedbacksTitle}>Feedbacks de Frequentadores</h4>
              <span style={styles.feedbacksCount}>{feedbacks.length} avaliações</span>
            </div>

            {/* Feedbacks List */}
            <div style={styles.feedbacksList}>
              {loadingFeedbacks ? (
                <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px 0' }}>
                  Carregando avaliações...
                </div>
              ) : feedbacks.length === 0 ? (
                <div style={styles.emptyFeedbacks}>
                  <span>Nenhum feedback deixado ainda.</span>
                </div>
              ) : (
                feedbacks.map((fb) => (
                  <div key={fb.id} style={styles.feedbackCard}>
                    <div style={styles.feedbackUserRow}>
                      <div style={styles.feedbackUserAvatar}>
                        {fb.user_avatar ? (
                          <img src={fb.user_avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                          <div style={styles.avatarPlaceholderMini}>{fb.user_name?.charAt(0) || '?'}</div>
                        )}
                      </div>
                      <div style={styles.feedbackUserInfo}>
                        <span style={styles.feedbackUserName}>{fb.user_name}</span>
                        <span style={styles.feedbackDate}>
                          {new Date(fb.created_at).toLocaleDateString('pt-BR')}
                          {fb.is_edited && <span style={styles.editedLabel}> (Editado)</span>}
                        </span>
                      </div>
                      <div style={styles.feedbackRating}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ color: i < fb.rating ? '#FFD700' : 'rgba(255,255,255,0.15)', fontSize: '14px' }}>
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {fb.comment && <p style={styles.feedbackComment}>{fb.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Content - Série */}
        {activeProfileTab === 'serie' && p.profile_type !== 'business' && (
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
                    setSeriesModalIsPublic(true);
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
              const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

              return (
                <div style={workoutStyles.activeSeriesContainer}>
                  {/* Letters Series selector */}
                  <div style={workoutStyles.lettersTabContainer}>
                    <div style={workoutStyles.lettersRow}>
                      {seriesList.map((s, index) => {
                        const letter = letters[index] || `S${index + 1}`;
                        const isActive = s.id === activeSeries.id;
                        return (
                          <motion.button
                            key={s.id}
                            style={{
                              ...workoutStyles.letterBtn,
                              ...(isActive ? workoutStyles.letterBtnActive : {})
                            }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveSeries(user?.uid, s.id)}
                          >
                            {letter}
                          </motion.button>
                        );
                      })}
                      {/* Add new series button */}
                      <motion.button
                        style={workoutStyles.letterBtnAdd}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSeriesModalName('');
                          setSeriesModalFrequency('3x por semana');
                          setSeriesModalTotal(30);
                          setSeriesModalIsPublic(true);
                          setSeriesModalExercises([
                            { id: 'ex_new_1', name: 'Exercício 1', sets: 4, reps: '10', weight: 10, done_today: false }
                          ]);
                          setShowCreateSeriesModal(true);
                        }}
                      >
                        +
                      </motion.button>
                    </div>
                    {/* Active series action buttons */}
                    <div style={workoutStyles.activeSeriesActions}>
                      <button
                        style={workoutStyles.headerActionBtn}
                        onClick={() => {
                          setSeriesModalName(activeSeries.name);
                          setSeriesModalFrequency(activeSeries.weekly_frequency);
                          setSeriesModalTotal(activeSeries.progress_total);
                          setSeriesModalIsPublic(activeSeries.is_public !== false);
                          setSeriesModalExercises(activeSeries.exercises || []);
                          setShowEditSeriesModal(true);
                        }}
                      >
                        Editar Série
                      </button>
                    </div>
                  </div>

                  {/* Prancheta de Exercícios (Clipboard) */}
                  <div className="workout-clipboard">
                    <div className="workout-clipboard-header">
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 className="workout-clipboard-title">{activeSeries.name}</h4>
                        <span className="workout-clipboard-freq">{activeSeries.weekly_frequency}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: activeSeries.is_public ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                          color: activeSeries.is_public ? '#16A34A' : '#718096',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {activeSeries.is_public ? 'Pública' : 'Privada'}
                        </span>
                        {activeSeries.is_public && activeSeries.copies_count > 0 && (
                          <span style={{ fontSize: '11px', color: '#718096', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Copy size={10} color="#718096" />
                            {activeSeries.copies_count} {activeSeries.copies_count === 1 ? 'cópia' : 'cópias'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="workout-clipboard-progress">
                      <div className="workout-clipboard-progress-labels">
                        <span className="workout-clipboard-progress-label">Progresso Geral</span>
                        <span className="workout-clipboard-progress-val">
                          {activeSeries.progress_completed || 0}/{activeSeries.progress_total || 30} treinos
                        </span>
                      </div>
                      <div className="workout-clipboard-progress-track">
                        <div 
                          className="workout-clipboard-progress-fill" 
                          style={{ width: `${Math.min(100, Math.round(((activeSeries.progress_completed || 0) / (activeSeries.progress_total || 30)) * 100))}%` }} 
                        />
                      </div>
                    </div>

                    {/* Exercises List */}
                    <div className="workout-clipboard-list">
                      {(!activeSeries.exercises || activeSeries.exercises.length === 0) ? (
                        <div style={{ ...workoutStyles.noExercisesCard, background: '#F8FAFC', border: '1px dashed #CBD5E0', color: '#718096' }}>
                          <span>Nenhum exercício cadastrado nesta série.</span>
                          <button
                            style={{ ...workoutStyles.addExerciseInlineBtn, background: '#EDF2F7', border: '1px solid #CBD5E0', color: '#4A5568' }}
                            onClick={() => {
                              setSeriesModalName(activeSeries.name);
                              setSeriesModalFrequency(activeSeries.weekly_frequency);
                              setSeriesModalTotal(activeSeries.progress_total);
                              setSeriesModalIsPublic(activeSeries.is_public !== false);
                              setSeriesModalExercises(activeSeries.exercises || []);
                              setShowEditSeriesModal(true);
                            }}
                          >
                            Adicionar Exercícios
                          </button>
                        </div>
                      ) : (
                        activeSeries.exercises.map((ex) => (
                          <div
                            key={ex.id}
                            className={`workout-clipboard-item ${ex.done_today ? 'workout-clipboard-item-done' : ''}`}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '12px' }}>
                              <span className={`workout-clipboard-item-name ${ex.done_today ? 'workout-clipboard-item-name-done' : ''}`}>
                                {ex.name}
                              </span>
                              <span className="workout-clipboard-item-meta">
                                {ex.sets} séries x {ex.reps} reps {ex.weight > 0 ? `• ${ex.weight}kg` : ''}
                              </span>
                            </div>

                            <div className="workout-clipboard-item-actions">
                              {/* Video Button */}
                              <button
                                className="workout-clipboard-video-btn"
                                onClick={() => setSelectedExercise(ex.name)}
                                title="Ver vídeo do exercício"
                              >
                                <Play size={14} color="#0088CC" fill="#0088CC" />
                              </button>

                              {/* Done Button (Circular Checkbox) */}
                              <button
                                className="workout-clipboard-check-btn"
                                onClick={() => toggleExerciseDone(user?.uid, activeSeries.id, ex.id)}
                              >
                                <div className={`workout-clipboard-check-circle ${ex.done_today ? 'workout-clipboard-check-circle-done' : ''}`}>
                                  {ex.done_today && <Check size={16} color="#ffffff" strokeWidth={3} />}
                                </div>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
                  onClick={() => {
                    useFeedStore.getState().setActiveTab('challenges');
                    navigate('feed');
                  }}
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
                  onClick={() => {
                    useFeedStore.getState().setActiveTab('challenges');
                    navigate('feed');
                  }}
                >
                  <Trophy size={16} color="#FFD700" />
                  Descobrir mais Desafios
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Selecionar Maestria */}
      <AnimatePresence>
        {showMasteryModal && (
          <>
            {/* Backdrop */}
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMasteryModal(false)}
            />
            {/* Sheet / Dialog */}
            <motion.div
              style={{
                ...modalStyles.workoutModal,
                zIndex: 100003,
                maxHeight: '75vh',
              }}
              initial={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
              exit={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              transition={{ type: 'spring', duration: 0.3 }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>Escolha sua Maestria</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowMasteryModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>

              <div style={{ ...modalStyles.modalScrollBody, display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 0' }} className="hide-scrollbar">
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                  A maestria selecionada aparecerá logo abaixo da sua foto de perfil.
                </span>

                {[
                  { value: 'none', label: '❌ Sem Maestria (Ocultar)', minMedals: 0, minXp: 0 },
                  { value: 'Iniciante', label: '🟢 Iniciante', minMedals: 0, minXp: 0 },
                  { value: 'Casual', label: '🎮 Casual', minMedals: 0, minXp: 0 },
                  { value: 'Intermediário', label: '🟡 Intermediário', minMedals: 0, minXp: 0 },
                  { value: 'Avançado', label: '🔴 Avançado', minMedals: 1, minXp: 100 },
                  { value: 'Atleta', label: '🏃 Atleta', minMedals: 2, minXp: 300 },
                  { value: 'Maratonista', label: '👟 Maratonista', minMedals: 3, minXp: 500 },
                  { value: 'Maromba', label: '💪 Maromba', minMedals: 5, minXp: 800 },
                  { value: 'Jogador', label: '🕹️ Jogador', minMedals: 6, minXp: 1200 },
                  { value: 'Monstro', label: '👹 Monstro', minMedals: 8, minXp: 1800 },
                  { value: 'Bodybuilder', label: '🏋️ Bodybuilder', minMedals: 10, minXp: 2500 },
                  { value: 'Fibrado', label: '⚡ Fibrado', minMedals: 12, minXp: 3500 },
                  { value: 'Mestre do Cardio', label: '🚴 Mestre do Cardio', minMedals: 15, minXp: 4500 },
                  { value: 'Foco Total', label: '🎯 Foco Total', minMedals: 18, minXp: 6000 },
                  { value: 'Elite', label: '👑 Elite', minMedals: 22, minXp: 8000 },
                  { value: 'Lutador', label: '🥋 Lutador', minMedals: 25, minXp: 10000 }
                ].map((opt) => {
                  const isCurrent = opt.value === 'none' 
                    ? p.show_mastery === false 
                    : (p.show_mastery !== false && p.mastery === opt.value);

                  const isUnlocked = totalMedalsCount >= opt.minMedals && (p.xp || 0) >= opt.minXp;

                  return (
                    <motion.button
                      key={opt.value}
                      type="button"
                      style={{
                        padding: '12px 16px',
                        borderRadius: '14px',
                        border: isCurrent 
                          ? '1px solid #39FF14' 
                          : isUnlocked 
                            ? '1px solid rgba(255,255,255,0.08)' 
                            : '1px solid rgba(255,255,255,0.03)',
                        background: isCurrent 
                          ? 'rgba(57,255,20,0.15)' 
                          : isUnlocked 
                            ? 'rgba(255,255,255,0.03)' 
                            : 'rgba(255,255,255,0.01)',
                        color: isCurrent 
                          ? '#39FF14' 
                          : isUnlocked 
                            ? '#fff' 
                            : 'rgba(255,255,255,0.3)',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'left',
                        cursor: isUnlocked ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: "'Outfit', sans-serif",
                        outline: 'none',
                        transition: 'all 0.15s ease',
                        opacity: isUnlocked ? 1 : 0.6
                      }}
                      whileTap={isUnlocked ? { scale: 0.98 } : {}}
                      onClick={async () => {
                        if (!isUnlocked) {
                          alert(`Esta maestria está bloqueada!\n\nRequisitos:\n• ${opt.minMedals} medalha${opt.minMedals > 1 ? 's' : ''} (Você tem ${totalMedalsCount})\n• ${opt.minXp} XP (Você tem ${p.xp || 0} XP)`);
                          return;
                        }
                        if (opt.value === 'none') {
                          await updateProfile({ show_mastery: false });
                        } else {
                          await updateProfile({ mastery: opt.value, show_mastery: true });
                        }
                        setShowMasteryModal(false);
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>{opt.label}</span>
                        {!isUnlocked && (
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                            Requer: {opt.minMedals} medalha{opt.minMedals > 1 ? 's' : ''} • {opt.minXp} XP
                          </span>
                        )}
                      </div>
                      {isCurrent ? (
                        <Check size={16} color="#39FF14" strokeWidth={3} />
                      ) : !isUnlocked ? (
                        <Lock size={14} color="rgba(255,255,255,0.3)" />
                      ) : null}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

                {/* Cancelar Desafio Button */}
                <button
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: 'rgba(255, 45, 85, 0.15)',
                    border: '1px solid rgba(255, 45, 85, 0.3)',
                    color: '#FF453A',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontFamily: "'Outfit', sans-serif",
                    marginTop: '4px'
                  }}
                  onClick={async () => {
                    if (window.confirm('Tem certeza que deseja cancelar e sair deste desafio? Todo o seu progresso neste desafio será excluído.')) {
                      const { useRankingStore } = await import('../stores/rankingStore');
                      await useRankingStore.getState().leaveChallenge(selectedChallenge.id);
                      setSelectedChallenge(null);
                      loadProfileChallenges();
                    }
                  }}
                >
                  Cancelar Desafio
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
              initial={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
              exit={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>Criar Nova Série</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowCreateSeriesModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>
              <div className="hide-scrollbar" style={{ ...modalStyles.modalScrollBody, display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
                <div style={modalStyles.checkInField}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <label style={modalStyles.checkInLabel}>Nome da Série</label>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSeriesModalIsPublic(!seriesModalIsPublic)}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'Outfit', sans-serif" }}>
                        {seriesModalIsPublic ? 'Público' : 'Privado'}
                      </span>
                      <div style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        background: seriesModalIsPublic ? '#39FF14' : 'rgba(255,255,255,0.08)',
                        position: 'relative',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: seriesModalIsPublic ? 'flex-end' : 'flex-start',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: seriesModalIsPublic ? '#fff' : '#1A1A2E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease'
                        }}>
                          {seriesModalIsPublic ? (
                            <Check size={12} color="#39FF14" strokeWidth={3} />
                          ) : (
                            <Lock size={12} color="#00D4FF" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Hipertrofia A ou Treino de Pernas"
                    value={seriesModalName}
                    onChange={(e) => setSeriesModalName(e.target.value)}
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
                    {/* Suggested Exercises Grid with Tags */}
                    <div style={{ marginTop: '2px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>Sugestões rápidas por grupo muscular:</span>
                      
                      {/* Tags/Categories Selector */}
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }} className="hide-scrollbar">
                        {Object.keys(PRESET_EXERCISES_BY_GROUP).map((groupName) => {
                          const isGroupActive = activePresetGroup === groupName;
                          return (
                            <button
                              key={groupName}
                              type="button"
                              style={{
                                flex: '0 0 80px',
                                flexShrink: 0,
                                padding: '6px 0',
                                textAlign: 'center',
                                background: isGroupActive ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: isGroupActive ? '1px solid #00D4FF' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                color: isGroupActive ? '#00D4FF' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif",
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => setActivePresetGroup(groupName)}
                            >
                              {groupName}
                            </button>
                          );
                        })}
                      </div>

                      {/* Exercises Grid under active Group */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '2px' }}>
                        {PRESET_EXERCISES_BY_GROUP[activePresetGroup]?.map((preset) => {
                          const isAlreadyAdded = seriesModalExercises.some(ex => ex.name.trim().toLowerCase() === preset.trim().toLowerCase());
                          return (
                            <button
                              key={preset}
                              type="button"
                              style={{
                                padding: '6px 12px',
                                background: isAlreadyAdded 
                                  ? 'rgba(57,255,20,0.12)' 
                                  : 'rgba(255, 255, 255, 0.04)',
                                border: isAlreadyAdded 
                                  ? '1.5px solid #39FF14' 
                                  : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '20px',
                                color: isAlreadyAdded 
                                  ? '#39FF14' 
                                  : '#fff',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif",
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => {
                                if (isAlreadyAdded) {
                                  const confirmRemove = window.confirm(`Deseja remover "${preset}" da sua lista de exercícios?`);
                                  if (confirmRemove) {
                                    setSeriesModalExercises(seriesModalExercises.filter(ex => ex.name.trim().toLowerCase() !== preset.trim().toLowerCase()));
                                  }
                                } else {
                                  const newEx = {
                                    id: `ex_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                    name: preset,
                                    sets: 4,
                                    reps: '10',
                                    weight: 0,
                                    done_today: false
                                  };
                                  setSeriesModalExercises([...seriesModalExercises, newEx]);
                                }
                              }}
                            >
                              {preset}
                            </button>
                          );
                        })}
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
                          sets: 4,
                          reps: '10',
                          weight: 0,
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {seriesModalExercises.map((ex, idx) => (
                        <div key={ex.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>{ex.name}</span>
                             <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              onClick={() => {
                                const confirmDel = window.confirm(`Deseja realmente remover o exercício "${ex.name}"?`);
                                if (confirmDel) {
                                  setSeriesModalExercises(seriesModalExercises.filter((_, i) => i !== idx));
                                }
                              }}
                            >
                              <X size={16} color="#FF2D55" />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Séries</span>
                              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    width: '24px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    userSelect: 'none'
                                  }}
                                  onClick={() => {
                                    const currentVal = parseInt(ex.sets) || 1;
                                    const newVal = Math.max(1, currentVal - 1);
                                    updateExerciseField(idx, 'sets', newVal);
                                  }}
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={ex.sets === undefined || ex.sets === null ? '' : ex.sets}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d+$/.test(val)) {
                                      updateExerciseField(idx, 'sets', val);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (isNaN(val) || val <= 0) {
                                      updateExerciseField(idx, 'sets', 1);
                                    } else {
                                      updateExerciseField(idx, 'sets', val);
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    fontFamily: "'Inter', sans-serif",
                                    outline: 'none',
                                    width: '100%',
                                    padding: 0
                                  }}
                                />
                                <button
                                  type="button"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    width: '24px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    userSelect: 'none'
                                  }}
                                  onClick={() => {
                                    const currentVal = parseInt(ex.sets) || 1;
                                    const newVal = currentVal + 1;
                                    updateExerciseField(idx, 'sets', newVal);
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Reps</span>
                              <input
                                type="text"
                                value={ex.reps === undefined || ex.reps === null ? '' : ex.reps}
                                onChange={(e) => {
                                  updateExerciseField(idx, 'reps', e.target.value);
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val === '0' || val === '') {
                                    updateExerciseField(idx, 'reps', '1');
                                  }
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontFamily: "'Inter', sans-serif",
                                  outline: 'none',
                                  height: '32px',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Carga (kg)</span>
                              <input
                                type="text"
                                value={ex.weight === undefined || ex.weight === null ? '' : ex.weight}
                                onChange={(e) => {
                                  updateExerciseField(idx, 'weight', e.target.value);
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val === '0' || val === '') {
                                    updateExerciseField(idx, 'weight', '1');
                                  }
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontFamily: "'Inter', sans-serif",
                                  outline: 'none',
                                  height: '32px',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>
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
                  createSeries(user?.uid, seriesModalName, seriesModalFrequency, seriesModalTotal, seriesModalExercises, seriesModalIsPublic);
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
              initial={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
              exit={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>Editar Série</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowEditSeriesModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>
              <div className="hide-scrollbar" style={{ ...modalStyles.modalScrollBody, display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0' }}>
                <div style={modalStyles.checkInField}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <label style={modalStyles.checkInLabel}>Nome da Série</label>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setSeriesModalIsPublic(!seriesModalIsPublic)}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255, 255, 255, 0.7)', fontFamily: "'Outfit', sans-serif" }}>
                        {seriesModalIsPublic ? 'Público' : 'Privado'}
                      </span>
                      <div style={{
                        width: '44px',
                        height: '24px',
                        borderRadius: '12px',
                        background: seriesModalIsPublic ? '#39FF14' : 'rgba(255,255,255,0.08)',
                        position: 'relative',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: seriesModalIsPublic ? 'flex-end' : 'flex-start',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: seriesModalIsPublic ? '#fff' : '#1A1A2E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease'
                        }}>
                          {seriesModalIsPublic ? (
                            <Check size={12} color="#39FF14" strokeWidth={3} />
                          ) : (
                            <Lock size={12} color="#00D4FF" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Hipertrofia A ou Treino de Pernas"
                    value={seriesModalName}
                    onChange={(e) => setSeriesModalName(e.target.value)}
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
                    {/* Suggested Exercises Grid with Tags */}
                    <div style={{ marginTop: '2px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }}>Sugestões rápidas por grupo muscular:</span>
                      
                      {/* Tags/Categories Selector */}
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }} className="hide-scrollbar">
                        {Object.keys(PRESET_EXERCISES_BY_GROUP).map((groupName) => {
                          const isGroupActive = activePresetGroup === groupName;
                          return (
                            <button
                              key={groupName}
                              type="button"
                              style={{
                                flex: '0 0 80px',
                                flexShrink: 0,
                                padding: '6px 0',
                                textAlign: 'center',
                                background: isGroupActive ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                border: isGroupActive ? '1px solid #00D4FF' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '12px',
                                color: isGroupActive ? '#00D4FF' : 'rgba(255, 255, 255, 0.6)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: "'Outfit', sans-serif",
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => setActivePresetGroup(groupName)}
                            >
                              {groupName}
                            </button>
                          );
                        })}
                      </div>

                      {/* Exercises Grid under active Group */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '2px' }}>
                        {PRESET_EXERCISES_BY_GROUP[activePresetGroup]?.map((preset) => {
                          const isAlreadyAdded = seriesModalExercises.some(ex => ex.name.trim().toLowerCase() === preset.trim().toLowerCase());
                          return (
                            <button
                              key={preset}
                              type="button"
                              style={{
                                padding: '6px 12px',
                                background: isAlreadyAdded 
                                  ? 'rgba(57,255,20,0.12)' 
                                  : 'rgba(255, 255, 255, 0.04)',
                                border: isAlreadyAdded 
                                  ? '1.5px solid #39FF14' 
                                  : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '20px',
                                color: isAlreadyAdded 
                                  ? '#39FF14' 
                                  : '#fff',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif",
                                transition: 'all 0.15s ease'
                              }}
                              onClick={() => {
                                if (isAlreadyAdded) {
                                  const confirmRemove = window.confirm(`Deseja remover "${preset}" da sua lista de exercícios?`);
                                  if (confirmRemove) {
                                    setSeriesModalExercises(seriesModalExercises.filter(ex => ex.name.trim().toLowerCase() !== preset.trim().toLowerCase()));
                                  }
                                } else {
                                  const newEx = {
                                    id: `ex_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                    name: preset,
                                    sets: 4,
                                    reps: '10',
                                    weight: 0,
                                    done_today: false
                                  };
                                  setSeriesModalExercises([...seriesModalExercises, newEx]);
                                }
                              }}
                            >
                              {preset}
                            </button>
                          );
                        })}
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
                          sets: 4,
                          reps: '10',
                          weight: 0,
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {seriesModalExercises.map((ex, idx) => (
                        <div key={ex.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>{ex.name}</span>
                             <button
                              type="button"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                              onClick={() => {
                                const confirmDel = window.confirm(`Deseja realmente remover o exercício "${ex.name}"?`);
                                if (confirmDel) {
                                  setSeriesModalExercises(seriesModalExercises.filter((_, i) => i !== idx));
                                }
                              }}
                            >
                              <X size={16} color="#FF2D55" />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Séries</span>
                              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    width: '24px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    userSelect: 'none'
                                  }}
                                  onClick={() => {
                                    const currentVal = parseInt(ex.sets) || 1;
                                    const newVal = Math.max(1, currentVal - 1);
                                    updateExerciseField(idx, 'sets', newVal);
                                  }}
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={ex.sets === undefined || ex.sets === null ? '' : ex.sets}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d+$/.test(val)) {
                                      updateExerciseField(idx, 'sets', val);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (isNaN(val) || val <= 0) {
                                      updateExerciseField(idx, 'sets', 1);
                                    } else {
                                      updateExerciseField(idx, 'sets', val);
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    textAlign: 'center',
                                    fontSize: '13px',
                                    fontFamily: "'Inter', sans-serif",
                                    outline: 'none',
                                    width: '100%',
                                    padding: 0
                                  }}
                                />
                                <button
                                  type="button"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    width: '24px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    userSelect: 'none'
                                  }}
                                  onClick={() => {
                                    const currentVal = parseInt(ex.sets) || 1;
                                    const newVal = currentVal + 1;
                                    updateExerciseField(idx, 'sets', newVal);
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Reps</span>
                              <input
                                type="text"
                                value={ex.reps === undefined || ex.reps === null ? '' : ex.reps}
                                onChange={(e) => {
                                  updateExerciseField(idx, 'reps', e.target.value);
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val === '0' || val === '') {
                                    updateExerciseField(idx, 'reps', '1');
                                  }
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontFamily: "'Inter', sans-serif",
                                  outline: 'none',
                                  height: '32px',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Carga (kg)</span>
                              <input
                                type="text"
                                value={ex.weight === undefined || ex.weight === null ? '' : ex.weight}
                                onChange={(e) => {
                                  updateExerciseField(idx, 'weight', e.target.value);
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  if (val === '0' || val === '') {
                                    updateExerciseField(idx, 'weight', '1');
                                  }
                                }}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  fontFamily: "'Inter', sans-serif",
                                  outline: 'none',
                                  height: '32px',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>
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
                      is_public: seriesModalIsPublic,
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
      {/* MODAL: Leitor de QR Code - Full Screen Scanner */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {showQrScanModal && (
            <motion.div
              key="qr-fullscreen"
              style={qrStyles.fullscreenOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Camera feed as background */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  ...qrStyles.cameraFeed,
                  display: cameraStream ? 'block' : 'none'
                }}
              />
              {!cameraStream && (
                <div style={qrStyles.cameraPlaceholder}>
                  <QrCode size={48} color="rgba(255,255,255,0.2)" />
                  <span style={qrStyles.cameraPlaceholderText}>Permita o acesso à câmera</span>
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Dark overlay with scanning window cutout */}
              <div style={qrStyles.overlayMask}>
                {/* Top dark area */}
                <div style={qrStyles.maskTop} />
                {/* Middle row: left dark | scanning window | right dark */}
                <div style={qrStyles.maskMiddle}>
                  <div style={qrStyles.maskSide} />
                  <div style={qrStyles.scanWindow}>
                    {/* Corner brackets */}
                    <div style={{ ...qrStyles.corner, top: 0, left: 0, borderTop: '4px solid #39FF14', borderLeft: '4px solid #39FF14' }} />
                    <div style={{ ...qrStyles.corner, top: 0, right: 0, borderTop: '4px solid #39FF14', borderRight: '4px solid #39FF14' }} />
                    <div style={{ ...qrStyles.corner, bottom: 0, left: 0, borderBottom: '4px solid #39FF14', borderLeft: '4px solid #39FF14' }} />
                    <div style={{ ...qrStyles.corner, bottom: 0, right: 0, borderBottom: '4px solid #39FF14', borderRight: '4px solid #39FF14' }} />
                    {/* Scanning laser */}
                    <motion.div
                      style={qrStyles.laser}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <div style={qrStyles.maskSide} />
                </div>
                {/* Bottom dark area */}
                <div style={qrStyles.maskBottom} />
              </div>

              {/* Top header bar */}
              <div style={qrStyles.topBar}>
                <button style={qrStyles.closeBtn} onClick={() => closeQrScanner()}>
                  <X size={24} color="#fff" />
                </button>
                <span style={qrStyles.topTitle}>Escanear QR Code</span>
                <div style={{ width: 44 }} />
              </div>

              {/* Status text under scan window */}
              <div style={qrStyles.statusContainer}>
                {isPerformingScan ? (
                  <motion.div
                    style={qrStyles.statusPill}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <div style={qrStyles.statusDot} />
                    <span style={qrStyles.statusText}>Processando check-in...</span>
                  </motion.div>
                ) : (
                  <div style={qrStyles.statusPill}>
                    <ScanLine size={16} color="#39FF14" />
                    <span style={qrStyles.statusText}>
                      {cameraStream ? 'Aponte a câmera para o QR Code da academia' : 'Aguardando acesso à câmera...'}
                    </span>
                  </div>
                )}

                {checkinErrorMessage && (
                  <motion.div
                    style={qrStyles.errorPill}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    ⚠️ {checkinErrorMessage}
                  </motion.div>
                )}
              </div>

              {/* Bottom controls panel */}
              <motion.div
                style={qrStyles.bottomPanel}
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                {/* Manual token input */}
                <div style={qrStyles.manualRow}>
                  <input
                    type="text"
                    placeholder="Ou digite o token manualmente"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    style={qrStyles.manualInput}
                    disabled={isPerformingScan}
                  />
                  <button
                    style={qrStyles.manualBtn}
                    onClick={async () => {
                      if (!manualTokenInput.trim()) return;
                      await handleQrScanned(manualTokenInput.trim());
                    }}
                    disabled={isPerformingScan}
                  >
                    OK
                  </button>
                </div>

                {/* Simulation buttons */}
                <div style={qrStyles.simGrid}>
                  {gymsList.map(gym => (
                    <button
                      key={gym.id}
                      style={qrStyles.simButton}
                      disabled={isPerformingScan}
                      onClick={() => handleQrScanned(gym.qr_code_token)}
                    >
                      <QrCode size={14} color="#39FF14" />
                      <span style={qrStyles.simButtonText}>{gym.name}</span>
                    </button>
                  ))}
                </div>

                {/* Cancel button */}
                <button
                  style={qrStyles.cancelBtn}
                  onClick={() => closeQrScanner()}
                  disabled={isPerformingScan}
                >
                  Cancelar
                </button>
              </motion.div>

      {/* Success overlay */}
              <AnimatePresence>
                {checkinSuccessMessage && (
                  <motion.div
                    style={qrStyles.successOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      style={qrStyles.successCard}
                      initial={{ scale: 0.8, y: 30 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 20 }}
                    >
                      <motion.div
                        style={qrStyles.successIconCircle}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
                      >
                        <Check size={48} color="#0A0A0F" strokeWidth={3} />
                      </motion.div>
                      <h3 style={qrStyles.successTitle}>Presença Confirmada!</h3>
                      <p style={qrStyles.successDesc}>{checkinSuccessMessage}</p>
                      <button
                        style={qrStyles.successBtn}
                        onClick={() => {
                          closeQrScanner();
                          setCheckinSuccessMessage('');
                        }}
                      >
                        Concluído
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <ExerciseVideoModal
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exerciseName={selectedExercise}
      />

      {/* MODAL: QR Code da Academia */}
      <AnimatePresence>
        {showBusinessQrModal && (
          <>
            {/* Backdrop */}
            <motion.div
              style={modalStyles.backdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBusinessQrModal(false)}
            />
            {/* Sheet / Dialog */}
            <motion.div
              style={{
                ...modalStyles.workoutModal,
                zIndex: 100003,
                maxHeight: '75vh',
              }}
              initial={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
              exit={{ scale: 0.95, opacity: 0, x: '-50%', y: '-50%' }}
              transition={{ type: 'spring', duration: 0.3 }}
            >
              <div style={modalStyles.checkInHeader}>
                <h3 style={modalStyles.checkInTitle}>QR Code de Check-In</h3>
                <button style={modalStyles.closeBtn} onClick={() => setShowBusinessQrModal(false)}>
                  <X size={20} color="#fff" />
                </button>
              </div>

              <div style={{ ...modalStyles.modalScrollBody, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px 16px' }} className="hide-scrollbar">
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" }}>
                  Apresente este QR Code aos frequentadores ou imprima-o para que eles possam realizar check-in no aplicativo.
                </span>

                {/* QR Code Container */}
                <div style={{ background: '#fff', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(57, 255, 20, 0.15)' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(p.username || p.id)}`}
                    alt="Check-in QR Code"
                    style={{ width: '220px', height: '220px', display: 'block' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '16px', color: '#fff', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{p.display_name}</span>
                  <span style={{ fontSize: '12px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" }}>Token: {p.username || p.id}</span>
                </div>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    background: '#39FF14',
                    border: 'none',
                    color: '#0A0A0F',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    marginTop: '12px',
                    boxShadow: '0 4px 15px rgba(57, 255, 20, 0.3)',
                    outline: 'none'
                  }}
                  onClick={() => {
                    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(p.username || p.id)}`, '_blank');
                  }}
                >
                  Imprimir / Abrir QR Code
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ScreenWrapper>
  );
}

const styles = {
  sobreCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  sobreTitle: { fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0, fontFamily: "'Outfit', sans-serif" },
  sobreItem: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sobreLabel: { fontSize: '12px', color: '#6C6C88', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  sobreValue: { fontSize: '14px', color: '#fff', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" },
  hoursList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    maxWidth: '320px',
    background: 'rgba(255,255,255,0.02)',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    marginTop: '6px',
  },
  hoursRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  hoursDay: {
    fontSize: '13px',
    color: '#B0B0C8',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  hoursClosed: {
    fontSize: '11px',
    color: '#FF2D55',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    background: 'rgba(255,45,85,0.1)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  hoursTime: {
    fontSize: '13px',
    color: '#fff',
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
  },
  editedLabel: {
    fontSize: '11px',
    color: '#6C6C88',
    fontStyle: 'italic',
    marginLeft: '6px',
  },
  whatsappBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'transparent',
    color: '#25D366',
    border: '2px solid #25D366',
    padding: '8px 16px',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '14px',
    textDecoration: 'none',
    marginTop: '12px',
    boxShadow: 'none',
    width: 'fit-content',
    alignSelf: 'center',
  },
  feedbacksHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' },
  feedbacksTitle: { fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0, fontFamily: "'Outfit', sans-serif" },
  feedbacksCount: { fontSize: '12px', color: '#6C6C88' },
  feedbacksList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' },
  emptyFeedbacks: {
    padding: '30px 16px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: '16px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
  },
  feedbackCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '16px',
  },
  feedbackUserRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  feedbackUserAvatar: { width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' },
  feedbackUserInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  feedbackUserName: { fontSize: '13px', fontWeight: 600, color: '#fff' },
  feedbackDate: { fontSize: '11px', color: '#6C6C88' },
  feedbackRating: { display: 'flex' },
  feedbackComment: { fontSize: '13px', color: '#E2E8F0', margin: 0, lineHeight: '1.4', fontFamily: "'Inter', sans-serif" },
  avatarPlaceholderMini: {
    width: '100%', height: '100%', borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '14px', fontWeight: 800,
  },
  container: {
    padding: '0 16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    paddingBottom: '100px',
    position: 'relative',
    zIndex: 1,
    minHeight: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(0,122,255,0.2) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '-5%', left: '-10%', zIndex: 0,
    willChange: 'transform',
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(88,86,214,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '30%', right: '-10%', zIndex: 0,
    willChange: 'transform',
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
    marginRight: '6px',
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    fontWeight: '800',
    color: '#39FF14',
    background: 'rgba(57,255,20,0.1)',
    border: '1px solid rgba(57,255,20,0.2)',
    padding: '4px 12px',
    borderRadius: '10px',
    marginTop: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Outfit', sans-serif",
  },
  usernameLeft: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: '0 0 4px',
    textAlign: 'center',
    width: '100%',
    letterSpacing: '-0.5px'
  },
  displayNameLeft: {
    fontSize: '14px',
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
    minWidth: '60px',
  },
  statValueLeft: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif"
  },
  statLabelLeft: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '2px',
  },
  avatar: { width: '88px', height: '88px', borderRadius: '28px', border: '1.5px solid rgba(255,255,255,0.2)', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '32px', fontFamily: "'Outfit', sans-serif" },
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
  quickAccess: { display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '24px' },
  quickBtn: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontFamily: "'Inter', sans-serif", backdropFilter: 'blur(30px)', boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)', minWidth: 0 },
  quickIcon: { width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' },
  quickInfo: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', minWidth: 0 },
  quickTitle: { fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" },
  quickDesc: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'left' },
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
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '450px',
    background: '#0F0F15',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '28px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    boxSizing: 'border-box',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
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
  lettersTabContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '24px',
    padding: '12px 16px',
  },
  lettersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  letterBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '16px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s ease',
  },
  letterBtnActive: {
    background: '#39FF14',
    border: '1px solid #39FF14',
    color: '#0A0A0F',
    boxShadow: '0 0 12px rgba(57,255,20,0.4)',
  },
  letterBtnAdd: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '20px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    transition: 'all 0.2s ease',
  },
  activeSeriesActions: {
    display: 'flex',
    gap: '6px',
  },
  exerciseActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  videoDemoBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(0, 212, 255, 0.1)',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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


};

const qrStyles = {
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100000,
    background: '#000',
    overflow: 'hidden',
  },
  cameraFeed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 1,
  },
  cameraPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    background: '#0A0A0F',
    zIndex: 1,
  },
  cameraPlaceholderText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
  },
  overlayMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'none',
  },
  maskTop: {
    flex: 1,
    background: 'rgba(0,0,0,0.65)',
    minHeight: '20%',
  },
  maskMiddle: {
    display: 'flex',
    height: '260px',
  },
  maskSide: {
    flex: 1,
    background: 'rgba(0,0,0,0.65)',
    minWidth: '40px',
  },
  scanWindow: {
    width: '260px',
    height: '260px',
    position: 'relative',
    flexShrink: 0,
    borderRadius: '24px',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: '36px',
    height: '36px',
    zIndex: 4,
    borderRadius: '4px',
  },
  laser: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '3px',
    background: 'linear-gradient(90deg, transparent, #39FF14, #39FF14, transparent)',
    boxShadow: '0 0 12px #39FF14, 0 0 24px rgba(57,255,20,0.4)',
    zIndex: 3,
  },
  maskBottom: {
    flex: 1.5,
    background: 'rgba(0,0,0,0.65)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px',
    paddingTop: 'max(env(safe-area-inset-top, 16px), 16px)',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
  },
  closeBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  topTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  statusContainer: {
    position: 'absolute',
    bottom: '220px',
    left: 0,
    right: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '0 24px',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '30px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#39FF14',
    boxShadow: '0 0 8px #39FF14',
  },
  statusText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.9)',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
  },
  errorPill: {
    padding: '10px 20px',
    background: 'rgba(255,45,85,0.15)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,45,85,0.3)',
    color: '#FF6B8A',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    textAlign: 'center',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: '20px 16px',
    paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 20px)',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  manualRow: {
    display: 'flex',
    gap: '8px',
  },
  manualInput: {
    flex: 1,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  manualBtn: {
    padding: '12px 20px',
    background: '#39FF14',
    color: '#0A0A0F',
    border: 'none',
    borderRadius: '14px',
    fontWeight: 800,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  },
  simGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  simButton: {
    flex: '1 1 calc(50% - 4px)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(57,255,20,0.15)',
    borderRadius: '12px',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  simButtonText: {
    fontSize: '12px',
    color: '#fff',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cancelBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  successCard: {
    width: '100%',
    maxWidth: '360px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(57,255,20,0.2)',
    borderRadius: '32px',
    padding: '40px 24px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 0 40px rgba(57,255,20,0.1)',
  },
  successIconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #39FF14, #00E676)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 0 30px rgba(57,255,20,0.5)',
  },
  successTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: '0 0 10px 0',
  },
  successDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: '1.6',
    margin: '0 0 28px 0',
    fontFamily: "'Inter', sans-serif",
  },
  successBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #39FF14, #00E676)',
    border: 'none',
    borderRadius: '16px',
    color: '#0A0A0F',
    fontWeight: 800,
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
    boxShadow: '0 4px 15px rgba(57,255,20,0.3)',
  },
};
