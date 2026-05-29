import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useAuthStore } from './authStore';

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
      
      // Refresh authStore profile to update the logged in user's profile
      useAuthStore.getState().refreshProfile();
      
      return { success: true };
    } catch (error) {
      console.error('[SocialStore] unfollow error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // Check if following
  checkIfFollowing: async (followerId, followingId) => {
    try {
      const { count, error } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .match({ follower_id: followerId, following_id: followingId });
        
      if (error) throw error;
      return count > 0;
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
      set({ searchResults: data || [] });
    } catch (error) {
      console.error('[SocialStore] searchVideos error:', error.message);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  // Search sounds
  searchSounds: async (query) => {
    if (!query || query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, display_name, username, user_avatar, video_url, caption')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);
        
      if (error) throw error;
      set({ searchResults: data || [] });
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
        set({ searchResults: data });
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

  // Fetch Public Profile
  fetchPublicProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
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
      
      const notificationsWithData = await Promise.all((data || []).map(async (notif) => {
        let reference_data = null;
        
        if (['shape', 'comment', 'save', 'boost', 'mention'].includes(notif.type) && notif.reference_id) {
          // Fetch video details
          const { data: videoData } = await supabase
            .from('videos')
            .select('video_url, thumbnail_url, caption')
            .eq('id', notif.reference_id)
            .maybeSingle();
            
          if (videoData) {
            reference_data = {
              video_thumbnail: videoData.thumbnail_url || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150',
            };
            
            if (notif.type === 'comment' || notif.type === 'mention') {
              // Fetch the actual comment preview
              const { data: commentData } = await supabase
                .from('video_comments')
                .select('content')
                .eq('video_id', notif.reference_id)
                .eq('user_id', notif.sender_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
                
              reference_data.preview = commentData?.content || videoData.caption || 'Comentário';
            }
          }
        }
        
        return {
          ...notif,
          reference_data
        };
      }));

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
