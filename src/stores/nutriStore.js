import { create } from 'zustand';
import { supabase } from '../config/supabase';

const sampleFoods = [
  { name: 'Frango Grelhado', calories: 284, protein: 53, carbs: 0, fat: 6.2, fiber: 0, sodium: 82, weight: 200, icon: '🍗' },
  { name: 'Arroz Integral', calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sodium: 10, weight: 200, icon: '🍚' },
  { name: 'Brócolis', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5.1, sodium: 33, weight: 150, icon: '🥦' },
  { name: 'Batata Doce', calories: 180, protein: 2, carbs: 41, fat: 0.1, fiber: 6, sodium: 36, weight: 200, icon: '🍠' },
  { name: 'Ovo Cozido', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sodium: 124, weight: 100, icon: '🥚' },
  { name: 'Whey Protein', calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, sodium: 60, weight: 30, icon: '🥛' },
  { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sodium: 1, weight: 120, icon: '🍌' },
  { name: 'Salada Mista', calories: 45, protein: 2, carbs: 8, fat: 0.5, fiber: 3, sodium: 15, weight: 150, icon: '🥗' },
];

export const useNutriStore = create((set, get) => ({
  meals: [],
  dailyGoals: { calories: 2500, protein: 180, carbs: 300, fat: 70 },
  dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  lastScanResult: null,
  isScanning: false,
  scanHistory: [],

  simulateScan: () => {
    set({ isScanning: true });
    setTimeout(() => {
      const randomFoods = [];
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        const food = sampleFoods[Math.floor(Math.random() * sampleFoods.length)];
        randomFoods.push({ ...food, id: Date.now() + i });
      }
      const totalCal = randomFoods.reduce((s, f) => s + f.calories, 0);
      const totalProt = randomFoods.reduce((s, f) => s + f.protein, 0);
      const totalCarbs = randomFoods.reduce((s, f) => s + f.carbs, 0);
      const totalFat = randomFoods.reduce((s, f) => s + f.fat, 0);
      const result = {
        id: Date.now(),
        foods: randomFoods,
        totals: { calories: totalCal, protein: totalProt, carbs: totalCarbs, fat: totalFat },
        timestamp: new Date(),
      };
      set((state) => ({
        lastScanResult: result,
        isScanning: false,
        meals: [...state.meals, result],
        dailyTotals: {
          calories: state.dailyTotals.calories + totalCal,
          protein: state.dailyTotals.protein + totalProt,
          carbs: state.dailyTotals.carbs + totalCarbs,
          fat: state.dailyTotals.fat + totalFat,
        },
      }));
    }, 2000);
  },

  saveMealToSupabase: async (userId, mealData) => {
    try {
      await supabase.from('meals').insert({
        user_id: userId,
        foods: mealData.foods,
        totals: mealData.totals,
        scanned_at: new Date().toISOString(),
      });
    } catch (e) {
      console.log('Meal save skipped:', e.message);
    }
  },

  fetchMealHistory: async (userId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .gte('scanned_at', today.toISOString())
        .order('scanned_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const meals = data.map((m) => ({
          id: m.id,
          foods: m.foods,
          totals: m.totals,
          timestamp: new Date(m.scanned_at),
        }));

        const dailyTotals = meals.reduce(
          (acc, meal) => ({
            calories: acc.calories + (meal.totals?.calories || 0),
            protein: acc.protein + (meal.totals?.protein || 0),
            carbs: acc.carbs + (meal.totals?.carbs || 0),
            fat: acc.fat + (meal.totals?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        set({ meals, dailyTotals });
      }
    } catch {
      // Keep local state
    }
  },

  clearScanResult: () => set({ lastScanResult: null }),

  resetDaily: () => set({ dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, meals: [] }),
}));
