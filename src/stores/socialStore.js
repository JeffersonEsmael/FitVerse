import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useAuthStore } from './authStore';
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePattern, CACHE_KEYS, CACHE_TTL } from '../utils/localCache';

export const useSocialStore = create((set, get) => ({
  searchResults: [],
  isSearching: false,
  
  // Follow a user
  followUser: async (followerId, followingId) => {
    try {
      const { error } = await supabase
        .from('followers')
        .insert({ follower_id: followerId, following_id: followingId });
        
      if (error && error.code !== '23505') throw error; // Ignore unique violation if already following
      
      // Update target user's followers count
      const { count: followerCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', followingId);

      await supabase
        .from('profiles')
        .update({ followers: followerCount || 0 })
        .eq('id', followingId);

      // Update current user's following count
      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', followerId);

      await supabase
        .from('profiles')
        .update({ following: followingCount || 0 })
        .eq('id', followerId);
      
      // Send notification
      await get().createNotification(followingId, followerId, 'follow');

      // Invalidate following cache
      cacheInvalidate(CACHE_KEYS.following(followerId, followingId));

      // Refresh authStore profile to update the logged in user's profile
      useAuthStore.getState().refreshProfile();

      return { success: true };
    } catch (error) {
      console.error('[SocialStore] follow error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Unfollow a user
  unfollowUser: async (followerId, followingId) => {
    try {
      const { error } = await supabase
        .from('followers')
        .delete()
        .match({ follower_id: followerId, following_id: followingId });
        
      if (error) throw error;
      
      // Update target user's followers count
      const { count: followerCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', followingId);

      await supabase
        .from('profiles')
        .update({ followers: followerCount || 0 })
        .eq('id', followingId);

      // Update current user's following count
      const { count: followingCount } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', followerId);

      await supabase
        .from('profiles')
        .update({ following: followingCount || 0 })
        .eq('id', followerId);
      
      // Invalidate following cache
      cacheInvalidate(CACHE_KEYS.following(followerId, followingId));

      // Refresh authStore profile to update the logged in user's profile
      useAuthStore.getState().refreshProfile();
      
      return { success: true };
    } catch (error) {
      console.error('[SocialStore] unfollow error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Check if following (cached)
  checkIfFollowing: async (followerId, followingId) => {
    // Check cache first
    const cached = cacheGet(CACHE_KEYS.following(followerId, followingId));
    if (cached !== null) return cached;

    try {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .match({ follower_id: followerId, following_id: followingId });
        
      if (error) throw error;
      const result = count > 0;
      cacheSet(CACHE_KEYS.following(followerId, followingId), result, CACHE_TTL.FOLLOWING);
      return result;
    } catch (error) {
      console.error('[SocialStore] checkIfFollowing error:', error.message);
      return false;
    }
  },

  // Search users
  searchUsers: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, followers')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);
        
      if (error) throw error;
      set({ searchResults: data || [] });
    } catch (error) {
      console.error('[SocialStore] search error:', error.message);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  // Search videos
  searchVideos: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .or(`caption.ilike.%${query}%,category.ilike.%${query}%`)
        .limit(20);
        
      if (error) throw error;

      if (!data || data.length === 0) {
        set({ searchResults: [] });
        return;
      }

      // Query actual user interactions to set active visual states
      let userInteractions = [];
      try {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.uid) {
          const videoIds = data.map((v) => v.id);
          const { data: interactions } = await supabase
            .from('video_interactions')
            .select('video_id, interaction_type')
            .eq('user_id', currentUser.uid)
            .in('video_id', videoIds);
          if (interactions) userInteractions = interactions;
        }
      } catch (authErr) {
        console.warn('[SocialStore] Error getting active user interactions:', authErr.message);
      }

      const result = data.map((v) => {
        const hasShaped = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'shape'
        );
        const hasBoosted = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'boost'
        );
        const inGymBag = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'gym_bag'
        );

        return {
          id: v.id,
          videoUrl: v.video_url,
          thumbnailUrl: v.thumbnail_url || '',
          mediaType: v.media_type || 'video',
          carouselUrls: v.carousel_urls || [],
          userId: v.user_id,
          username: v.username || 'user',
          userAvatar: v.user_avatar || '',
          displayName: v.display_name || 'Usuário',
          caption: v.caption || '',
          hashtags: v.hashtags || [],
          category: v.category || 'geral',
          shapes: v.shapes || 0,
          boosts: v.boosts || 0,
          gym_bag_saves: v.gym_bag_saves || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
          views: v.views || 0,
          hasShaped,
          hasBoosted,
          inGymBag,
          createdAt: new Date(v.created_at),
        };
      });

      set({ searchResults: result });
    } catch (error) {
      console.error('[SocialStore] searchVideos error:', error.message);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  // Search sounds (Exercise Demo Videos)
  searchSounds: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const { ALL_PRESET_EXERCISES } = await import('../utils/exercises');
      const filtered = ALL_PRESET_EXERCISES.filter(ex => 
        ex.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .includes(query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      );
      
      const results = filtered.map((ex, idx) => ({
        id: `preset_ex_${idx}`,
        caption: ex,
        isPreset: true
      }));
      
      set({ searchResults: results });
    } catch (error) {
      console.error('[SocialStore] searchSounds error:', error.message);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  // Search challenges
  searchChallenges: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const activeOnly = data.filter(c => !c.expires_at || new Date(c.expires_at) > new Date());
        set({ searchResults: activeOnly });
      } else {
        const mockChallenges = [
          { id: 'c1', title: '30 Dias de Treino', description: 'Treine todos os dias por 30 dias', icon: '🏋️', type: 'treino', duration: 30, participants: 1247, progress: 12, reward: 500, color: '#00D4FF' },
          { id: 'c2', title: 'Hidratação Master', description: 'Beba 3L de água por dia', icon: '💧', type: 'saúde', duration: 14, participants: 892, progress: 8, reward: 200, color: '#39FF14' },
          { id: 'c3', title: 'Cardio Challenge', description: '150min de cardio por semana', icon: '🏃', type: 'cardio', duration: 7, participants: 634, progress: 3, reward: 150, color: '#FF6B35' },
          { id: 'c4', title: 'Clean Eating', description: 'Registre todas as refeições no NutriScan', icon: '🥗', type: 'nutrição', duration: 21, participants: 445, progress: 5, reward: 300, color: '#A855F7' },
        ];
        const filtered = mockChallenges.filter(
          c => c.title.toLowerCase().includes(query.toLowerCase()) || 
               c.description.toLowerCase().includes(query.toLowerCase())
        );
        set({ searchResults: filtered });
      }
    } catch (error) {
      console.error('[SocialStore] searchChallenges error:', error.message);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  // Clear search
  clearSearch: () => set({ searchResults: [] }),

  // Fetch Public Profile (cached)
  fetchPublicProfile: async (userId, ignoreCache = false) => {
    // Check cache first
    if (!ignoreCache) {
      const cached = cacheGet(CACHE_KEYS.publicProfile(userId));
      if (cached) return cached;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      cacheSet(CACHE_KEYS.publicProfile(userId), data, CACHE_TTL.PROFILE);
      return data;
    } catch (error) {
      console.error('[SocialStore] fetch public profile error:', error.message);
      return null;
    }
  },

  // Create generic notification
  createNotification: async (userId, senderId, type, referenceId = null) => {
    if (userId === senderId) return; // Don't notify yourself
    
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          sender_id: senderId,
          type: type,
          reference_id: referenceId
        });
      if (error) throw error;
    } catch (error) {
      console.error('[SocialStore] create notification error:', error.message);
    }
  },

  notifications: [],
  isLoadingNotifs: false,

  fetchNotifications: async (userId) => {
    // Check cache first
    const cached = cacheGet(CACHE_KEYS.notifications(userId));
    if (cached) {
      set({ notifications: cached });
      return;
    }

    set({ isLoadingNotifs: true });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!sender_id (id, username, display_name, avatar_url)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;

      const notifications = data || [];

      // ── BATCH fetch all referenced videos in ONE query (eliminates N+1) ──
      const videoRefIds = [...new Set(
        notifications
          .filter(n => ['shape', 'comment', 'save', 'boost', 'mention'].includes(n.type) && n.reference_id)
          .map(n => n.reference_id)
      )];

      let videosMap = {};
      if (videoRefIds.length > 0) {
        const { data: videosData } = await supabase
          .from('videos')
          .select('id, video_url, thumbnail_url, caption')
          .in('id', videoRefIds);
        if (videosData) {
          videosData.forEach(v => { videosMap[v.id] = v; });
        }
      }

      // ── BATCH fetch latest comments for comment/mention notifications ──
      const commentNotifs = notifications.filter(
        n => ['comment', 'mention'].includes(n.type) && n.reference_id && n.sender_id
      );
      let commentsMap = {};
      if (commentNotifs.length > 0) {
        const commentVideoIds = [...new Set(commentNotifs.map(n => n.reference_id))];
        const commentSenderIds = [...new Set(commentNotifs.map(n => n.sender_id))];
        const { data: commentsData } = await supabase
          .from('video_comments')
          .select('video_id, user_id, content')
          .in('video_id', commentVideoIds)
          .in('user_id', commentSenderIds)
          .order('created_at', { ascending: false });
        if (commentsData) {
          // Store the first (latest) comment per video_id+user_id
          commentsData.forEach(c => {
            const key = `${c.video_id}_${c.user_id}`;
            if (!commentsMap[key]) commentsMap[key] = c.content;
          });
        }
      }

      // ── Enrich notifications using the batch results ──
      const notificationsWithData = notifications.map(notif => {
        let reference_data = null;

        if (['shape', 'comment', 'save', 'boost', 'mention'].includes(notif.type) && notif.reference_id) {
          const videoData = videosMap[notif.reference_id];
          if (videoData) {
            reference_data = {
              video_thumbnail: videoData.thumbnail_url || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150',
            };

            if (notif.type === 'comment' || notif.type === 'mention') {
              const commentKey = `${notif.reference_id}_${notif.sender_id}`;
              reference_data.preview = commentsMap[commentKey] || videoData.caption || 'Comentário';
            }
          }
        }

        return { ...notif, reference_data };
      });

      cacheSet(CACHE_KEYS.notifications(userId), notificationsWithData, CACHE_TTL.NOTIFICATIONS);
      set({ notifications: notificationsWithData });
    } catch (error) {
      console.error('[SocialStore] fetch notifs error:', error.message);
    } finally {
      set({ isLoadingNotifs: false });
    }
  },

  markNotificationsRead: async (userId) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      }));
    } catch (error) {
      console.error('[SocialStore] mark read error:', error.message);
    }
  }
}));
