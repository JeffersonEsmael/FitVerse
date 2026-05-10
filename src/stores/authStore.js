import { create } from 'zustand';
import { supabase } from '../config/supabase';

// Default user profile structure
const defaultProfile = {
  display_name: '',
  username: '',
  avatar_url: '',
  bio: '',
  fitness_goals: [],
  level: 1,
  xp: 0,
  streak: 0,
  last_active_date: null,
  followers: 0,
  following: 0,
  total_videos: 0,
  total_likes: 0,
  rank_position: null,
  badges: [],
};

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize auth listener
  initAuth: () => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user = session.user;
          // Fetch user profile from Supabase
          const profile = await get().fetchProfile(user.id);
          set({
            user: {
              uid: user.id,
              email: user.email,
              displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
              photoURL: user.user_metadata?.avatar_url || '',
            },
            profile: profile || {
              ...defaultProfile,
              display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || '',
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      }
    );

    // Return unsubscribe function
    return () => subscription?.unsubscribe();
  },

  // Register with email
  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (error) throw error;

      const user = data.user;
      if (user) {
        // Create user profile in Supabase
        const username = displayName.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
        const profileData = {
          id: user.id,
          display_name: displayName,
          username,
          email: user.email,
          ...defaultProfile,
          display_name: displayName,
          username,
        };

        await supabase.from('profiles').upsert(profileData);

        set({
          user: { uid: user.id, email: user.email, displayName },
          profile: profileData,
          isAuthenticated: true,
          isLoading: false,
        });
      }

      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // Login with email
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (user) {
        const profile = await get().fetchProfile(user.id);

        // Update last active
        await supabase
          .from('profiles')
          .update({ last_active_date: new Date().toISOString() })
          .eq('id', user.id);

        set({
          user: {
            uid: user.id,
            email: user.email,
            displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
            photoURL: user.user_metadata?.avatar_url || '',
          },
          profile: profile || defaultProfile,
          isAuthenticated: true,
          isLoading: false,
        });
      }

      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // Login with Google (Supabase OAuth)
  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // Login with Apple (Supabase OAuth)
  loginWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // Demo login (skip Supabase auth for demo purposes)
  demoLogin: () => {
    const demoProfile = {
      ...defaultProfile,
      display_name: 'FitUser',
      username: 'fituser',
      bio: '💪 Fitness enthusiast | 🏋️ 5x/week | 🥗 Clean eating',
      level: 12,
      xp: 2450,
      streak: 7,
      followers: 342,
      following: 128,
      total_videos: 24,
      total_likes: 1820,
      rank_position: 5,
      fitness_goals: ['Ganho muscular', 'Definição', 'Saúde'],
      badges: ['streak7', 'firstPost', 'top10'],
    };

    set({
      user: { uid: 'demo-user', email: 'demo@fitverse.com', displayName: 'FitUser' },
      profile: demoProfile,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  // Logout
  logout: async () => {
    try {
      if (get().user?.uid !== 'demo-user') {
        await supabase.auth.signOut();
      }
      set({ user: null, profile: null, isAuthenticated: false });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Fetch profile from Supabase
  fetchProfile: async (uid) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  },

  // Update profile
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user || user.uid === 'demo-user') {
      // Demo mode — just update local state
      set((state) => ({
        profile: { ...state.profile, ...updates },
      }));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.uid);

      if (error) throw error;

      set((state) => ({
        profile: { ...state.profile, ...updates },
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
