import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Grid3x3, Award, MessageCircle, Video, Image as ImageIcon, Trophy, Flame, Target, Dumbbell, Zap, Star, Plus, Check, X, Play, Copy, Info, MapPin, MessageSquare, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../config/supabase';
import { cacheGet, CACHE_KEYS } from '../utils/localCache';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import { useSocialStore } from '../stores/socialStore';
import { useChatStore } from '../stores/chatStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';
import ProfileChallengeCard from '../components/profile/ProfileChallengeCard';
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

const TRAINER_SPECIALTIES_OPTIONS = [
  { key: 'musculacao', label: 'Musculação' },
  { key: 'funcional', label: 'Treino Funcional' },
  { key: 'crossfit', label: 'Crossfit' },
  { key: 'pilates', label: 'Pilates' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'corrida', label: 'Corrida / Atletismo' },
  { key: 'artes_marciais', label: 'Artes Marciais' },
  { key: 'reabilitacao', label: 'Reabilitação / Fisioterapia' },
  { key: 'emagrecimento', label: 'Emagrecimento' },
  { key: 'hipertrofia', label: 'Hipertrofia' },
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
        {typeof badge.icon === 'string' ? (
          <span style={{ fontSize: '22px' }}>{badge.icon}</span>
        ) : typeof badge.icon === 'function' ? (
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
          Nenhuma comprovação visual para este desafio.
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
        style={{ ...tabStyles.carouselImg, userSelect: 'none', WebkitUserDrag: 'none', pointerEvents: 'none' }}
        draggable="false"
        onDragStart={(e) => e.preventDefault()}
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

export default function PublicProfileScreen() {
  const { user } = useAuthStore();
  const { navigate, goBack, screenParams, currentScreen } = useNavigationStore();
  const { fetchUserPosts } = useFeedStore();
  const { fetchPublicProfile, followUser, unfollowUser, checkIfFollowing } = useSocialStore();
  const { getOrCreateConversation } = useChatStore();
  
  // Pull-to-refresh states
  const containerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const [activeTab, setActiveTab] = useState('videos');
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [gymBagVideos, setGymBagVideos] = useState([]);
  const [showMedalsModal, setShowMedalsModal] = useState(false);
  const [profileChallenges, setProfileChallenges] = useState([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [activeWorkoutSeries, setActiveWorkoutSeries] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const userId = screenParams?.userId;

  // Pre-populate rating/comment if user has already reviewed
  useEffect(() => {
    if (user && feedbacks.length > 0) {
      const myFeedback = feedbacks.find(fb => fb.user_id === user.uid);
      if (myFeedback) {
        setUserRating(myFeedback.rating);
        setUserComment(myFeedback.comment || '');
      }
    }
  }, [user, feedbacks]);

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
      console.warn('[PublicProfile] Error loading business feedbacks, using mock:', err.message);
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

  const handleSubmitFeedback = async () => {
    if (!user) {
      alert('Você precisa estar logado para enviar um feedback.');
      return;
    }
    if (user.uid === userId) {
      alert('Você não pode avaliar a si mesmo!');
      return;
    }
    setIsSubmittingFeedback(true);
    
    const existingFeedback = feedbacks.find(fb => fb.user_id === user.uid);
    const viewerProfile = useAuthStore.getState().profile || {};

    try {
      if (existingFeedback) {
        // Mode: UPDATE
        const { data, error } = await supabase
          .from('business_feedbacks')
          .update({
            rating: userRating,
            comment: userComment.trim(),
            is_edited: true,
            created_at: new Date().toISOString()
          })
          .eq('id', existingFeedback.id)
          .select()
          .single();

        if (error) throw error;

        alert('Feedback atualizado com sucesso!');
        setFeedbacks(prev => prev.map(fb => fb.id === existingFeedback.id ? data : fb));
      } else {
        // Mode: INSERT
        const newFeedback = {
          business_id: userId,
          user_id: user.uid,
          user_name: viewerProfile.display_name || user.email?.split('@')[0] || 'Usuário',
          user_avatar: viewerProfile.avatar_url || '',
          rating: userRating,
          comment: userComment.trim(),
        };

        const { data, error } = await supabase
          .from('business_feedbacks')
          .insert(newFeedback)
          .select()
          .single();

        if (error) throw error;

        alert('Feedback enviado com sucesso! Obrigado por avaliar.');
        setFeedbacks(prev => [data, ...prev]);
        setUserComment('');
        setUserRating(5);
      }
    } catch (err) {
      console.error('[PublicProfile] Error submitting feedback:', err.message);
      if (existingFeedback) {
        const mockUpdatedFeedback = {
          ...existingFeedback,
          rating: userRating,
          comment: userComment.trim(),
          is_edited: true,
          created_at: new Date().toISOString(),
        };
        setFeedbacks(prev => prev.map(fb => fb.id === existingFeedback.id ? mockUpdatedFeedback : fb));
        alert('Feedback atualizado localmente (modo offline)!');
      } else {
        const mockFeedback = {
          id: `fb_${Date.now()}`,
          business_id: userId,
          user_id: user.uid,
          user_name: viewerProfile.display_name || 'Usuário',
          user_avatar: viewerProfile.avatar_url || '',
          rating: userRating,
          comment: userComment.trim(),
          created_at: new Date().toISOString(),
        };
        setFeedbacks(prev => [mockFeedback, ...prev]);
        setUserComment('');
        setUserRating(5);
        alert('Feedback salvo localmente (modo offline)! Obrigado.');
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
  };



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

  const handleCopySeries = async () => {
    if (!user) {
      alert('Faça login para copiar esta série!');
      return;
    }
    
    if (!activeWorkoutSeries) return;

    try {
      // Load user's current series from store or fetch them
      const { useWorkoutStore } = await import('../stores/workoutStore');
      const workoutStore = useWorkoutStore.getState();
      
      // We should make sure we have the viewer's series list loaded
      if (user.uid) {
        await workoutStore.fetchSeries(user.uid);
      }
      
      const userSeriesList = useWorkoutStore.getState().seriesList;
      
      let replaceSeriesId = null;
      let isNewSeries = true;

      if (userSeriesList && userSeriesList.length > 0) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const optionsText = userSeriesList.map((s, idx) => {
          const letter = letters[idx] || `S${idx + 1}`;
          return `"${letter}" - ${s.name}`;
        }).join('\n');

        const choice = prompt(
          `Deseja criar uma nova série ou substituir uma série existente?\n\n` +
          `Digite "N" para Criar uma Nova Série\n` +
          `Ou digite a letra correspondente para SUBSTITUIR:\n\n` +
          optionsText,
          "N"
        );

        if (choice === null) return; // User cancelled

        const normalizedChoice = choice.trim().toUpperCase();
        if (normalizedChoice !== 'N') {
          // Find which series matches the letter
          const matchIdx = letters.findIndex(l => l === normalizedChoice);
          if (matchIdx !== -1 && userSeriesList[matchIdx]) {
            replaceSeriesId = userSeriesList[matchIdx].id;
            isNewSeries = false;
          } else {
            // Try to match by index if they typed number
            const num = parseInt(normalizedChoice);
            if (!isNaN(num) && userSeriesList[num - 1]) {
              replaceSeriesId = userSeriesList[num - 1].id;
              isNewSeries = false;
            } else {
              alert('Opção inválida. Nenhuma alteração foi feita.');
              return;
            }
          }
        }
      }

      const confirmCopy = window.confirm(
        isNewSeries 
          ? `Deseja copiar a série "${activeWorkoutSeries.name}" como uma nova série? (Os pesos serão zerados)`
          : `Deseja substituir sua série pela série "${activeWorkoutSeries.name}"? (Os pesos serão zerados)`
      );
      if (!confirmCopy) return;

      // 1. Prepare exercises: remove weight (set weight: 0) and reset done_today, create new unique ids
      const copiedExercises = (activeWorkoutSeries.exercises || []).map(ex => ({
        ...ex,
        id: `ex_copy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        weight: 0,
        done_today: false
      }));

      if (isNewSeries) {
        // Call the workoutStore's createSeries method to save it in viewer's account
        await workoutStore.createSeries(
          user.uid,
          activeWorkoutSeries.name,
          activeWorkoutSeries.weekly_frequency,
          activeWorkoutSeries.progress_total,
          copiedExercises,
          true // Default to public
        );
      } else {
        // Replace/update the existing series
        await workoutStore.updateSeries(
          user.uid,
          replaceSeriesId,
          {
            name: activeWorkoutSeries.name,
            weekly_frequency: activeWorkoutSeries.weekly_frequency,
            progress_total: activeWorkoutSeries.progress_total,
            exercises: copiedExercises,
            progress_completed: 0,
            is_active: true
          }
        );
        // Make sure it's set as active
        await workoutStore.setActiveSeries(user.uid, replaceSeriesId);
      }

      // 3. Increment the copies_count in DB for the original series
      if (activeWorkoutSeries.id) {
        const { error } = await supabase.rpc('increment_series_copy_count', {
          series_id: activeWorkoutSeries.id
        });
        
        if (error) {
          console.warn('Failed to increment copies count via RPC, falling back to manual update:', error);
          await supabase
            .from('workout_series')
            .update({ copies_count: (activeWorkoutSeries.copies_count || 0) + 1 })
            .eq('id', activeWorkoutSeries.id);
        }
      }

      // Update UI state to reflect the copy count increment
      setActiveWorkoutSeries(prev => ({
        ...prev,
        copies_count: (prev.copies_count || 0) + 1
      }));

      alert('Série copiada com sucesso! Vá para o seu perfil para ver e treinar.');
    } catch (err) {
      console.error('Error copying series:', err);
      alert('Erro ao copiar série: ' + err.message);
    }
  };

  const loadProfileChallenges = useCallback(async () => {
    if (!userId) return;
    await Promise.resolve();
    setIsLoadingChallenges(true);
    try {
      // Fetch participations from DB
      const { data: participations, error: partError } = await supabase
        .from('challenge_participants')
        .select('challenge_id, progress')
        .eq('user_id', userId);

      if (partError) throw partError;
      console.log('[PublicProfile] Participations found:', participations?.length || 0);

      if (participations && participations.length > 0) {
        const challengeIds = participations.map((p) => p.challenge_id);
        const progressMap = {};
        participations.forEach(p => { progressMap[p.challenge_id] = p.progress; });

        // Fetch challenges
        const { data: challengesData, error: chalError } = await supabase
          .from('challenges')
          .select('*')
          .in('id', challengeIds);

        if (chalError) throw chalError;

        // Fetch checkins
        let allCheckins = [];
        try {
          const { data: dbCheckins } = await supabase
            .from('challenge_checkins')
            .select('challenge_id, photo_url, created_at, activity_title')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          allCheckins = dbCheckins || [];
        } catch { /* ignore */ }

        // Fallback: desafio posts from videos table
        let desafioPosts = [];
        try {
          const { data: videoPosts } = await supabase
            .from('videos')
            .select('video_url, caption, created_at')
            .eq('user_id', userId)
            .eq('category', 'desafio')
            .order('created_at', { ascending: false });
          desafioPosts = videoPosts || [];
        } catch { /* ignore */ }

        const enriched = (challengesData || []).map((challenge) => {
          let checkins = allCheckins
            .filter(c => c.challenge_id === challenge.id)
            .map(c => ({ photo_url: c.photo_url, created_at: c.created_at, activity_title: c.activity_title }));

          if (checkins.length === 0 && desafioPosts.length > 0) {
            const titleLower = (challenge.title || '').toLowerCase();
            const matched = desafioPosts.filter(p => (p.caption || '').toLowerCase().includes(titleLower));
            if (matched.length > 0) {
              checkins = matched.map(p => ({
                photo_url: p.video_url,
                created_at: p.created_at,
                activity_title: 'Check-in',
              }));
            }
          }

          const effectiveProgress = Math.max(
            progressMap[challenge.id] || 0,
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
      console.error('Error loading public profile challenges:', err);
    } finally {
      setIsLoadingChallenges(false);
    }
  }, [userId]);

  const loadData = useCallback(async (showLoadingState = true) => {
    if (!userId) {
      navigate('explore');
      return;
    }

    if (user?.uid === userId) {
      navigate('profile'); // redirect to own profile
      return;
    }

    console.log('[PublicProfile] Loading data for userId:', userId);
    // 1. Optimistic UI: try loading from cache first
    if (showLoadingState) {
      const cachedProf = cacheGet(CACHE_KEYS.publicProfile(userId));
      console.log('[PublicProfile] Cached profile:', cachedProf);
      if (cachedProf) {
        setProfile(cachedProf);
        setIsLoading(false);
        if (cachedProf.profile_type === 'business' || cachedProf.profile_type === 'trainer') {
          fetchBusinessFeedbacks(userId);
        }
      } else {
        setIsLoading(true);
      }
    }

    // 2. Fetch fresh profile data in background/foreground (ignoring cache)
    let profData = null;
    try {
      profData = await fetchPublicProfile(userId, true);
      console.log('[PublicProfile] Fresh profile data fetched:', profData);
      
      if (profData) {
        // Secondary dynamic counts fetch to bypass RLS column update lags
        let followersCount = profData.followers || 0;
        let followingCount = profData.following || 0;
        
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

        setProfile({
          ...profData,
          followers: followersCount,
          following: followingCount
        });
        
        if (profData.profile_type === 'business' || profData.profile_type === 'trainer') {
          fetchBusinessFeedbacks(userId);
        }
      }
    } catch (profErr) {
      console.error('[PublicProfile] Error fetching profile:', profErr);
    }

    // 3. Fetch other data in parallel/independently
    try {
      const postsData = await fetchUserPosts(userId);
      if (postsData) {
        setUserPosts(postsData);
      }
    } catch (postsErr) {
      console.error('[PublicProfile] Error fetching posts:', postsErr);
    }

    try {
      const followingStatus = await checkIfFollowing(user?.uid, userId);
      setIsFollowing(followingStatus);
    } catch (followErr) {
      console.error('[PublicProfile] Error checking following status:', followErr);
    }

    try {
      // Fetch public active workout series
      let activeWS = null;
      const { data: wsData } = await supabase
        .from('workout_series')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_public', true)
        .maybeSingle();

      if (wsData) {
        activeWS = {
          id: wsData.id,
          name: wsData.name,
          weekly_frequency: wsData.weekly_frequency,
          progress_completed: wsData.progress_completed || 0,
          progress_total: wsData.progress_total || 30,
          is_public: wsData.is_public !== false,
          copies_count: wsData.copies_count || 0,
          exercises: Array.isArray(wsData.exercises) ? wsData.exercises : []
        };
      } else {
        // Check local storage fallback for simulated mock data if public profile has local cached series
        const cached = localStorage.getItem(`fitverse-workout-series-fallback_${userId}`);
        if (cached) {
          const list = JSON.parse(cached);
          activeWS = list.find(s => s.is_active) || list[0];
        } else {
          // Static mock for demo public profile
          activeWS = {
            name: 'Hipertrofia - Push/Pull/Legs',
            weekly_frequency: '3x por semana',
            progress_completed: 12,
            progress_total: 30,
            exercises: [
              { id: 'ex_1', name: 'Supino Reto (Barra)', sets: 4, reps: '8-10', weight: 80, done_today: true },
              { id: 'ex_2', name: 'Desenvolvimento Militar', sets: 4, reps: '8-10', weight: 45, done_today: false },
              { id: 'ex_3', name: 'Tríceps Testa', sets: 3, reps: '10-12', weight: 30, done_today: false },
              { id: 'ex_4', name: 'Elevação Lateral', sets: 4, reps: '12-15', weight: 14, done_today: false },
            ]
          };
        }
      }
      setActiveWorkoutSeries(activeWS);
    } catch (wsErr) {
      console.warn('[PublicProfile] Error loading active workout series:', wsErr);
    }

    // Fetch public gym bag saves
    try {
      const { data } = await supabase
        .from('video_interactions')
        .select('video_id')
        .eq('user_id', userId)
        .eq('interaction_type', 'gym_bag');
      if (data) {
        setGymBagVideos(data);
      }
    } catch (err) {
      console.warn('[PublicProfile] Error fetching gym bag interactions:', err);
    }

    setIsLoading(false);
  }, [userId, user?.uid, fetchPublicProfile, fetchUserPosts, checkIfFollowing, navigate, fetchBusinessFeedbacks]);

  const handleTouchStart = useCallback((e) => {
    const scrollEl = containerRef.current?.parentElement;
    if (scrollEl && scrollEl.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY);
    } else {
      setTouchStart(null);
    }
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStart === null || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStart - currentY;
    
    if (diff < 0) {
      const pullDist = -diff;
      setDragOffset(Math.min(pullDist * 0.5, 80));
      setPullProgress(Math.min(pullDist / 100, 1));
      if (e.cancelable) {
        e.preventDefault();
      }
    } else {
      setDragOffset(0);
      setPullProgress(0);
    }
  }, [touchStart, isRefreshing]);

  const handleTouchEnd = useCallback(async (e) => {
    if (touchStart === null || isRefreshing) return;
    const currentY = e.changedTouches[0].clientY;
    const diff = touchStart - currentY;
    setTouchStart(null);

    if (diff < 0 && pullProgress >= 1) {
      setIsRefreshing(true);
      setDragOffset(60);
      try {
        await Promise.all([
          loadData(false),
          loadProfileChallenges()
        ]);
      } catch (err) {
        console.error('[PublicProfile] Pull-to-refresh error:', err);
      } finally {
        setIsRefreshing(false);
        setPullProgress(0);
        setDragOffset(0);
      }
    } else {
      setDragOffset(0);
      setPullProgress(0);
    }
  }, [touchStart, pullProgress, isRefreshing, loadData, loadProfileChallenges]);

  useEffect(() => {
    if (currentScreen !== 'public_profile') return;
    loadData(true);
  }, [currentScreen, loadData]);

  useEffect(() => {
    if (userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProfileChallenges();
    }
  }, [userId, loadProfileChallenges]);

  useEffect(() => {
    if (activeTab === 'challenges' && userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadProfileChallenges();
    }
  }, [activeTab, userId, loadProfileChallenges]);

  const filteredUserPosts = useMemo(() => {
    return userPosts.filter((post) => post.category !== 'desafio');
  }, [userPosts]);

  // Compute badges for this user
  const badges = useMemo(() => {
    if (!profile) return [];
    return BADGE_DEFINITIONS.map((badge) => ({
      ...badge,
      unlocked: badge.check(profile, userPosts, gymBagVideos),
    }));
  }, [profile, userPosts, gymBagVideos]);

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
        gradient: `linear-gradient(135deg, ${c.color || '#FFD700'}, ${c.color || '#FFD700'}88)`,
        unlocked: true,
      }));
  }, [profileChallenges]);

  const allBadgesAndMedals = useMemo(() => {
    return [...badges, ...challengeMedals];
  }, [badges, challengeMedals]);

  const totalMedalsCount = unlockedCount + completedChallengesCount;

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

      {/* ── Pull-to-refresh indicator ────────────────────── */}
      {(pullProgress > 0 || isRefreshing) && (
        <div style={{
          ...styles.refreshIndicator,
          transform: `translate(-50%, ${isRefreshing ? 60 : Math.min(pullProgress * 60, 60)}px) scale(${isRefreshing ? 1 : pullProgress})`,
          opacity: isRefreshing ? 1 : pullProgress,
        }}>
          <Loader2 
            size={20} 
            color="#00D4FF" 
            style={{ 
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transform: isRefreshing ? 'none' : `rotate(${pullProgress * 360}deg)`
            }} 
          />
        </div>
      )}

      <motion.div
        ref={containerRef}
        style={{ ...styles.container, background: getThemeBackground(profile?.profile_theme_color), y: dragOffset }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.headerBtnLeft} onClick={() => goBack()}>
            <ChevronLeft size={28} color="#fff" />
          </button>
          <h2 style={{ ...styles.title, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          </h2>
        </div>

        {/* Profile card */}
        <motion.div 
          style={{
            ...styles.profileCard,
            paddingTop: profile?.show_cover !== false ? '140px' : '24px'
          }} 
          className="profile-card" 
          initial={{ y: 20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }}
        >
          {/* Cover Photo */}
          {profile?.show_cover !== false && (
            <div style={styles.coverPhotoContainer}>
              {profile?.cover_photo_url ? (
                <img src={profile?.cover_photo_url} alt="Capa" style={styles.coverPhotoImg} />
              ) : (
                <div style={styles.coverPhotoFallback} />
              )}
            </div>
          )}

          <div style={{ ...styles.profileCardHeader, position: 'relative', zIndex: 2, alignItems: 'flex-start' }} className="profile-card-header">
            <div style={{ ...styles.profileInfoBlock, alignItems: 'center' }}>
              <h3 style={{ 
                ...styles.usernameLeft, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                textAlign: 'center'
              }} className="profile-username">
                @{profile.username}
                {(profile.username?.toLowerCase() === 'flowrise' || profile.username?.toLowerCase() === 'flowride' || profile?.profile_type !== 'personal') && (
                  <img src={verifiedBadgeImg} alt="verificado" style={{ width: '22px', height: '22px', marginLeft: '6px', objectFit: 'contain', flexShrink: 0 }} />
                )}
              </h3>
              <span style={{ 
                ...styles.displayNameLeft, 
                textAlign: 'center',
                paddingLeft: '0'
              }} className="profile-display-name">{profile.display_name}</span>

              <div style={{ 
                ...styles.statsRowLeft, 
                justifyContent: 'center',
                gap: '16px',
                paddingLeft: '0'
              }} className="profile-stats-row">
                <div style={{ ...styles.statItemLeft, alignItems: 'center' }} className="profile-stat-item">
                  <span style={styles.statValueLeft} className="profile-stat-value">{filteredUserPosts.length}</span>
                  <span style={styles.statLabelLeft} className="profile-stat-label">posts</span>
                </div>
                <div style={{ ...styles.statItemLeft, alignItems: 'center' }} className="profile-stat-item">
                  <span style={styles.statValueLeft} className="profile-stat-value">{profile.followers || 0}</span>
                  <span style={styles.statLabelLeft} className="profile-stat-label">seguidores</span>
                </div>
                <div style={{ ...styles.statItemLeft, alignItems: 'center' }} className="profile-stat-item">
                  <span style={styles.statValueLeft} className="profile-stat-value">{profile.following || 0}</span>
                  <span style={styles.statLabelLeft} className="profile-stat-label">seguindo</span>
                </div>
              </div>
            </div>

            <div 
              style={{ 
                ...styles.avatarContainerRight, 
                marginTop: profile?.show_cover !== false ? '-55px' : '0px',
                zIndex: 3
              }} 
              className="profile-avatar-container"
            >
              {/* Streak Badge */}
              {profile.streak >= 3 && (
                <div style={styles.streakBadge}>
                  <span style={styles.streakEmoji}>🔥</span>
                  <span style={styles.streakNumber}>{profile.streak}</span>
                </div>
              )}
              
              {/* Relative wrapper for Avatar and Follow Button */}
              <div style={{ position: 'relative', width: '88px', height: '88px' }}>
                <div style={styles.avatar}>
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={styles.avatarImg} /> : (
                    <div style={styles.avatarPlaceholder}>{profile.display_name?.charAt(0) || '?'}</div>
                  )}
                </div>
                {/* Verified Badge for trainer/business */}
                {profile?.profile_type !== 'personal' && (
                  <div style={styles.verifiedAvatarBadge}>
                    <Check size={10} color="#fff" strokeWidth={4} />
                  </div>
                )}
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
              
              {/* Role Title below avatar */}
              {profile.profile_type === 'trainer' ? (
                <span style={styles.roleLabel}>Personal Trainer</span>
              ) : profile.profile_type === 'business' ? (
                <span style={styles.roleLabel}>Empresa</span>
              ) : (
                /* Mastery Title for personal and premium users */
                profile.show_mastery !== false && (
                  <span style={styles.masteryTitle} className="profile-mastery-title">
                    {MASTERY_MAP[profile.mastery] || profile.mastery || '🟢 Iniciante'}
                  </span>
                )
              )}
            </div>
          </div>

          <div style={{ ...styles.bioContainer, position: 'relative', zIndex: 2 }}>
            {profile.bio && <p style={styles.bioCenter}>{profile.bio}</p>}

            {/* Social Links Row */}
            {profile.social_links && (() => {
              try {
                const socialObj = typeof profile.social_links === 'string' ? JSON.parse(profile.social_links) : profile.social_links;
                if (socialObj) {
                  const links = [
                    { key: 'facebook', icon: FacebookIcon },
                    { key: 'instagram', icon: InstagramIcon },
                    { key: 'tiktok', icon: TikTokIcon },
                    { key: 'youtube', icon: YouTubeIcon }
                  ].filter(item => socialObj[item.key] && socialObj[item.key].trim().startsWith('http'));

                  if (links.length > 0) {
                    return (
                      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '12px' }}>
                        {links.map((link) => (
                          <motion.a
                            key={link.key}
                            whileTap={{ scale: 0.9 }}
                            href={socialObj[link.key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: '36px', height: '36px', borderRadius: '50%',
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              cursor: 'pointer',
                            }}
                          >
                            <link.icon size={18} color="#fff" />
                          </motion.a>
                        ))}
                      </div>
                    );
                  }
                }
              } catch (e) {}
              return null;
            })()}
          </div>

          {/* Stats inside profile card */}
          {(profile?.profile_type === 'business' || profile?.profile_type === 'trainer') ? (
            <div style={{ ...styles.statsGrid, width: '100%', marginTop: '20px', marginBottom: 0, position: 'relative', zIndex: 2 }}>
              <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
              <StatBox label="Avaliações" value={feedbacks.length} icon={Star} color="#FFD700" onClick={() => setActiveTab('sobre')} />
              <StatBox label="Chat" value="Conversar" icon={MessageCircle} color="#00D4FF" onClick={handleMessage} />
            </div>
          ) : (
            <div style={{ ...styles.statsGrid, width: '100%', marginTop: '20px', marginBottom: 0, position: 'relative', zIndex: 2 }}>
              <StatBox label="Shapes" value={totalShapes} icon={(props) => <ShapeIcon filled={true} size={props.size} color={props.color} />} color="#39FF14" />
              <StatBox label="Medalhas" value={totalMedalsCount} icon={Award} color="#FFD700" onClick={() => setShowMedalsModal(true)} />
              <StatBox label="Chat" value="Conversar" icon={MessageCircle} color="#00D4FF" onClick={handleMessage} />
            </div>
          )}
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
            style={{ ...styles.contentTab, ...(activeTab === 'challenges' ? styles.contentTabActive : {}) }}
            onClick={() => setActiveTab('challenges')}
          >
            <Trophy size={18} /> Desafios
            {profileChallenges.length > 0 && <span style={styles.badgeCountChip}>{profileChallenges.length}</span>}
          </button>
          {(profile?.profile_type === 'business' || profile?.profile_type === 'trainer') ? (
            <button
              style={{ ...styles.contentTab, ...(activeTab === 'sobre' ? styles.contentTabActive : {}) }}
              onClick={() => setActiveTab('sobre')}
            >
              <Info size={18} /> Sobre
            </button>
          ) : (
            <button
              style={{ ...styles.contentTab, ...(activeTab === 'serie' ? styles.contentTabActive : {}) }}
              onClick={() => setActiveTab('serie')}
            >
              <Dumbbell size={18} /> Série
            </button>
          )}
        </div>

        {/* Content - Videos */}
        {activeTab === 'videos' && (
          <div style={styles.videoGrid}>
            {filteredUserPosts.length === 0 ? (
              <div style={styles.emptyGrid}>
                <Video size={32} color="#6C6C88" />
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

        {/* Content - Challenges */}
        {activeTab === 'challenges' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {isLoadingChallenges ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '40px 0' }}>
                Carregando desafios...
              </div>
            ) : profileChallenges.length === 0 ? (
              <div style={styles.emptyGrid}>
                <Trophy size={32} color="rgba(255,255,255,0.4)" />
                <span style={styles.emptyGridText}>Nenhum desafio ativo</span>
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

        {/* Content - Sobre (Business/Trainer details and feedbacks) */}
        {activeTab === 'sobre' && (profile?.profile_type === 'business' || profile?.profile_type === 'trainer') && (
          <div style={workoutStyles.container}>
            {profile?.profile_type === 'business' ? (
              <div style={{
                ...styles.sobreCard,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '18px',
                padding: '24px 16px'
              }}>
                <h4 style={styles.sobreTitle}>Sobre a {profile.display_name || 'Empresa'}</h4>
                
                {/* Gallery Block */}
                {(() => {
                  const photos = Array.isArray(profile.business_photos) && profile.business_photos.length > 0 
                    ? profile.business_photos 
                    : [
                        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400',
                        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=400',
                        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=400'
                      ];

                  // Safety check for selectedPhotoIndex out of bounds
                  const safeIndex = selectedPhotoIndex < photos.length ? selectedPhotoIndex : 0;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '4px' }}>
                      {/* Main display photo (16:9) */}
                      <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', aspectRatio: '16/9', background: '#12121A' }}>
                        <img 
                          src={photos[safeIndex]} 
                          alt="Principal" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                      {/* Thumbnails row */}
                      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: '100%', paddingBottom: '4px' }} className="hide-scrollbar">
                        {photos.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedPhotoIndex(i)}
                            style={{
                              padding: 0,
                              background: 'none',
                              border: safeIndex === i ? '2px solid #39FF14' : '2px solid transparent',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              width: '60px',
                              height: '45px',
                              flexShrink: 0,
                              cursor: 'pointer',
                              transition: 'border-color 0.2s ease'
                            }}
                          >
                            <img src={url} alt={`Galeria ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={styles.sobreLabel}>📍 Endereço</span>
                  {profile.address ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...styles.sobreValue, color: '#00D4FF', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {profile.address}
                    </a>
                  ) : (
                    <span style={styles.sobreValue}>Endereço não informado</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={styles.sobreLabel}>🚗 Garagem</span>
                  <span style={styles.sobreValue}>
                    {profile.has_garage === 'sim' ? 'Sim' : 'Não'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                  <span style={styles.sobreLabel}>⏰ Horário de Funcionamento</span>
                  {(() => {
                    if (!profile.operating_hours) {
                      return <span style={styles.sobreValue}>Não informado</span>;
                    }
                    try {
                      let hoursObj = null;
                      if (profile.operating_hours.trim().startsWith('{')) {
                        hoursObj = JSON.parse(profile.operating_hours);
                      }
                      if (hoursObj) {
                        const weekdays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
                        
                        const firstDay = hoursObj[weekdays[0]];
                        const allWeekdaysSame = weekdays.every(day => {
                          const d = hoursObj[day];
                          if (!d || !firstDay) return false;
                          return d.closed === firstDay.closed && d.open === firstDay.open && d.close === firstDay.close;
                        });

                        let weekdayText = '';
                        let weekdayClosed = false;
                        if (allWeekdaysSame && firstDay) {
                          weekdayClosed = firstDay.closed;
                          weekdayText = firstDay.closed ? 'Fechado' : `${firstDay.open} às ${firstDay.close}`;
                        } else {
                          const firstOpen = weekdays.find(d => hoursObj[d] && !hoursObj[d].closed);
                          if (firstOpen) {
                            weekdayClosed = false;
                            const info = hoursObj[firstOpen];
                            weekdayText = `${info.open} às ${info.close}`;
                          } else {
                            weekdayClosed = true;
                            weekdayText = 'Fechado';
                          }
                        }

                        const sat = hoursObj['Sábado'] || { closed: true };
                        const sun = hoursObj['Domingo'] || { closed: true };

                        return (
                          <div style={styles.hoursListCompact}>
                            <div style={styles.hoursRowCompact}>
                              <span style={styles.hoursDayBadgeCompact}>SEG. À SEX</span>
                              {weekdayClosed ? (
                                <span style={styles.hoursClosedCompact}>Fechado</span>
                              ) : (
                                <span style={styles.hoursTimeCompact}>{weekdayText}</span>
                              )}
                            </div>
                            <div style={styles.hoursRowCompact}>
                              <span style={styles.hoursDayBadgeCompact}>SÁBADO</span>
                              {sat.closed ? (
                                <span style={styles.hoursClosedCompact}>Fechado</span>
                              ) : (
                                <span style={styles.hoursTimeCompact}>{sat.open} às {sat.close}</span>
                              )}
                            </div>
                            <div style={styles.hoursRowCompact}>
                              <span style={styles.hoursDayBadgeCompact}>DOMINGO</span>
                              {sun.closed ? (
                                <span style={styles.hoursClosedCompact}>Fechado</span>
                              ) : (
                                <span style={styles.hoursTimeCompact}>{sun.open} às {sun.close}</span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {
                      console.warn('Error parsing operating_hours in render:', e);
                    }
                    return <span style={styles.sobreValue}>{profile.operating_hours}</span>;
                  })()}
                </div>

                {/* Nosso Ambiente (Comodidades) */}
                {(() => {
                  try {
                    let amenitiesObj = null;
                    if (profile.amenities) {
                      amenitiesObj = typeof profile.amenities === 'string' 
                        ? JSON.parse(profile.amenities) 
                        : profile.amenities;
                    }
                    
                    if (amenitiesObj) {
                      const activeAmenities = AMENITIES_OPTIONS.filter(opt => !!amenitiesObj[opt.key]);
                      
                      if (activeAmenities.length > 0) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', marginTop: '12px' }}>
                            <span style={styles.sobreLabel}>NOSSO AMBIENTE:</span>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '10px 20px',
                              width: '100%',
                              maxWidth: '320px',
                              textAlign: 'left',
                              padding: '0 10px',
                              marginTop: '4px'
                            }}>
                              {activeAmenities.map((opt) => (
                                <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '16px', height: '16px', borderRadius: '4px',
                                    background: '#39FF14', border: '1px solid #39FF14'
                                  }}>
                                    <span style={{ color: '#000', fontSize: '11px', fontWeight: 900 }}>✓</span>
                                  </div>
                                  <span style={{ fontSize: '13px', color: '#B0B0C8', fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>{opt.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    }
                  } catch (e) {
                    console.warn('Error formatting amenities:', e);
                  }
                  return null;
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', marginTop: '8px' }}>
                  <span style={styles.sobreLabel}>FALE CONOSCO</span>
                  {profile.whatsapp ? (
                    <motion.a
                      whileTap={{ scale: 0.97 }}
                      href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent('Olá, vim pelo FlowRide e gostaria de mais informações!')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.whatsappBtn}
                    >
                      <MessageSquare size={18} color="#25D366" fill="transparent" />
                      WhatsApp
                    </motion.a>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                      WhatsApp não cadastrado
                    </span>
                  )}
                </div>

                {/* Outras Redes Sociais */}
                {(() => {
                  try {
                    let socialObj = null;
                    if (profile.social_links) {
                      socialObj = typeof profile.social_links === 'string'
                        ? JSON.parse(profile.social_links)
                        : profile.social_links;
                    }
                    
                    if (socialObj) {
                      const links = [
                        { key: 'facebook', icon: FacebookIcon },
                        { key: 'instagram', icon: InstagramIcon },
                        { key: 'tiktok', icon: TikTokIcon },
                        { key: 'youtube', icon: YouTubeIcon }
                      ].filter(item => socialObj[item.key] && socialObj[item.key].trim().startsWith('http'));

                      if (links.length > 0) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', marginTop: '16px' }}>
                            <span style={styles.sobreLabel}>OUTRAS REDES</span>
                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '4px' }}>
                              {links.map((link) => (
                                <motion.a
                                  key={link.key}
                                  whileTap={{ scale: 0.9 }}
                                  href={socialObj[link.key]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '44px', height: '44px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <link.icon size={22} color="#fff" />
                                </motion.a>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    }
                  } catch (e) {
                    console.warn('Error formatting social links:', e);
                  }
                  return null;
                })()}
              </div>
            ) : (
              /* Trainer "Sobre" layout */
              <div style={{
                ...styles.sobreCard,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '18px',
                padding: '24px 16px'
              }}>
                <h4 style={styles.sobreTitle}>Sobre o Personal Trainer</h4>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={styles.sobreLabel}>👨‍🏫 Nome</span>
                  <span style={styles.sobreValue}>{profile.display_name}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={styles.sobreLabel}>🏋️ Carreira & Experiência</span>
                  <span style={styles.sobreValue}>
                    {profile.years_experience} {profile.years_experience === 1 ? 'ano' : 'anos'} atuando como Personal Trainer
                  </span>
                </div>

                {profile.students_count && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={styles.sobreLabel}>👥 Alunos Ativos</span>
                    <span style={styles.sobreValue}>{profile.students_count}</span>
                  </div>
                )}

                {profile.certifications && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={styles.sobreLabel}>📜 Certificações & Formação</span>
                    <span style={styles.sobreValue}>{profile.certifications}</span>
                  </div>
                )}

                {/* Specialties list */}
                {Array.isArray(profile.specialties) && profile.specialties.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span style={styles.sobreLabel}>🎯 Especialidades de Atendimento</span>
                    <div style={{ ...styles.goalsCenter, marginTop: '4px' }}>
                      {profile.specialties.map((spec) => {
                        const specOpt = TRAINER_SPECIALTIES_OPTIONS.find(o => o.key === spec);
                        return (
                          <span key={spec} style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', color: '#00D4FF', fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(10px)' }}>
                            {specOpt ? specOpt.label : spec}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', marginTop: '8px' }}>
                  <span style={styles.sobreLabel}>FALE CONOSCO</span>
                  {profile.whatsapp ? (
                    <motion.a
                      whileTap={{ scale: 0.97 }}
                      href={`https://wa.me/${profile.whatsapp}?text=${encodeURIComponent('Olá, vi seu perfil no FlowRise e gostaria de agendar uma consultoria!')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.whatsappBtn}
                    >
                      <MessageSquare size={18} color="#25D366" fill="transparent" />
                      Entrar em contato
                    </motion.a>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                      WhatsApp não cadastrado
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Feedbacks Header */}
            <div style={styles.feedbacksHeader}>
              <h4 style={styles.feedbacksTitle}>
                {profile?.profile_type === 'trainer' ? 'Feedbacks de Alunos' : 'Feedbacks de Frequentadores'}
              </h4>
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
                  <span>Nenhum feedback deixado ainda. Seja o primeiro a avaliar!</span>
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

            {/* Write feedback form */}
            {user?.uid !== profile.id && (() => {
              const myFeedback = feedbacks.find(fb => fb.user_id === user?.uid);
              return (
                <div style={styles.feedbackFormCard}>
                  <h5 style={styles.feedbackFormTitle}>
                    {myFeedback ? 'Editar seu Feedback' : 'Escreva um Feedback'}
                  </h5>
                
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#B0B0C8' }}>Sua avaliação:</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          style={{
                            cursor: 'pointer',
                            color: star <= userRating ? '#FFD700' : 'rgba(255,255,255,0.2)',
                            fontSize: '24px',
                            transition: 'color 0.2s',
                          }}
                          onClick={() => setUserRating(star)}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', color: '#B0B0C8' }}>Comentário:</label>
                    <textarea
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      placeholder={profile?.profile_type === 'trainer' ? "Conte como foi sua experiência com este personal..." : "Conte como foi sua experiência nesta academia..."}
                      style={styles.feedbackTextarea}
                      maxLength={200}
                      disabled={isSubmittingFeedback}
                    />
                    <span style={{ fontSize: '11px', color: '#6C6C88', textAlign: 'right' }}>
                      {userComment.length}/200
                    </span>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmitFeedback}
                    disabled={isSubmittingFeedback || !userComment.trim()}
                    style={{
                      ...styles.feedbackSubmitBtn,
                      opacity: (isSubmittingFeedback || !userComment.trim()) ? 0.6 : 1,
                    }}
                  >
                    {isSubmittingFeedback ? 'Enviando...' : myFeedback ? 'Atualizar Feedback' : 'Publicar Feedback'}
                  </motion.button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Content - Série (Read-only) */}
        {activeTab === 'serie' && profile?.profile_type !== 'business' && (
          <div style={workoutStyles.container}>
            {!activeWorkoutSeries ? (
              <div style={workoutStyles.emptyState}>
                <Dumbbell size={48} color="rgba(255,255,255,0.2)" />
                <span style={workoutStyles.emptyTitle}>Nenhuma Série Pública</span>
                <span style={workoutStyles.emptyText}>Este usuário não possui uma série de treinos pública no momento.</span>
              </div>
            ) : (
              <div style={workoutStyles.activeSeriesContainer}>
                {/* Series Header Card */}
                <div style={workoutStyles.headerCard}>
                  <div style={workoutStyles.headerTop}>
                    <div>
                      <h4 style={workoutStyles.seriesTitle}>{activeWorkoutSeries.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span style={workoutStyles.seriesFreq}>{activeWorkoutSeries.weekly_frequency}</span>
                        {(() => {
                          const hasCopies = (activeWorkoutSeries.copies_count > 0);
                          return (
                            <span style={{
                              fontSize: '11px',
                              padding: '4px 10px',
                              borderRadius: '10px',
                              background: hasCopies ? 'rgba(57, 255, 20, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                              border: hasCopies ? '1px solid #39FF14' : '1px solid rgba(255, 255, 255, 0.08)',
                              color: hasCopies ? '#39FF14' : 'rgba(255, 255, 255, 0.4)',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: hasCopies ? '0 0 12px rgba(57, 255, 20, 0.25)' : 'none',
                              transition: 'all 0.3s ease',
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              <Copy size={11} color={hasCopies ? '#39FF14' : 'rgba(255, 255, 255, 0.4)'} />
                              {activeWorkoutSeries.copies_count || 0} {activeWorkoutSeries.copies_count === 1 ? 'cópia' : 'cópias'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: '#39FF14',
                        border: 'none',
                        color: '#000',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(57, 255, 20, 0.2)',
                      }}
                      onClick={handleCopySeries}
                    >
                      <Copy size={13} color="#000" />
                      Copiar série
                    </motion.button>
                  </div>

                  {/* Progress Bar */}
                  <div style={workoutStyles.progressSection}>
                    <div style={workoutStyles.progressLabels}>
                      <span style={workoutStyles.progressLabel}>Progresso do Usuário</span>
                      <span style={workoutStyles.progressVal}>
                        {activeWorkoutSeries.progress_completed || 0}/{activeWorkoutSeries.progress_total || 30} treinos
                      </span>
                    </div>
                    <div style={workoutStyles.progressTrack}>
                      <motion.div
                        style={{
                          ...workoutStyles.progressFill,
                          width: `${Math.min(100, Math.round(((activeWorkoutSeries.progress_completed || 0) / (activeWorkoutSeries.progress_total || 30)) * 100))}%`
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.round(((activeWorkoutSeries.progress_completed || 0) / (activeWorkoutSeries.progress_total || 30)) * 100))}%`
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Exercises List Header */}
                <div style={workoutStyles.exercisesHeader}>
                  <h5 style={workoutStyles.exercisesTitle}>Exercícios da Série</h5>
                  <span style={workoutStyles.exercisesCount}>{activeWorkoutSeries.exercises?.length || 0} exercícios</span>
                </div>

                {/* Exercises Grid/List */}
                <div style={workoutStyles.exercisesList}>
                  {(!activeWorkoutSeries.exercises || activeWorkoutSeries.exercises.length === 0) ? (
                    <div style={workoutStyles.noExercisesCard}>
                      <span>Nenhum exercício cadastrado nesta série.</span>
                    </div>
                  ) : (
                    activeWorkoutSeries.exercises.map((ex) => (
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
                        <div style={workoutStyles.exerciseActionRow}>
                          {/* Video Button */}
                          <button
                            style={workoutStyles.videoDemoBtn}
                            onClick={() => setSelectedExercise(ex.name)}
                          >
                            <Play size={14} color="#00D4FF" fill="#00D4FF" />
                          </button>

                          {/* Read Only Status Badge */}
                          <div
                            style={{
                              ...workoutStyles.readOnlyBadge,
                              ...(ex.done_today ? workoutStyles.readOnlyBadgeDone : {}),
                            }}
                          >
                            {ex.done_today ? 'Feito' : 'Pendente'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

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
                  <h3 style={modalStyles.title}>Medalhas de @{profile.username}</h3>
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
                  {allBadgesAndMedals.filter(badge => badge.unlocked).map((badge, i) => (
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

                {/* Action button */}
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
      <ExerciseVideoModal
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        exerciseName={selectedExercise}
      />
    </ScreenWrapper>
  );
}

const AMENITIES_OPTIONS = [
  { key: 'estacionamento', label: 'Estacionamento' },
  { key: 'ar_condicionado', label: 'Ar-condicionado' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'chuveiro', label: 'Chuveiro' },
  { key: 'vestuario', label: 'Vestiário' },
  { key: 'banheiro', label: 'Banheiro' },
  { key: 'sauna', label: 'Sauna' },
  { key: 'avaliacao_fisica', label: 'Avaliação física' },
  { key: 'nutricionista', label: 'Nutricionista' },
  { key: 'acessibilidade', label: 'Acessibilidade' },
  { key: 'bebedouro', label: 'Bebedouro' },
  { key: 'personal_trainer', label: 'Personal Trainer' },
];

const FacebookIcon = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TikTokIcon = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const YouTubeIcon = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
    <polygon points="10 15 15 12 10 9" fill={color} />
  </svg>
);

const styles = {
  verifiedAvatarBadge: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    background: '#22C55E',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #0A0A0F',
    zIndex: 11,
  },
  roleLabel: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#B0B0C8',
    marginTop: '8px',
    fontFamily: "'Outfit', sans-serif",
    textAlign: 'center',
  },
  sobreTitleCompact: { fontSize: '13px', color: '#6C6C88', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' },
  hoursListCompact: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    maxWidth: '320px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '14px 18px',
    marginTop: '6px',
  },
  hoursRowCompact: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  hoursDayBadgeCompact: {
    background: 'rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '0.5px',
  },
  hoursTimeCompact: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
  },
  hoursClosedCompact: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#FF2D55',
    background: 'rgba(255,45,85,0.1)',
    borderRadius: '6px',
    padding: '3px 8px',
    fontFamily: "'Outfit', sans-serif",
  },
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
  feedbackFormCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(0,212,255,0.1)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '30px',
  },
  feedbackFormTitle: { fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 16px 0', fontFamily: "'Outfit', sans-serif" },
  feedbackTextarea: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    padding: '10px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    minHeight: '60px',
    resize: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  feedbackSubmitBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
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
  refreshIndicator: {
    position: 'absolute',
    top: '80px',
    left: '50%',
    zIndex: 90,
    background: 'rgba(10, 10, 15, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'none',
    transition: 'transform 0.1s ease-out, opacity 0.1s ease-out',
  },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '-10%', left: '-20%', zIndex: 0, pointerEvents: 'none',
    willChange: 'transform',
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '60%', right: '-10%', zIndex: 0, pointerEvents: 'none',
    willChange: 'transform',
  },
  header: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px', position: 'relative' },
  title: { fontSize: '20px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: '-0.5px' },
  headerBtnLeft: { position: 'absolute', left: 0, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  profileCard: {
    position: 'relative',
    overflow: 'hidden',
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
  coverPhotoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '130px',
    zIndex: 1,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  coverPhotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverPhotoFallback: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    opacity: 0.8,
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
    top: '-12px',
    left: '-12px',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  streakEmoji: {
    fontSize: '24px',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
  },
  streakNumber: {
    fontSize: '14px',
    fontWeight: '900',
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    marginLeft: '-4px',
    marginTop: '10px',
    textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 2px 4px rgba(0,0,0,0.5)',
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
  modalContent: { flex: 1, height: '100%', position: 'relative' },
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
  activeSeriesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
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
  readOnlyBadge: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif"
  },
  readOnlyBadgeDone: {
    background: 'rgba(57,255,20,0.1)',
    color: '#39FF14',
    border: '1px solid rgba(57,255,20,0.2)'
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
  }
};
