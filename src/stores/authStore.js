import { create } from 'zustand';
import { supabase } from '../config/supabase';

// Default profile shape matching Supabase columns exactly
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
  is_public: true,
};

// Track subscription to prevent duplicates
let authSubscription = null;

export const useAuthStore = create((set, get) => ({
  // State — single source of truth
  user: null,       // { uid, email } — minimal auth identity
  profile: null,    // full profile from Supabase profiles table
  isAuthenticated: false,
  isLoading: true,  // starts true, set to false once auth resolves
  error: null,

  // ─── Initialize auth ───────────────────────────────────────
  // Called once on App mount. Restores existing session, then
  // listens for future changes. Returns unsubscribe function.
  initAuth: () => {
    // Prevent duplicate listeners (React StrictMode calls useEffect twice)
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    // 1. Restore existing session first
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('getSession error:', error.message);
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
        return;
      }

      if (session?.user) {
        const profile = await get().fetchProfile(session.user.id);
        set({
          user: { uid: session.user.id, email: session.user.email },
          profile: profile || {
            ...defaultProfile,
            display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '',
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      }
    }).catch((err) => {
      console.error('Auth initialization failed:', err);
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    });

    // 2. Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignore INITIAL_SESSION — already handled by getSession above
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const profile = await get().fetchProfile(session.user.id);
            set({
              user: { uid: session.user.id, email: session.user.email },
              profile: profile || {
                ...defaultProfile,
                display_name: session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || '',
              },
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
        }
      }
    );

    authSubscription = subscription;
    return () => {
      subscription?.unsubscribe();
      authSubscription = null;
    };
  },

  // ─── Register ──────────────────────────────────────────────
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
      if (!user) throw new Error('Registro falhou — nenhum usuário retornado');

      // Profile is auto-created by the DB trigger, but we upsert to be safe
      const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
      const profileData = {
        ...defaultProfile,
        id: user.id,
        display_name: displayName,
        username,
        email: user.email,
      };

      await supabase.from('profiles').upsert(profileData);

      set({
        user: { uid: user.id, email: user.email },
        profile: profileData,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Login ─────────────────────────────────────────────────
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;
      if (!user) throw new Error('Login falhou — nenhum usuário retornado');

      const profile = await get().fetchProfile(user.id);

      // Update last active silently
      supabase
        .from('profiles')
        .update({ last_active_date: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {});

      set({
        user: { uid: user.id, email: user.email },
        profile: profile || { ...defaultProfile, display_name: user.email?.split('@')[0] || '' },
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  // ─── Logout ────────────────────────────────────────────────
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error.message);
    }
    // Always clear local state regardless of signOut result
    set({ user: null, profile: null, isAuthenticated: false, isLoading: false, error: null });
  },

  // ─── Fetch profile ─────────────────────────────────────────
  fetchProfile: async (uid) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.warn('fetchProfile error:', error.message);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  // ─── Update profile ────────────────────────────────────────
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { success: false, error: 'Não autenticado' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.uid);

      if (error) throw error;

      // Update local state immediately
      set((state) => ({
        profile: { ...state.profile, ...updates },
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ─── Clear error ───────────────────────────────────────────
  clearError: () => set({ error: null }),
}));
