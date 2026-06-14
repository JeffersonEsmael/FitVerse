import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from '../utils/localCache';

const sampleRanking = [
  { uid: 'r1', displayName: 'Lucas Trainer', username: 'fitpro_lucas', photoURL: '', level: 28, xp: 8450, streak: 15, points: 2850, trend: 'up', badges: ['streak15','top3'] },
  { uid: 'r2', displayName: 'Ana Nutrição', username: 'nutri_ana', photoURL: '', level: 25, xp: 7200, streak: 22, points: 2720, trend: 'up', badges: ['streak21','nutriscan'] },
  { uid: 'r3', displayName: 'Rafael GymBro', username: 'gym_rafael', photoURL: '', level: 22, xp: 6100, streak: 10, points: 2540, trend: 'same', badges: ['streak7','viral'] },
  { uid: 'r4', displayName: 'Maria Coach', username: 'coach_maria', photoURL: '', level: 20, xp: 5500, streak: 8, points: 2380, trend: 'down', badges: ['streak7'] },
  { uid: 'r5', displayName: 'FitUser', username: 'fituser', photoURL: '', level: 12, xp: 2450, streak: 7, points: 1950, trend: 'up', badges: ['streak7','firstPost'] },
  { uid: 'r6', displayName: 'Pedro Fitness', username: 'fit_pedro', photoURL: '', level: 18, xp: 4800, streak: 5, points: 1820, trend: 'down', badges: ['streak7'] },
  { uid: 'r7', displayName: 'Julia Fit', username: 'julia_fit', photoURL: '', level: 16, xp: 4200, streak: 12, points: 1700, trend: 'up', badges: ['streak7'] },
  { uid: 'r8', displayName: 'Carlos Strong', username: 'carlos_strong', photoURL: '', level: 14, xp: 3600, streak: 3, points: 1550, trend: 'same', badges: [] },
  { uid: 'r9', displayName: 'Beatriz Health', username: 'bia_health', photoURL: '', level: 11, xp: 2100, streak: 6, points: 1380, trend: 'up', badges: [] },
  { uid: 'r10', displayName: 'Diego Muscle', username: 'diego_muscle', photoURL: '', level: 10, xp: 1800, streak: 2, points: 1200, trend: 'down', badges: [] },
];

const sampleChallenges = [
  { id: 'c1', title: '30 Dias de Treino', description: 'Treine todos os dias por 30 dias', icon: '🏋️', type: 'treino', duration: 30, participants: 1247, progress: 12, reward: 500, color: '#00D4FF' },
  { id: 'c2', title: 'Hidratação Master', description: 'Beba 3L de água por dia', icon: '💧', type: 'saúde', duration: 14, participants: 892, progress: 8, reward: 200, color: '#39FF14' },
  { id: 'c3', title: 'Cardio Challenge', description: '150min de cardio por semana', icon: '🏃', type: 'cardio', duration: 7, participants: 634, progress: 3, reward: 150, color: '#FF6B35' },
  { id: 'c4', title: 'Clean Eating', description: 'Registre todas as refeições no NutriScan', icon: '🥗', type: 'nutrição', duration: 21, participants: 445, progress: 5, reward: 300, color: '#A855F7' },
];

export const useRankingStore = create((set, get) => ({
  leaderboard: sampleRanking,
  challenges: sampleChallenges,
  userRank: 5,
  userPoints: 1950,
  period: 'weekly',
  isLoading: false,

  setPeriod: (period) => set({ period }),

  fetchLeaderboard: async () => {
    // Check cache first
    const period = get().period;
    const cached = cacheGet(CACHE_KEYS.leaderboard(period));
    if (cached) {
      set({ leaderboard: cached });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, level, xp, streak, badges')
        .order('xp', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const users = data.map((u) => ({
          uid: u.id,
          displayName: u.display_name,
          username: u.username,
          photoURL: u.avatar_url || '',
          level: u.level || 1,
          xp: u.xp || 0,
          streak: u.streak || 0,
          points: u.xp || 0,
          trend: 'same',
          badges: u.badges || [],
        }));
        cacheSet(CACHE_KEYS.leaderboard(period), users, CACHE_TTL.LEADERBOARD);
        set({ leaderboard: users, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  fetchChallenges: async () => {
    // Check cache first
    const cached = cacheGet(CACHE_KEYS.challenges());
    if (cached) {
      set({ challenges: cached });
      return;
    }

    try {
      const { useAuthStore } = await import('./authStore');
      const userId = useAuthStore.getState().user?.uid;

      const { data: rawChallenges, error: chalError } = await supabase
        .from('challenges')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (chalError) throw chalError;

      let joinedChallenges = [];
      if (userId && rawChallenges && rawChallenges.length > 0) {
        const { data: participations } = await supabase
          .from('challenge_participants')
          .select('challenge_id, progress')
          .eq('user_id', userId);

        if (participations) {
          joinedChallenges = participations;
        }
      }

      if (rawChallenges && rawChallenges.length > 0) {
        const enriched = rawChallenges.map((c) => {
          const matched = joinedChallenges.find((p) => p.challenge_id === c.id);
          if (matched) {
            console.log(`[RankingStore] 📊 Desafio "${c.title}" — progress do DB: ${matched.progress}, duration: ${c.duration}`);
          }
          return {
            ...c,
            joined: !!matched,
            progress: matched ? matched.progress : 0,
          };
        });
        console.log('[RankingStore] fetchChallenges: carregados', enriched.length, 'desafios,', joinedChallenges.length, 'participações');
        cacheSet(CACHE_KEYS.challenges(), enriched, CACHE_TTL.CHALLENGES);
        set({ challenges: enriched });
      }
    } catch (err) {
      console.warn('Error loading challenges from Supabase:', err.message);
    }
  },

  joinChallenge: async (challengeId) => {
    const { useAuthStore } = await import('./authStore');
    const userId = useAuthStore.getState().user?.uid;

    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === challengeId ? { ...c, participants: (c.participants || 0) + 1, joined: true } : c
      ),
    }));

    if (userId) {
      try {
        await supabase.from('challenge_participants').insert({
          challenge_id: challengeId,
          user_id: userId,
          progress: 0,
        });

        const chal = get().challenges.find((c) => c.id === challengeId);
        await supabase
          .from('challenges')
          .update({ participants: (chal?.participants || 0) + 1 })
          .eq('id', challengeId);
      } catch (err) {
        console.warn('Failed to join challenge in Supabase:', err.message);
      }
    }
  },

  leaveChallenge: async (challengeId) => {
    const { useAuthStore } = await import('./authStore');
    const userId = useAuthStore.getState().user?.uid;

    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === challengeId ? { ...c, participants: Math.max(0, (c.participants || 0) - 1), joined: false, progress: 0 } : c
      ),
    }));

    if (userId) {
      try {
        // Deleta a participação do desafio
        await supabase
          .from('challenge_participants')
          .delete()
          .eq('challenge_id', challengeId)
          .eq('user_id', userId);

        // Deleta todos os check-ins referentes a este desafio para o usuário
        await supabase
          .from('challenge_checkins')
          .delete()
          .eq('challenge_id', challengeId)
          .eq('user_id', userId);

        const chal = get().challenges.find((c) => c.id === challengeId);
        await supabase
          .from('challenges')
          .update({ participants: Math.max(0, (chal?.participants || 0) - 1) })
          .eq('id', challengeId);
      } catch (err) {
        console.warn('Failed to leave challenge in Supabase:', err.message);
      }
    }
  },

  addChallenge: async (challenge) => {
    const { useAuthStore } = await import('./authStore');
    const userId = useAuthStore.getState().user?.uid;

    const newId = challenge.id || `c_${Date.now()}`;
    const newChallenge = {
      id: newId,
      title: challenge.title,
      description: challenge.description || '',
      icon: challenge.icon || '🏆',
      type: challenge.type || 'geral',
      duration: challenge.duration || 30,
      participants: 1,
      progress: 0,
      reward: challenge.reward || 100,
      color: challenge.color || '#00D4FF',
      active: true,
      joined: true,
      creator_id: userId,
      expires_at: challenge.expires_at,
    };

    set((state) => ({
      challenges: [newChallenge, ...state.challenges],
    }));

    if (userId) {
      try {
        const { data, error } = await supabase
          .from('challenges')
          .insert({
            title: challenge.title,
            description: challenge.description || '',
            icon: challenge.icon || '🏆',
            type: challenge.type || 'geral',
            duration: challenge.duration || 30,
            participants: 1,
            reward: challenge.reward || 100,
            color: challenge.color || '#00D4FF',
            active: true,
            creator_id: userId,
            expires_at: challenge.expires_at,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          await supabase.from('challenge_participants').insert({
            challenge_id: data.id,
            user_id: userId,
            progress: 0,
          });

          set((state) => ({
            challenges: state.challenges.map((c) =>
              c.id === newId ? { ...data, joined: true, progress: 0 } : c
            ),
          }));
        }
      } catch (err) {
        console.warn('Error creating challenge in Supabase:', err.message);
      }
    }
  },

  performCheckIn: async (challengeId, checkInData) => {
    const { useAuthStore } = await import('./authStore');
    const authState = useAuthStore.getState();
    const userId = authState.user?.uid;
    const userProfile = authState.profile;

    const challenge = get().challenges.find((c) => c.id === challengeId);
    if (!challenge) return { success: false, error: 'Desafio não encontrado.' };

    console.log('[RankingStore] performCheckIn START', {
      challengeId,
      challengeTitle: challenge.title,
      currentProgress: challenge.progress,
      duration: challenge.duration,
      userId,
    });

    // ── Prevent duplicate check-in on the same day ──
    if (userId) {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { data: todayCheckins, error: todayErr } = await supabase
          .from('challenge_checkins')
          .select('id')
          .eq('challenge_id', challengeId)
          .eq('user_id', userId)
          .gte('created_at', todayStart.toISOString());

        if (!todayErr && todayCheckins && todayCheckins.length > 0) {
          console.warn('[RankingStore] Usuário já fez check-in neste desafio hoje. Bloqueando duplicata.');
          return { success: false, error: 'Você já realizou check-in neste desafio hoje.' };
        }
      } catch (dupErr) {
        console.warn('[RankingStore] Erro ao verificar check-in duplicado:', dupErr.message);
      }
    }

    const newProgress = (challenge.progress || 0) + 1;
    console.log('[RankingStore] newProgress =', newProgress);

    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === challengeId ? { ...c, progress: Math.min(newProgress, c.duration || 30) } : c
      ),
    }));

    set((state) => ({ userPoints: state.userPoints + (challenge.reward || 100) }));

    if (userProfile) {
      const currentXp = userProfile.xp || 0;
      const rewardXp = challenge.reward || 100;
      const newXp = currentXp + rewardXp;
      const newLevel = Math.floor(newXp / 1000) + 1;
      await authState.updateProfile({ xp: newXp, level: newLevel });
    }

    if (userId) {
      try {
        const { error: progressUpdateErr } = await supabase
          .from('challenge_participants')
          .update({ progress: Math.min(newProgress, challenge.duration || 30) })
          .eq('challenge_id', challengeId)
          .eq('user_id', userId);

        if (progressUpdateErr) {
          console.error('[RankingStore] ❌ FALHA ao atualizar progress no DB:', progressUpdateErr.message, progressUpdateErr);
        } else {
          console.log('[RankingStore] ✅ Progress atualizado no DB para:', Math.min(newProgress, challenge.duration || 30));
        }

        let uploadedPhotoUrl = checkInData.photoUrl || '';
        let compressedPhoto = checkInData.photoFile;

        if (checkInData.photoFile) {
          try {
            const { compressImage } = await import('../utils/compression');
            compressedPhoto = await compressImage(checkInData.photoFile, { maxWidth: 900, maxHeight: 900, quality: 0.7 });
          } catch (compErr) {
            console.warn('[RankingStore] Check-in photo compression failed, using original:', compErr);
          }

          const fileExt = compressedPhoto.name ? compressedPhoto.name.split('.').pop() : 'jpg';
          const fileName = `${userId}/${Date.now()}.${fileExt}`;
          const { error: uploadErr } = await supabase.storage
            .from('posts')
            .upload(fileName, compressedPhoto, { contentType: compressedPhoto.type, cacheControl: '86400' });

          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
            uploadedPhotoUrl = urlData?.publicUrl || '';
          }
        }

        const { error: checkinInsertErr } = await supabase.from('challenge_checkins').insert({
          challenge_id: challengeId,
          user_id: userId,
          activity_title: checkInData.activityTitle || 'Treino Concluído',
          photo_url: uploadedPhotoUrl,
          metric_value: checkInData.metricValue || 1,
        });

        if (checkinInsertErr) {
          console.error('[RankingStore] ❌ FALHA ao inserir challenge_checkins:', checkinInsertErr.message, checkinInsertErr);
        } else {
          console.log('[RankingStore] ✅ Check-in registrado na tabela challenge_checkins');
        }

        const { useFeedStore } = await import('./feedStore');
        const feedState = useFeedStore.getState();
        const postCaption = `Check-in diário no desafio ${challenge.icon} *${challenge.title}*:\n"${checkInData.activityTitle || 'Treino Concluído'}"! +${challenge.reward || 100} XP 💪🔥`;

        if (compressedPhoto) {
          await feedState.createPost(compressedPhoto, {
            userId,
            username: userProfile?.username || 'user',
            userAvatar: userProfile?.avatar_url || '',
            displayName: userProfile?.display_name || 'Usuário',
            caption: postCaption,
            hashtags: ['desafio', challenge.type || 'treino'],
            category: 'desafio',
          });
        } else {
          const postData = {
            video_url: uploadedPhotoUrl || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500',
            media_type: 'image',
            user_id: userId,
            username: userProfile?.username || 'user',
            user_avatar: userProfile?.avatar_url || '',
            display_name: userProfile?.display_name || 'Usuário',
            caption: postCaption,
            hashtags: ['desafio', challenge.type || 'treino'],
            category: 'desafio',
            shapes: 0, boosts: 0, gym_bag_saves: 0,
            comments: 0, shares: 0, views: 0,
          };
          await supabase.from('videos').insert(postData);
          feedState.fetchVideos();
        }
      } catch (err) {
        console.warn('Supabase DB updates for checkin failed:', err.message);
      }
    } else {
      const { useFeedStore } = await import('./feedStore');
      const feedState = useFeedStore.getState();
      const mockPost = {
        id: `mock_post_${Date.now()}`,
        videoUrl: checkInData.photoPreview || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500',
        mediaType: 'image',
        userId: 'fituser',
        username: userProfile?.username || 'fituser',
        userAvatar: userProfile?.avatar_url || '',
        displayName: userProfile?.display_name || 'FitUser',
        caption: `Check-in diário no desafio ${challenge.icon} *${challenge.title}*:\n"${checkInData.activityTitle || 'Treino Concluído'}"! +${challenge.reward || 100} XP 💪🔥`,
        hashtags: ['desafio', challenge.type || 'treino'],
        category: 'desafio',
        shapes: 0, boosts: 0, gym_bag_saves: 0,
        comments: 0, shares: 0, views: 0,
        hasShaped: false, hasBoosted: false, inGymBag: false,
        createdAt: new Date(),
      };
      useFeedStore.setState({ videos: [mockPost, ...feedState.videos] });
    }
    return { success: true };
  },

  updateProgress: (challengeId, newProgress) => {
    set((state) => ({
      challenges: state.challenges.map((c) =>
        c.id === challengeId ? { ...c, progress: newProgress } : c
      ),
    }));
  },

  addPoints: (amount) => {
    set((state) => ({ userPoints: state.userPoints + amount }));
  },
}));
