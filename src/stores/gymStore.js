import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useAuthStore } from './authStore';

const LOCAL_STORAGE_CHECKINS_KEY = 'fitverse-gym-checkins-fallback';

const defaultGyms = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'FitVerse Central', address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP', qr_code_token: 'gym_central_token' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Alpha Fitness', address: 'Av. das Américas, 500 - Barra da Tijuca, Rio de Janeiro - RJ', qr_code_token: 'gym_alpha_token' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Iron Room Gym', address: 'Rua Sergipe, 300 - Savassi, Belo Horizonte - MG', qr_code_token: 'gym_iron_token' }
];

export const useGymStore = create((set, get) => ({
  gymsList: defaultGyms,
  checkins: [],
  isLoading: false,
  error: null,

  // Load gyms list
  fetchGyms: async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        set({ gymsList: data });
      } else {
        set({ gymsList: defaultGyms });
      }
    } catch (err) {
      console.warn('[GymStore] fetchGyms database query failed, using mock defaults:', err.message);
      set({ gymsList: defaultGyms });
    }
  },

  // Load checkins history for user
  fetchUserCheckins: async (userId) => {
    if (!userId) return [];
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('gym_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') { // Table not found
          return get()._loadCheckinsFromLocalStorage(userId);
        }
        throw error;
      }

      set({ checkins: data || [], isLoading: false });
      return data || [];
    } catch (err) {
      console.error('[GymStore] fetchUserCheckins DB error:', err.message);
      return get()._loadCheckinsFromLocalStorage(userId);
    }
  },

  // Link user to gym
  linkUserToGym: async (userId, gymId) => {
    if (!userId) return;
    try {
      const authState = useAuthStore.getState();
      await authState.updateProfile({ gym_id: gymId });
    } catch (err) {
      console.error('[GymStore] linkUserToGym failed:', err);
    }
  },

  // Toggle/Set Manager role for testing
  toggleGymManagerRole: async (userId, gymId, enable = true) => {
    if (!userId) return;
    try {
      const authState = useAuthStore.getState();
      await authState.updateProfile({
        is_gym_manager: enable,
        managed_gym_id: enable ? gymId : null
      });
    } catch (err) {
      console.error('[GymStore] toggleGymManagerRole failed:', err);
    }
  },

  // Perform QR Code checkin scan
  performGymCheckin: async (userId, qrCodeToken) => {
    if (!userId) throw new Error('Usuário não autenticado.');
    set({ isLoading: true, error: null });

    // 1. Validate the token
    const gym = get().gymsList.find(g => g.qr_code_token === qrCodeToken);
    if (!gym) {
      const errText = 'QR Code inválido ou não pertencente a nenhuma academia cadastrada.';
      set({ error: errText, isLoading: false });
      throw new Error(errText);
    }

    try {
      // 2. Fetch checkin history to check daily rule and calculate streak
      let userCheckins = [];
      try {
        const { data, error } = await supabase
          .from('gym_checkins')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        userCheckins = data || [];
      } catch (dbErr) {
        console.warn('[GymStore] DB query for checkins failed, using local storage fallback for verification...');
        userCheckins = get()._getLocalCheckins(userId);
      }

      // Check if user already checked in TODAY
      const todayStr = new Date().toLocaleDateString('pt-BR');
      const hasCheckedInToday = userCheckins.some(ci => {
        const ciDate = new Date(ci.created_at);
        return ciDate.toLocaleDateString('pt-BR') === todayStr;
      });

      if (hasCheckedInToday) {
        const errText = 'Você já realizou check-in hoje. Limite de 1 check-in diário por usuário.';
        set({ error: errText, isLoading: false });
        throw new Error(errText);
      }

      // 3. Calculate new streak
      const authState = useAuthStore.getState();
      const currentStreak = authState.profile?.streak || 0;
      const lastCheckIn = userCheckins[0]; // Ordered by created_at desc, so index 0 is most recent
      const lastCheckInDateStr = lastCheckIn ? lastCheckIn.created_at : null;

      const newStreak = get()._calculateStreak(lastCheckInDateStr, currentStreak);

      // 4. Save checkin row
      const newCheckinId = `checkin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newCheckin = {
        id: newCheckinId,
        user_id: userId,
        gym_id: gym.id,
        created_at: new Date().toISOString()
      };

      let dbSaved = false;
      try {
        const { error: insertError } = await supabase
          .from('gym_checkins')
          .insert(newCheckin);
        if (insertError) throw insertError;
        dbSaved = true;
      } catch (insertErr) {
        console.warn('[GymStore] Could not insert checkin into DB, saving locally:', insertErr.message);
      }

      // Save locally (always do it for fallback consistency)
      const localList = [newCheckin, ...get()._getLocalCheckins(userId)];
      localStorage.setItem(`${LOCAL_STORAGE_CHECKINS_KEY}_${userId}`, JSON.stringify(localList));

      // 5. Update user profile details (streak and gym_id link)
      const profileUpdates = {
        streak: newStreak,
        last_active_date: new Date().toISOString(),
        gym_id: gym.id
      };
      await authState.updateProfile(profileUpdates);

      // Refresh state
      set({
        checkins: dbSaved ? [newCheckin, ...get().checkins] : localList,
        isLoading: false
      });

      return { success: true, gym, newStreak };

    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  // Internal: streak calculator
  _calculateStreak: (lastCheckInDateStr, currentStreak, todayDate = new Date()) => {
    if (!lastCheckInDateStr) {
      // First checkin: always starts at 1, even on Sunday!
      return 1;
    }

    const lastDate = new Date(lastCheckInDateStr);
    
    // Normalize to local midnight
    const last = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    
    const diffTime = today - last;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      // Already checked in today, keep current streak
      return currentStreak;
    }
    
    // Check if skipped any non-Sunday days between last checkin and today (exclusive)
    let hasSkippedWeekday = false;
    for (let i = 1; i < diffDays; i++) {
      const checkDay = new Date(last.getTime() + i * 24 * 60 * 60 * 1000);
      if (checkDay.getDay() !== 0) { // 0 is Sunday
        hasSkippedWeekday = true;
        break;
      }
    }
    
    if (hasSkippedWeekday) {
      // Skipped a weekday or Saturday, streak resets to 1
      return 1;
    } else {
      // Consecutive checkin (possibly skipping only Sunday)
      return currentStreak + 1;
    }
  },

  // Local storage helpers
  _loadCheckinsFromLocalStorage: (userId) => {
    const list = get()._getLocalCheckins(userId);
    set({ checkins: list, isLoading: false });
    return list;
  },

  _getLocalCheckins: (userId) => {
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_CHECKINS_KEY}_${userId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}));
