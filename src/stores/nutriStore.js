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
  error: null,
  scanHistory: [],

  scanMealWithVision: async (imageBase64, userId) => {
    set({ isScanning: true, error: null });
    try {
      const apiKey = import.meta.env.VITE_FIREWORKS_API_KEY || 'fw_AkFk3ruz6PN6Kqn49imypC';
      const model = import.meta.env.VITE_FIREWORKS_MODEL || 'accounts/fireworks/models/kimi-k2p6';
      
      const prompt = `Você é o assistente de nutrição do app FitVerse. Analise a imagem desta refeição e identifique os alimentos presentes.
Para cada alimento identificado, estime:
1. O nome do alimento em português (ex: 'Frango Grelhado', 'Arroz Integral').
2. O peso aproximado em gramas (ex: 150).
3. A quantidade aproximada de calorias (kcal), proteínas (g), carboidratos (g) e gorduras (g).
4. Um único emoji correspondente ao alimento (ex: 🥩, 🍚, 🥑, 🥦, 🍗, 🥚, 🥛, 🍌, 🥗, 🥪, 🍎, 🍕, etc.).

Importante: Você deve responder APENAS com um objeto JSON válido, sem qualquer tipo de formatação em markdown (como blocos \`\`\`json), explicações, introduções ou textos adicionais. O JSON deve seguir exatamente esta estrutura:
{
  "foods": [
    {
      "name": "Nome do Alimento",
      "weight": 150,
      "calories": 200,
      "protein": 20,
      "carbs": 10,
      "fat": 5,
      "icon": "🥩"
    }
  ],
  "totals": {
    "calories": 200,
    "protein": 20,
    "carbs": 10,
    "fat": 5
  }
}`;

      const response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4096,
          top_p: 1,
          top_k: 40,
          presence_penalty: 0,
          frequency_penalty: 0,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error from Fireworks API:', errorText);
        throw new Error('Falha ao comunicar com o servidor de IA. Por favor, tente novamente.');
      }

      const responseData = await response.json();
      let text = responseData.choices[0].message.content.trim();
      
      // Clean potential Markdown codeblock markers if model ignores instructions
      if (text.startsWith('```')) {
        text = text.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse model response text as JSON:', text, e);
        throw new Error('A IA não retornou um formato de dados válido. Tente outra foto.');
      }

      if (!parsedResult.foods || !parsedResult.totals) {
        throw new Error('Dados nutricionais incompletos fornecidos pela IA.');
      }

      const totalCal = parsedResult.totals.calories || 0;
      const totalProt = parsedResult.totals.protein || 0;
      const totalCarbs = parsedResult.totals.carbs || 0;
      const totalFat = parsedResult.totals.fat || 0;

      const result = {
        id: Date.now(),
        foods: parsedResult.foods.map((food, i) => ({
          ...food,
          id: Date.now() + i
        })),
        totals: { calories: totalCal, protein: totalProt, carbs: totalCarbs, fat: totalFat },
        timestamp: new Date(),
      };

      // Save to Supabase in background if user logged in
      if (userId) {
        get().saveMealToSupabase(userId, result);
      }

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

      return result;
    } catch (err) {
      console.error('Scan meal with vision exception:', err);
      set({ error: err.message, isScanning: false });
      throw err;
    }
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

  clearScanResult: () => set({ lastScanResult: null, error: null }),

  resetDaily: () => set({ dailyTotals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, meals: [] }),
}));
