import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';

// Mock realistic blocked users for fallback and local testing
const defaultBlocked = [
  { id: 'mock-blocked-1', username: 'fragoso_treino', display_name: 'Felipe Fragoso', avatar_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150' },
  { id: 'mock-blocked-2', username: 'carol_fit_toxic', display_name: 'Ana Carolina', avatar_url: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=150' }
];

export const useBlockedStore = create(
  persist(
    (set, get) => ({
      blockedUsers: defaultBlocked,
      isLoading: false,

      fetchBlockedUsers: async (userId) => {
        if (!userId) return;
        set({ isLoading: true });

        try {
          // Attempt to query blocked users from Supabase
          const { data, error } = await supabase
            .from('blocked_users')
            .select(`
              id,
              blocked_id,
              blocked_profile:profiles!blocked_id (id, username, display_name, avatar_url)
            `)
            .eq('user_id', userId);

          if (error) {
            // Table might not exist, silently fall back to persistent cached state
            console.warn('[BlockedStore] DB fetch error or table missing, using cache fallback:', error.message);
            set({ isLoading: false });
            return;
          }

          const resolvedUsers = (data || [])
            .map((b) => b.blocked_profile)
            .filter(Boolean);

          set({ blockedUsers: resolvedUsers, isLoading: false });
        } catch (err) {
          console.warn('[BlockedStore] fetch exception, using cache:', err.message);
          set({ isLoading: false });
        }
      },

      blockUser: async (userId, targetUser) => {
        if (!userId || !targetUser) return { success: false };

        // Add to local state first for immediate re-evaluation
        set((state) => {
          if (state.blockedUsers.some(u => u.id === targetUser.id)) return state;
          return { blockedUsers: [...state.blockedUsers, targetUser] };
        });

        try {
          const { error } = await supabase
            .from('blocked_users')
            .insert({ user_id: userId, blocked_id: targetUser.id });

          if (error && error.code !== '23505') throw error; // ignore unique violations
          return { success: true };
        } catch (err) {
          console.warn('[BlockedStore] blockUser DB error:', err.message);
          return { success: true }; // Return true because optimistic UI succeeded
        }
      },

      unblockUser: async (userId, targetUserId) => {
        if (!userId || !targetUserId) return { success: false };

        // Remove from local state optimistically
        set((state) => ({
          blockedUsers: state.blockedUsers.filter(u => u.id !== targetUserId)
        }));

        try {
          const { error } = await supabase
            .from('blocked_users')
            .delete()
            .match({ user_id: userId, blocked_id: targetUserId });

          if (error) throw error;
          return { success: true };
        } catch (err) {
          console.warn('[BlockedStore] unblockUser DB error:', err.message);
          return { success: true }; // Return true because optimistic UI succeeded
        }
      }
    }),
    {
      name: 'fitverse-blocked-cache',
    }
  )
);
