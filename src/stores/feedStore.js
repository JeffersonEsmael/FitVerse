import { create } from 'zustand';
import { supabase } from '../config/supabase';

export const useFeedStore = create((set, get) => ({
  videos: [],
  currentIndex: 0,
  isLoading: false,
  hasMore: true,
  activeTab: 'forYou',

  // ─── Global upload state (shown in FeedScreen while uploading) ──
  uploadingPost: null,   // null = idle | { progress: 0-100, mediaType, caption }
  uploadError: null,     // string | null

  setCurrentIndex: (index) => set({ currentIndex: index }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  clearUploadError: () => set({ uploadError: null }),

  // ─── Toggle interactions ─────────────────────────────────
  toggleShape: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, hasShaped: !v.hasShaped, shapes: v.hasShaped ? Math.max(v.shapes - 1, 0) : v.shapes + 1 }
          : v
      ),
    }));
    supabase.rpc('toggle_video_shape', { p_video_id: videoId }).catch((err) => {
      console.warn('[Feed] toggleShape RPC error:', err.message);
    });
  },

  toggleBoost: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, hasBoosted: !v.hasBoosted, boosts: v.hasBoosted ? Math.max(v.boosts - 1, 0) : v.boosts + 1 }
          : v
      ),
    }));
    supabase.rpc('toggle_video_boost', { p_video_id: videoId }).catch((err) => {
      console.warn('[Feed] toggleBoost RPC error:', err.message);
    });
  },

  toggleGymBag: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, inGymBag: !v.inGymBag, gym_bag_saves: v.inGymBag ? Math.max(v.gym_bag_saves - 1, 0) : v.gym_bag_saves + 1 }
          : v
      ),
    }));
    supabase.rpc('toggle_video_gym_bag', { p_video_id: videoId }).catch((err) => {
      console.warn('[Feed] toggleGymBag RPC error:', err.message);
    });
  },

  incrementViews: (videoId) => {
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, views: v.views + 1 } : v
      ),
    }));
  },

  // ─── Fetch posts from Supabase ───────────────────────────
  fetchVideos: async (loadMore = false) => {
    if (get().isLoading) return;
    set({ isLoading: true });

    try {
      const offset = loadMore ? get().videos.length : 0;
      const limit = 10;

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        if (!loadMore) set({ videos: [] });
        set({ hasMore: false, isLoading: false });
        return;
      }

      const newVideos = data.map((v) => ({
        id: v.id,
        videoUrl: v.video_url,
        mediaType: v.media_type || 'video',
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
        hasShaped: false,
        hasBoosted: false,
        inGymBag: false,
        createdAt: new Date(v.created_at),
      }));

      set((state) => ({
        videos: loadMore ? [...state.videos, ...newVideos] : newVideos,
        hasMore: data.length === limit,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[Feed] fetchVideos error:', error.message);
      set({ isLoading: false });
    }
  },

  // ─── Fetch posts by specific user ────────────────────────
  fetchUserPosts: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((v) => ({
        id: v.id,
        videoUrl: v.video_url,
        mediaType: v.media_type || 'video',
        caption: v.caption || '',
        views: v.views || 0,
        shapes: v.shapes || 0,
        createdAt: new Date(v.created_at),
      }));
    } catch (error) {
      console.error('[Feed] fetchUserPosts error:', error.message);
      return [];
    }
  },

  // ─── Create post — runs in background after navigation ───
  // Call this AFTER navigating to feed. It shows a progress banner.
  createPost: async (file, metadata) => {
    // Validate inputs upfront
    if (!metadata?.userId) {
      console.error('[Feed] createPost: userId is missing.');
      set({ uploadError: 'ID do usuário não encontrado. Tente sair e entrar novamente.' });
      return { success: false, error: 'ID do usuário não encontrado.' };
    }

    // Check session using safe optional chaining
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult?.data?.session;
    if (!session) {
      console.error('[Feed] createPost: No active session.');
      set({ uploadError: 'Sessão expirada. Faça login novamente.' });
      return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    // Show upload banner
    set({
      uploadingPost: { progress: 5, mediaType: file.type.startsWith('video') ? 'video' : 'image', caption: metadata.caption || '' },
      uploadError: null,
    });

    try {
      const isVideo = file.type.startsWith('video');
      const mediaType = isVideo ? 'video' : 'image';
      const bucketName = isVideo ? 'videos' : 'posts';
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${metadata.userId}/${Date.now()}.${fileExt}`;

      console.log(`[Feed] Uploading ${mediaType} → bucket '${bucketName}': ${fileName}`);
      set((s) => ({ uploadingPost: { ...s.uploadingPost, progress: 20 } }));

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Feed] Storage upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      set((s) => ({ uploadingPost: { ...s.uploadingPost, progress: 70 } }));

      // Get public URL (synchronous — no network call needed)
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível obter a URL pública do arquivo.');

      console.log('[Feed] File uploaded. URL:', publicUrl);
      set((s) => ({ uploadingPost: { ...s.uploadingPost, progress: 85 } }));

      // Insert post record
      const postData = {
        video_url: publicUrl,
        media_type: mediaType,
        user_id: metadata.userId,
        username: metadata.username || 'user',
        user_avatar: metadata.userAvatar || '',
        display_name: metadata.displayName || 'Usuário',
        caption: metadata.caption || '',
        hashtags: metadata.hashtags || [],
        category: metadata.category || 'geral',
        shapes: 0, boosts: 0, gym_bag_saves: 0,
        comments: 0, shares: 0, views: 0,
      };

      const { data: insertedPost, error: insertError } = await supabase
        .from('videos')
        .insert(postData)
        .select()
        .single();

      if (insertError) {
        console.error('[Feed] DB insert error:', insertError);
        throw new Error(insertError.message);
      }

      console.log('[Feed] Post created with ID:', insertedPost.id);
      set((s) => ({ uploadingPost: { ...s.uploadingPost, progress: 100 } }));

      // Add to top of feed
      const newVideo = {
        id: insertedPost.id,
        videoUrl: publicUrl,
        mediaType,
        userId: metadata.userId,
        username: metadata.username || 'user',
        userAvatar: metadata.userAvatar || '',
        displayName: metadata.displayName || 'Usuário',
        caption: metadata.caption || '',
        hashtags: metadata.hashtags || [],
        category: metadata.category || 'geral',
        shapes: 0, boosts: 0, gym_bag_saves: 0,
        comments: 0, shares: 0, views: 0,
        hasShaped: false, hasBoosted: false, inGymBag: false,
        createdAt: new Date(),
      };

      // Clear banner after 1.5s so user sees the "100%" completion
      setTimeout(() => {
        set((state) => ({
          videos: [newVideo, ...state.videos],
          uploadingPost: null,
          currentIndex: 0,
        }));
      }, 1500);

      return { success: true, videoId: insertedPost.id };
    } catch (error) {
      console.error('[Feed] createPost failed:', error.message);
      set({ uploadingPost: null, uploadError: error.message });
      return { success: false, error: error.message };
    }
  },
}));
