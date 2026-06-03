import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';

// Wraps any promise with a timeout — prevents infinite hangs on blocked Supabase queries
const withTimeout = (promise, ms = 10000, label = 'query') =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`[Timeout] ${label} não respondeu em ${ms/1000}s. Verifique sua conexão e as políticas RLS no Supabase.`)), ms)
    ),
  ]);

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

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State — single source of truth
      user: null,          // { uid, email } — minimal auth identity
      profile: null,       // full profile from Supabase profiles table
      isAuthenticated: false,
      isLoading: true,     // true until the FIRST auth event arrives from Supabase (unless cached)
      isProfileLoading: false, // true while fetching profile from DB (separate from auth)
      error: null,

  // ─── Initialize Auth ───────────────────────────────────────
  // IMPORTANT: Returns the unsubscribe function — App.jsx calls it on unmount.
  initAuth: () => {
    console.log('[Auth] Initializing auth listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Event: ${event} | Session: ${!!session} | User: ${session?.user?.id ?? 'none'}`);

        if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, isAuthenticated: false, isLoading: false, isProfileLoading: false });
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery if needed
          set({ isLoading: false });
          return;
        }

        // INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
        if (session?.user) {
          const uid = session.user.id;
          const email = session.user.email;

          // ── STEP 1: Immediately mark auth as resolved so SplashScreen can navigate ──
          // Use the cached profile if it belongs to the current user, otherwise use a placeholder.
          const currentProfile = get().profile;
          const placeholderProfile = currentProfile?.id === uid ? currentProfile : {
            ...defaultProfile,
            display_name: session.user.user_metadata?.display_name || email?.split('@')[0] || 'Usuário',
            username: email?.split('@')[0] || 'user',
          };

          set({
            user: { uid, email },
            profile: placeholderProfile,
            isAuthenticated: true,
            isLoading: false,        // ← Splash can navigate NOW
            isProfileLoading: true,  // ← Profile fetch starts in background
          });

          // ── STEP 2: Fetch real profile from DB in background ──
          console.log('[Auth] Fetching profile for:', uid);
          const profile = await get()._fetchOrCreateProfile(uid, email, session.user.user_metadata);
          console.log('[Auth] Profile loaded:', profile?.display_name);

          // Only update if user is still logged in (could have signed out in the meantime)
          if (get().user?.uid === uid) {
            set({ profile, isProfileLoading: false });
          }
        } else {
          // INITIAL_SESSION with no session = logged out state
          set({ user: null, profile: null, isAuthenticated: false, isLoading: false, isProfileLoading: false });
        }
      }
    );

    // Return unsubscribe so App.jsx can clean up on unmount
    return () => {
      console.log('[Auth] Unsubscribing auth listener.');
      subscription.unsubscribe();
    };
  },

  // ─── Internal: fetch profile, create if missing ────────────
  _fetchOrCreateProfile: async (uid, email, metadata = {}) => {
    try {
      // Use withTimeout to prevent app hang if RLS/DB is locked
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', uid).single(),
        10000,
        'fetchProfile'
      );

      if (error && error.code === 'PGRST116') {
        // Row not found — create it manually (trigger may not have run yet)
        console.warn('[Auth] Profile not found, creating...');
        const displayName = metadata?.display_name || email?.split('@')[0] || 'Usuário';
        const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 9000 + 1000);

        const newProfile = {
          ...defaultProfile,
          id: uid,
          email,
          display_name: displayName,
          username,
        };

        const { data: created, error: createError } = await withTimeout(
          supabase.from('profiles').upsert(newProfile).select().single(),
          10000,
          'createProfile'
        );

        if (createError) {
          console.error('[Auth] Failed to create profile:', createError.message);
          return { ...defaultProfile, id: uid, display_name: displayName, username };
        }
        return created;
      }

      if (error) {
        console.error('[Auth] fetchProfile error:', error.code, error.message);
        return { ...defaultProfile, id: uid };
      }

      return data;
    } catch (err) {
      console.error('[Auth] _fetchOrCreateProfile exception:', err.message);
      return { ...defaultProfile, id: uid };
    }
  },

  // ─── Register ──────────────────────────────────────────────
  register: async (email, password, displayName) => {
    set({ error: null });
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
      if (!user) throw new Error('Registro falhou — nenhum usuário retornado.');

      // If email confirmation is disabled, onAuthStateChange fires SIGNED_IN automatically.
      // If email confirmation is required, data.session will be null.
      const needsConfirmation = !data.session;
      if (needsConfirmation) {
        return { success: true, needsConfirmation: true };
      }

      // onAuthStateChange will handle state update via SIGNED_IN event
      return { success: true };
    } catch (error) {
      console.error('[Auth] Register error:', error.message);
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  // ─── Login ─────────────────────────────────────────────────
  login: async (email, password) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // onAuthStateChange fires SIGNED_IN automatically and handles state.
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error.message);
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  // ─── Logout ────────────────────────────────────────────────
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[Auth] Logout error:', error.message);
    }
    // onAuthStateChange fires SIGNED_OUT. We also clear locally for immediacy.
    set({ user: null, profile: null, isAuthenticated: false, isLoading: false, error: null });
  },

  // ─── Update profile ────────────────────────────────────────
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user?.uid) {
      console.error('[Auth] updateProfile called without authenticated user.');
      return { success: false, error: 'Não autenticado. Faça login novamente.' };
    }

    // Optimistically update local profile state immediately
    // This makes the app fully resilient and functional locally if Supabase tables/columns are missing
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    }));

    try {
      console.log('[Auth] Updating profile for', user.uid, updates);

      // withTimeout prevents infinite hang when RLS blocks a query silently
      const { error } = await withTimeout(
        supabase.from('profiles').update(updates).eq('id', user.uid),
        10000,
        'updateProfile'
      );

      if (error) {
        console.warn('[Auth] updateProfile DB warning (falling back to local state):', error.code, error.message);
        // Do not throw or block the update, since local state is already updated
        return { success: true, dbWarning: error.message };
      }

      console.log('[Auth] Profile updated successfully in DB.');
      return { success: true };
    } catch (error) {
      console.warn('[Auth] updateProfile catch warning (falling back to local state):', error.message);
      return { success: true, dbWarning: error.message };
    }
  },

  // ─── Refresh profile from DB ───────────────────────────────
  refreshProfile: async () => {
    const { user } = get();
    if (!user?.uid) return;
    set({ isProfileLoading: true });
    const profile = await get()._fetchOrCreateProfile(user.uid, user.email);
    set({ profile, isProfileLoading: false });
  },

  // ─── Clear error ───────────────────────────────────────────
  clearError: () => set({ error: null }),
    }),
    {
      name: 'fitverse-auth-cache', // unique name for localStorage
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile, 
        isAuthenticated: state.isAuthenticated 
      }),
      // On rehydration, if we have a user in cache, immediately unset isLoading
      // so the UI renders instantly. Supabase auth listener will confirm or log out in background.
      onRehydrateStorage: () => (state) => {
        if (state && state.isAuthenticated) {
          state.isLoading = false;
        }
      }
    }
  )
);
