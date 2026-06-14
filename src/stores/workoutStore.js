import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '../utils/localCache';

// Mock/Default workout series to populate for first-time users or as a starter
const defaultWorkouts = [
  {
    id: 'ws_default_1',
    name: 'Hipertrofia - Push/Pull/Legs',
    weekly_frequency: '3x por semana',
    progress_completed: 18,
    progress_total: 30,
    is_active: true,
    exercises: [
      { id: 'ex_1', name: 'Supino Reto (Barra)', sets: 4, reps: '8-10', weight: 80, done_today: false },
      { id: 'ex_2', name: 'Desenvolvimento Militar', sets: 4, reps: '8-10', weight: 45, done_today: false },
      { id: 'ex_3', name: 'Tríceps Testa', sets: 3, reps: '10-12', weight: 30, done_today: false },
      { id: 'ex_4', name: 'Elevação Lateral', sets: 4, reps: '12-15', weight: 14, done_today: false },
      { id: 'ex_1_5', name: 'Supino Inclinado (Halteres)', sets: 4, reps: '8-10', weight: 30, done_today: false },
      { id: 'ex_1_6', name: 'Tríceps Corda', sets: 3, reps: '12-15', weight: 20, done_today: false },
      { id: 'ex_1_7', name: 'Crucifixo Reto (Halteres)', sets: 3, reps: '10-12', weight: 18, done_today: false },
      { id: 'ex_1_8', name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', weight: 22, done_today: false },
    ]
  },
  {
    id: 'ws_default_2',
    name: 'Condicionamento & Emagrecimento',
    weekly_frequency: '4x por semana',
    progress_completed: 5,
    progress_total: 20,
    is_active: false,
    exercises: [
      { id: 'ex_5', name: 'Agachamento Livre', sets: 4, reps: '12', weight: 60, done_today: false },
      { id: 'ex_6', name: 'Puxada Pulley', sets: 4, reps: '12', weight: 50, done_today: false },
      { id: 'ex_7', name: 'Rosca Direta (W)', sets: 3, reps: '10', weight: 28, done_today: false },
      { id: 'ex_8', name: 'Flexão de Braços', sets: 3, reps: 'Falha', weight: 0, done_today: false },
      { id: 'ex_2_5', name: 'Remada Curvada', sets: 4, reps: '10', weight: 50, done_today: false },
      { id: 'ex_2_6', name: 'Rosca Alternada', sets: 3, reps: '12', weight: 14, done_today: false },
      { id: 'ex_2_7', name: 'Cadeira Extensora', sets: 4, reps: '12', weight: 60, done_today: false },
      { id: 'ex_2_8', name: 'Mesa Flexora', sets: 4, reps: '12', weight: 40, done_today: false },
    ]
  }
];

const LOCAL_STORAGE_KEY = 'fitverse-workout-series-fallback';

export const useWorkoutStore = create((set, get) => ({
  seriesList: [],
  activeSeriesId: null,
  isLoading: false,
  error: null,

  // Load workout series for the user (local-first)
  fetchSeries: async (userId) => {
    if (!userId) return;

    // Check cache first — only hit Supabase if cache is stale
    const cached = cacheGet(CACHE_KEYS.workoutSeries(userId));
    if (cached && cached.length > 0) {
      const active = cached.find(s => s.is_active) || cached[0];
      set({
        seriesList: cached,
        activeSeriesId: active ? active.id : null,
        isLoading: false
      });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Query from Supabase
      const { data, error } = await supabase
        .from('workout_series')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        // Table not migrated yet? Fallback to localStorage
        if (error.code === '42P01') {
          console.warn('[WorkoutStore] Table workout_series not found. Falling back to localStorage...');
          get()._loadFromLocalStorage(userId);
          return;
        }
        throw error;
      }

      if (data && data.length > 0) {
        const list = data.map(item => ({
          id: item.id,
          name: item.name,
          weekly_frequency: item.weekly_frequency,
          progress_completed: item.progress_completed || 0,
          progress_total: item.progress_total || 30,
          is_active: item.is_active || false,
          is_public: item.is_public !== false,
          copies_count: item.copies_count || 0,
          exercises: Array.isArray(item.exercises) ? item.exercises : [],
        }));

        const active = list.find(s => s.is_active) || list[0];
        if (active && !active.is_active) {
          active.is_active = true;
        }

        set({
          seriesList: list,
          activeSeriesId: active ? active.id : null,
          isLoading: false
        });

        // Cache for future visits
        cacheSet(CACHE_KEYS.workoutSeries(userId), list, CACHE_TTL.WORKOUT_SERIES);
      } else {
        // User has no series, initialize with defaults
        console.log('[WorkoutStore] No series found in DB, creating defaults...');
        const initialList = defaultWorkouts.map(ws => ({
          ...ws,
          id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }));
        initialList[0].is_active = true;

        set({
          seriesList: initialList,
          activeSeriesId: initialList[0].id,
          isLoading: false
        });

        // Write defaults to Supabase in background
        for (const ws of initialList) {
          await supabase.from('workout_series').insert({
            id: ws.id,
            user_id: userId,
            name: ws.name,
            weekly_frequency: ws.weekly_frequency,
            progress_completed: ws.progress_completed,
            progress_total: ws.progress_total,
            exercises: ws.exercises,
            is_active: ws.is_active,
            is_public: true,
            copies_count: 0
          });
        }
      }
    } catch (err) {
      console.error('[WorkoutStore] fetchSeries error:', err.message);
      // Fallback on general connection error
      get()._loadFromLocalStorage(userId);
    }
  },

  // Internal: Load from local storage
  _loadFromLocalStorage: (userId) => {
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`);
      if (cached) {
        const list = JSON.parse(cached).map(s => ({
          ...s,
          is_public: s.is_public !== false,
          copies_count: s.copies_count || 0
        }));
        const active = list.find(s => s.is_active) || list[0];
        set({
          seriesList: list,
          activeSeriesId: active ? active.id : null,
          isLoading: false
        });
      } else {
        // Initialize local defaults
        const initialList = defaultWorkouts.map(ws => ({
          ...ws,
          id: `ws_local_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          is_public: true,
          copies_count: 0
        }));
        initialList[0].is_active = true;
        
        localStorage.setItem(`${LOCAL_STORAGE_KEY}_${userId}`, JSON.stringify(initialList));
        set({
          seriesList: initialList,
          activeSeriesId: initialList[0].id,
          isLoading: false
        });
      }
    } catch (e) {
      console.error('[WorkoutStore] LocalStorage load failed:', e);
      set({ seriesList: defaultWorkouts, activeSeriesId: defaultWorkouts[0].id, isLoading: false });
    }
  },

  // Internal: Save to local storage
  _saveToLocalStorage: (userId, list) => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${userId}`, JSON.stringify(list));
    } catch (e) {
      console.error('[WorkoutStore] LocalStorage save failed:', e);
    }
  },

  // Create a new series
  createSeries: async (userId, name, frequency, totalWorkouts, initialExercises = [], isPublic = true) => {
    if (!userId) return;
    const newId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Set all other series as inactive
    const updatedList = get().seriesList.map(s => ({ ...s, is_active: false }));
    
    const newSeries = {
      id: newId,
      name,
      weekly_frequency: frequency || '3x por semana',
      progress_completed: 0,
      progress_total: totalWorkouts || 30,
      is_active: true,
      is_public: isPublic,
      copies_count: 0,
      exercises: initialExercises,
    };

    const newList = [...updatedList, newSeries];
    
    set({
      seriesList: newList,
      activeSeriesId: newId
    });

    // Save locally
    get()._saveToLocalStorage(userId, newList);

    // Save to Supabase
    try {
      // First de-activate others in DB
      await supabase
        .from('workout_series')
        .update({ is_active: false })
        .eq('user_id', userId);

      await supabase.from('workout_series').insert({
        id: newId,
        user_id: userId,
        name: newSeries.name,
        weekly_frequency: newSeries.weekly_frequency,
        progress_completed: 0,
        progress_total: newSeries.progress_total,
        exercises: newSeries.exercises,
        is_active: true,
        is_public: isPublic,
        copies_count: 0
      });
    } catch (err) {
      console.warn('[WorkoutStore] createSeries DB insert failed, saved to local cache:', err.message);
    }
  },

  // Update series settings/exercises
  updateSeries: async (userId, seriesId, updates) => {
    if (!userId) return;

    const newList = get().seriesList.map(s => {
      if (s.id === seriesId) {
        const merged = { ...s, ...updates };
        // Clean up done_today check if exercises list changed structurally
        return merged;
      }
      return s;
    });

    set({ seriesList: newList });
    get()._saveToLocalStorage(userId, newList);

    try {
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.weekly_frequency !== undefined) dbUpdates.weekly_frequency = updates.weekly_frequency;
      if (updates.progress_completed !== undefined) dbUpdates.progress_completed = updates.progress_completed;
      if (updates.progress_total !== undefined) dbUpdates.progress_total = updates.progress_total;
      if (updates.exercises !== undefined) dbUpdates.exercises = updates.exercises;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.is_public !== undefined) dbUpdates.is_public = updates.is_public;
      if (updates.copies_count !== undefined) dbUpdates.copies_count = updates.copies_count;

      await supabase
        .from('workout_series')
        .update(dbUpdates)
        .eq('id', seriesId)
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[WorkoutStore] updateSeries DB failed, cached locally:', err.message);
    }
  },

  // Set active series
  setActiveSeries: async (userId, seriesId) => {
    if (!userId) return;

    const newList = get().seriesList.map(s => ({
      ...s,
      is_active: s.id === seriesId
    }));

    set({
      seriesList: newList,
      activeSeriesId: seriesId
    });
    
    get()._saveToLocalStorage(userId, newList);

    try {
      // Set all user series to inactive first
      await supabase
        .from('workout_series')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Set selected series to active
      await supabase
        .from('workout_series')
        .update({ is_active: true })
        .eq('id', seriesId)
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[WorkoutStore] setActiveSeries DB failed:', err.message);
    }
  },

  // Toggle exercise done
  toggleExerciseDone: async (userId, seriesId, exerciseId) => {
    if (!userId) return;

    const series = get().seriesList.find(s => s.id === seriesId);
    if (!series) return;

    const updatedExercises = series.exercises.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, done_today: !ex.done_today };
      }
      return ex;
    });

    await get().updateSeries(userId, seriesId, { exercises: updatedExercises });
  },

  // Increment workout progress (User completed their session of the day)
  incrementWorkoutProgress: async (userId, seriesId) => {
    if (!userId) return;

    const series = get().seriesList.find(s => s.id === seriesId);
    if (!series) return;

    const currentCompleted = series.progress_completed || 0;
    const total = series.progress_total || 30;
    const nextCompleted = Math.min(total, currentCompleted + 1);

    // Reset exercises status done_today for next workout
    const resetExercises = series.exercises.map(ex => ({ ...ex, done_today: false }));

    await get().updateSeries(userId, seriesId, {
      progress_completed: nextCompleted,
      exercises: resetExercises
    });

    // Reward the user with some XP for completing a workout!
    try {
      const { useAuthStore } = await import('./authStore');
      const authState = useAuthStore.getState();
      const profile = authState.profile;
      if (profile) {
        const currentXp = profile.xp || 0;
        const newXp = currentXp + 150; // +150 XP per workout!
        const newLevel = Math.floor(newXp / 1000) + 1;
        await authState.updateProfile({ xp: newXp, level: newLevel });
      }
    } catch (xpErr) {
      console.warn('[WorkoutStore] Failed to reward XP:', xpErr.message);
    }
  },

  // Delete a series
  deleteSeries: async (userId, seriesId) => {
    if (!userId) return;

    const newList = get().seriesList.filter(s => s.id !== seriesId);
    let nextActiveId = get().activeSeriesId;

    if (get().activeSeriesId === seriesId) {
      // If we deleted the active one, make the first remaining active
      if (newList.length > 0) {
        newList[0].is_active = true;
        nextActiveId = newList[0].id;
      } else {
        nextActiveId = null;
      }
    }

    set({
      seriesList: newList,
      activeSeriesId: nextActiveId
    });

    get()._saveToLocalStorage(userId, newList);

    try {
      await supabase
        .from('workout_series')
        .delete()
        .eq('id', seriesId)
        .eq('user_id', userId);

      if (nextActiveId) {
        await supabase
          .from('workout_series')
          .update({ is_active: true })
          .eq('id', nextActiveId)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.warn('[WorkoutStore] deleteSeries DB failed:', err.message);
    }
  }
}));
