import { create } from 'zustand';
import { supabase } from '../config/supabase';

const sampleVideos = [
  {
    id: 'v1', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    userId: 'u1', username: 'fitpro_lucas', userAvatar: '', displayName: 'Lucas Trainer',
    caption: 'Treino de peito completo! 💪🔥', hashtags: ['treino', 'peito', 'academia'],
    category: 'treino', shapes: 1243, boosts: 85, comments: 89, shares: 34, views: 8500, gym_bag_saves: 150,
    hasShaped: false, hasBoosted: false, inGymBag: false, createdAt: new Date('2026-05-07'),
  },
  {
    id: 'v2', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    userId: 'u2', username: 'nutri_ana', userAvatar: '', displayName: 'Ana Nutrição',
    caption: 'Refeição pré-treino favorita! 🥗', hashtags: ['dieta', 'nutrição', 'prétreino'],
    category: 'dieta', shapes: 2100, boosts: 120, comments: 156, shares: 78, views: 15200, gym_bag_saves: 420,
    hasShaped: false, hasBoosted: false, inGymBag: false, createdAt: new Date('2026-05-06'),
  },
  {
    id: 'v3', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    userId: 'u3', username: 'gym_rafael', userAvatar: '', displayName: 'Rafael GymBro',
    caption: 'Evolução de 6 meses! 🏋️‍♂️ Nunca desista!', hashtags: ['evolução', 'motivação'],
    category: 'evolução', shapes: 5400, boosts: 540, comments: 320, shares: 210, views: 42000, gym_bag_saves: 850,
    hasShaped: false, hasBoosted: false, inGymBag: false, createdAt: new Date('2026-05-05'),
  },
  {
    id: 'v4', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    userId: 'u4', username: 'coach_maria', userAvatar: '', displayName: 'Maria Coach',
    caption: 'Dia de perna! 🦵🔥 Comenta aí!', hashtags: ['perna', 'legday', 'treino'],
    category: 'treino', shapes: 3200, boosts: 195, comments: 245, shares: 90, views: 22000, gym_bag_saves: 300,
    hasShaped: false, hasBoosted: false, inGymBag: false, createdAt: new Date('2026-05-04'),
  },
  {
    id: 'v5', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    userId: 'u5', username: 'fit_pedro', userAvatar: '', displayName: 'Pedro Fitness',
    caption: 'Rotina matinal 🌅 5h sem desculpas!', hashtags: ['rotina', 'disciplina'],
    category: 'rotina', shapes: 1800, boosts: 42, comments: 102, shares: 55, views: 12000, gym_bag_saves: 80,
    hasShaped: false, hasBoosted: false, inGymBag: false, createdAt: new Date('2026-05-03'),
  },
  {
    id: 'v6', videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    userId: 'u6', username: 'julia_fit', userAvatar: '', displayName: 'Julia Fit',
    caption: 'Desafio 30 dias de abdominal! 🏆', hashtags: ['desafio', 'abdominal', '30dias'],
    category: 'desafio', shapes: 4100, boosts: 280, comments: 380, shares: 165, views: 31000, gym_bag_saves: 950,
    hasShaped: false, hasBoosted: false, inGymBag: false, createdAt: new Date('2026-05-02'),
  },
];

export const useFeedStore = create((set, get) => ({
  videos: sampleVideos,
  currentIndex: 0,
  isLoading: false,
  hasMore: true,
  activeTab: 'forYou',

  setCurrentIndex: (index) => set({ currentIndex: index }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleShape: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, hasShaped: !v.hasShaped, shapes: v.hasShaped ? Math.max(v.shapes - 1, 0) : v.shapes + 1 }
          : v
      ),
    }));

    const video = get().videos.find((v) => v.id === videoId);
    if (video && !video.id.startsWith('v')) {
      supabase.rpc('toggle_video_shape', { p_video_id: videoId }).catch(() => {});
    }
  },

  toggleBoost: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, hasBoosted: !v.hasBoosted, boosts: v.hasBoosted ? Math.max(v.boosts - 1, 0) : v.boosts + 1 }
          : v
      ),
    }));

    const video = get().videos.find((v) => v.id === videoId);
    if (video && !video.id.startsWith('v')) {
      supabase.rpc('toggle_video_boost', { p_video_id: videoId }).catch(() => {});
    }
  },

  toggleGymBag: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, inGymBag: !v.inGymBag, gym_bag_saves: v.inGymBag ? Math.max(v.gym_bag_saves - 1, 0) : v.gym_bag_saves + 1 }
          : v
      ),
    }));

    const video = get().videos.find((v) => v.id === videoId);
    if (video && !video.id.startsWith('v')) {
      supabase.rpc('toggle_video_gym_bag', { p_video_id: videoId }).catch(() => {});
    }
  },

  incrementViews: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, views: v.views + 1 } : v
      ),
    }));
  },

  fetchVideos: async (loadMore = false) => {
    set({ isLoading: true });
    try {
      const page = loadMore ? Math.floor(get().videos.length / 10) : 0;
      
      // Use the new RPC to get videos along with user interaction states
      const { data, error } = await supabase
        .rpc('get_feed_videos', { 
          p_limit: 10, 
          p_offset: page * 10 
        });

      if (error) {
        // Fallback to table select if RPC fails or doesn't exist yet
        console.warn('RPC get_feed_videos failed, trying direct table select', error);
        throw error;
      }

      if (!data || data.length === 0) {
        set({ hasMore: false, isLoading: false });
        return;
      }

      // Map Supabase columns to our format
      const newVideos = data.map((v) => ({
        id: v.id,
        videoUrl: v.video_url,
        userId: v.user_id,
        username: v.username,
        userAvatar: v.user_avatar || '',
        displayName: v.display_name,
        caption: v.caption || '',
        hashtags: v.hashtags || [],
        category: v.category || 'geral',
        shapes: v.shapes || 0,
        boosts: v.boosts || 0,
        gym_bag_saves: v.gym_bag_saves || 0,
        comments: v.comments || 0,
        shares: v.shares || 0,
        views: v.views || 0,
        hasShaped: v.has_shaped || false,
        hasBoosted: v.has_boosted || false,
        inGymBag: v.in_gym_bag || false,
        createdAt: new Date(v.created_at),
      }));

      set((state) => ({
        videos: loadMore ? [...state.videos, ...newVideos] : [...sampleVideos, ...newVideos],
        isLoading: false,
      }));
    } catch (error) {
      console.log('Using sample videos due to error:', error.message);
      set({ isLoading: false });
    }
  },

  uploadVideo: async (file, metadata) => {
    set({ isLoading: true });
    try {
      // Upload video to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // Create video record in database
      const videoData = {
        video_url: publicUrl,
        user_id: metadata.userId,
        username: metadata.username,
        user_avatar: metadata.userAvatar || '',
        display_name: metadata.displayName,
        caption: metadata.caption || '',
        hashtags: metadata.hashtags || [],
        category: metadata.category || 'geral',
        shapes: 0,
        boosts: 0,
        gym_bag_saves: 0,
        comments: 0,
        shares: 0,
        views: 0,
      };

      const { data: insertedVideo, error: insertError } = await supabase
        .from('videos')
        .insert(videoData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      set((state) => ({
        videos: [{
          id: insertedVideo.id,
          videoUrl: publicUrl,
          ...metadata,
          shapes: 0, boosts: 0, gym_bag_saves: 0, comments: 0, shares: 0, views: 0,
          hasShaped: false, hasBoosted: false, inGymBag: false,
          createdAt: new Date(),
        }, ...state.videos],
        isLoading: false,
      }));

      return { success: true, videoId: insertedVideo.id };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.message };
    }
  },
}));
