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
      set({ notifications: data || [] });
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
