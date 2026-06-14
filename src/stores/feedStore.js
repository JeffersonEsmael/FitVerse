import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';
import { cacheGet, cacheSet, cacheInvalidate, cacheInvalidatePattern, CACHE_KEYS, CACHE_TTL } from '../utils/localCache';

export const useFeedStore = create(
  persist(
    (set, get) => ({
      videos: [],
      currentIndex: 0,
      isLoading: false,
      hasMore: true,
      activeTab: 'forYou',
      sessionWatched: [],

      // ─── Global upload state (shown in FeedScreen while uploading) ──
      uploadingPost: null,   // null = idle | { progress: 0-100, mediaType, caption }
      uploadError: null,     // string | null

      setCurrentIndex: (index) => set({ currentIndex: index }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      clearUploadError: () => set({ uploadError: null }),

  // ─── Toggle interactions ─────────────────────────────────
  toggleShape: async (videoId) => {
    const video = get().videos.find((v) => v.id === videoId);
    const wasShaped = video ? video.hasShaped : false;

    // Optimistic update
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, hasShaped: !v.hasShaped, shapes: v.hasShaped ? Math.max(v.shapes - 1, 0) : v.shapes + 1 }
          : v
      ),
    }));

    try {
      const { error } = await supabase.rpc('toggle_video_shape', { p_video_id: videoId });
      if (error) {
        console.error('[Feed] toggleShape RPC error:', error.message, error.details);
        // Revert local state on error
        set((state) => ({
          videos: state.videos.map((v) =>
            v.id === videoId
              ? { ...v, hasShaped: !v.hasShaped, shapes: v.hasShaped ? v.shapes + 1 : Math.max(v.shapes - 1, 0) }
              : v
          ),
        }));
      } else {
        const { useAuthStore } = await import('./authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().refreshProfile();
          if (!wasShaped && video && video.userId && video.userId !== currentUser.uid) {
            const { useSocialStore } = await import('./socialStore');
            useSocialStore.getState().createNotification(video.userId, currentUser.uid, 'shape', videoId);
          }
        }
      }
    } catch (err) {
      console.error('[Feed] toggleShape exception:', err.message);
    }
  },

  toggleBoost: async (videoId) => {
    const video = get().videos.find((v) => v.id === videoId);
    const wasBoosted = video ? video.hasBoosted : false;

    // Optimistic update
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, hasBoosted: !v.hasBoosted, boosts: v.hasBoosted ? Math.max(v.boosts - 1, 0) : v.boosts + 1 }
          : v
      ),
    }));

    try {
      const { error } = await supabase.rpc('toggle_video_boost', { p_video_id: videoId });
      if (error) {
        console.error('[Feed] toggleBoost RPC error:', error.message, error.details);
        // Revert local state on error
        set((state) => ({
          videos: state.videos.map((v) =>
            v.id === videoId
              ? { ...v, hasBoosted: !v.hasBoosted, boosts: v.hasBoosted ? v.boosts + 1 : Math.max(v.boosts - 1, 0) }
              : v
          ),
        }));
      } else {
        const { useAuthStore } = await import('./authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser && !wasBoosted && video && video.userId && video.userId !== currentUser.uid) {
          const { useSocialStore } = await import('./socialStore');
          useSocialStore.getState().createNotification(video.userId, currentUser.uid, 'boost', videoId);
        }
      }
    } catch (err) {
      console.error('[Feed] toggleBoost exception:', err.message);
    }
  },

  toggleGymBag: async (videoId) => {
    // Optimistic update
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId
          ? { ...v, inGymBag: !v.inGymBag, gym_bag_saves: v.inGymBag ? Math.max(v.gym_bag_saves - 1, 0) : v.gym_bag_saves + 1 }
          : v
      ),
    }));

    try {
      const { error } = await supabase.rpc('toggle_video_gym_bag', { p_video_id: videoId });
      if (error) {
        console.error('[Feed] toggleGymBag RPC error:', error.message, error.details);
        // Revert local state on error
        set((state) => ({
          videos: state.videos.map((v) =>
            v.id === videoId
              ? { ...v, inGymBag: !v.inGymBag, gym_bag_saves: v.inGymBag ? v.gym_bag_saves + 1 : Math.max(v.gym_bag_saves - 1, 0) }
              : v
          ),
        }));
      }
    } catch (err) {
      console.error('[Feed] toggleGymBag exception:', err.message);
    }
  },

  incrementViews: async (videoId) => {
    if (!videoId) return;

    // 1. Mark video as viewed locally in history
    try {
      const { recordVideoView } = await import('../utils/videoSelector');
      recordVideoView(videoId);
    } catch (e) {
      console.warn('[FeedStore] Error recording video view:', e);
    }

    set((state) => {
      // Avoid duplicates in sessionWatched
      const alreadyWatched = state.sessionWatched || [];
      const updatedSession = alreadyWatched.includes(videoId) 
        ? alreadyWatched 
        : [...alreadyWatched, videoId];

      return {
        sessionWatched: updatedSession,
        videos: state.videos.map((v) =>
          v.id === videoId ? { ...v, views: (v.views || 0) + 1 } : v
        ),
      };
    });

    // Use single atomic RPC instead of SELECT + UPDATE (eliminates race condition)
    try {
      const { error } = await supabase.rpc('increment_video_views', { p_video_id: videoId });
      if (error) {
        console.warn('[Feed] increment_video_views RPC error (falling back):', error.message);
        // Fallback for when the RPC doesn't exist yet
        const { data } = await supabase
          .from('videos')
          .select('views')
          .eq('id', videoId)
          .maybeSingle();
        if (data) {
          await supabase
            .from('videos')
            .update({ views: (data.views || 0) + 1 })
            .eq('id', videoId);
        }
      }
    } catch (dbErr) {
      console.error('[Feed] incrementViews DB error:', dbErr.message);
    }
  },

  // ─── Fetch posts from Supabase (with local cache) ────────
  fetchVideos: async (loadMore = false) => {
    if (get().isLoading) return;

    // On initial load (not loadMore), check cache first
    if (!loadMore) {
      const cached = cacheGet(CACHE_KEYS.feed(get().activeTab));
      if (cached && cached.length > 0) {
        // Serve from cache instantly, then refresh in background
        set({ videos: cached, hasMore: true, isLoading: false });
        // Background refresh: only if cache is older than 2 minutes
        const { cacheAge } = await import('../utils/localCache');
        if (cacheAge(CACHE_KEYS.feed(get().activeTab)) < 2) {
          return; // Cache is fresh enough, skip network
        }
        // Otherwise fall through to fetch fresh data in background (without showing loading)
      }
    }

    set({ isLoading: true });

    try {
      const offset = loadMore ? get().videos.length : 0;
      const limit = 10;

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .neq('category', 'desafio')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        if (!loadMore) set({ videos: [] });
        set({ hasMore: false, isLoading: false });
        return;
      }

      // Fetch profiles in batch to resolve dynamic profile updates
      const userIds = [...new Set(data.map((v) => v.user_id).filter(Boolean))];
      let profilesMap = {};
      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);
          if (!profilesError && profilesData) {
            profilesData.forEach((p) => {
              profilesMap[p.id] = p;
              // Cache each profile individually for reuse
              cacheSet(CACHE_KEYS.publicProfile(p.id), p, CACHE_TTL.PROFILE);
            });
          }
        } catch (pErr) {
          console.warn('[Feed] Error batch fetching profiles:', pErr.message);
        }
      }

      // Query actual user interactions to set active visual states
      let userInteractions = [];
      try {
        const { useAuthStore } = await import('./authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.uid) {
          const videoIds = data.map((v) => v.id);
          const { data: interactions } = await supabase
            .from('video_interactions')
            .select('video_id, interaction_type')
            .eq('user_id', currentUser.uid)
            .in('video_id', videoIds);
          if (interactions) userInteractions = interactions;
        }
      } catch (authErr) {
        console.warn('[Feed] Error getting active user interactions:', authErr.message);
      }

      const newVideos = data.map((v) => {
        const hasShaped = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'shape'
        );
        const hasBoosted = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'boost'
        );
        const inGymBag = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'gym_bag'
        );

        const userProfile = profilesMap[v.user_id];

        return {
          id: v.id,
          videoUrl: v.video_url,
          mediaType: v.media_type || 'video',
          userId: v.user_id,
          username: userProfile?.username || v.username,
          userAvatar: userProfile?.avatar_url || v.user_avatar || '',
          displayName: userProfile?.display_name || v.display_name,
          caption: v.caption || '',
          hashtags: v.hashtags || [],
          category: v.category || 'geral',
          shapes: v.shapes || 0,
          boosts: v.boosts || 0,
          gym_bag_saves: v.gym_bag_saves || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
          views: v.views || 0,
          hasShaped,
          hasBoosted,
          inGymBag,
          createdAt: new Date(v.created_at),
        };
      });

      let processedVideos = newVideos;
      if (!loadMore) {
        try {
          const { selectNextVideos } = await import('../utils/videoSelector');
          const sessionWatched = get().sessionWatched || [];
          processedVideos = selectNextVideos(newVideos, new Set(sessionWatched));
        } catch (selErr) {
          console.warn('[FeedStore] Error ordering videos with smart selector:', selErr);
        }
      }

      const finalVideos = loadMore ? [...get().videos, ...newVideos] : processedVideos;

      // Cache the first 20 videos for next session instant load
      if (!loadMore) {
        cacheSet(CACHE_KEYS.feed(get().activeTab), finalVideos.slice(0, 20), CACHE_TTL.FEED);
      }

      set({
        videos: finalVideos,
        hasMore: data.length === limit,
        isLoading: false,
      });
    } catch (error) {
      console.error('[Feed] fetchVideos error:', error.message);
      set({ isLoading: false });
    }
  },

  // ─── Fetch posts by specific user (cached per userId) ────
  fetchUserPosts: async (userId) => {
    // Check cache first
    const cached = cacheGet(CACHE_KEYS.userPosts(userId));
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Check profile cache before querying
      let userProfile = cacheGet(CACHE_KEYS.publicProfile(userId));
      if (!userProfile) {
        try {
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('id', userId)
            .maybeSingle();
          if (!profileErr && profileData) {
            userProfile = profileData;
            cacheSet(CACHE_KEYS.publicProfile(userId), profileData, CACHE_TTL.PROFILE);
          }
        } catch (pErr) {
          console.warn('[Feed] Error fetching user profile:', pErr.message);
        }
      }

      // Query actual user interactions to set active visual states
      let userInteractions = [];
      try {
        const { useAuthStore } = await import('./authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.uid) {
          const videoIds = data.map((v) => v.id);
          const { data: interactions } = await supabase
            .from('video_interactions')
            .select('video_id, interaction_type')
            .eq('user_id', currentUser.uid)
            .in('video_id', videoIds);
          if (interactions) userInteractions = interactions;
        }
      } catch (authErr) {
        console.warn('[Feed] Error getting active user interactions:', authErr.message);
      }

      const result = data.map((v) => {
        const hasShaped = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'shape'
        );
        const hasBoosted = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'boost'
        );
        const inGymBag = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'gym_bag'
        );

        return {
          id: v.id,
          videoUrl: v.video_url,
          mediaType: v.media_type || 'video',
          userId: v.user_id,
          username: userProfile?.username || v.username,
          userAvatar: userProfile?.avatar_url || v.user_avatar || '',
          displayName: userProfile?.display_name || v.display_name,
          caption: v.caption || '',
          hashtags: v.hashtags || [],
          category: v.category || 'geral',
          shapes: v.shapes || 0,
          boosts: v.boosts || 0,
          gym_bag_saves: v.gym_bag_saves || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
          views: v.views || 0,
          hasShaped,
          hasBoosted,
          inGymBag,
          createdAt: new Date(v.created_at),
        };
      });

      // Cache user posts
      cacheSet(CACHE_KEYS.userPosts(userId), result, CACHE_TTL.USER_POSTS);
      return result;
    } catch (error) {
      console.error('[Feed] fetchUserPosts error:', error.message);
      return [];
    }
  },

  // ─── Delete post permanently from DB ──────────────────────
  deletePost: async (postId) => {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Update local state by filtering out the deleted video
      set((state) => ({
        videos: state.videos.filter((v) => v.id !== postId),
      }));

      // Invalidate caches
      cacheInvalidatePattern('feed_');
      cacheInvalidatePattern('user_posts_');

      // Refresh auth profile stats (decrement total posts)
      const { useAuthStore } = await import('./authStore');
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().refreshProfile();
      }

      return { success: true };
    } catch (error) {
      console.error('[Feed] deletePost error:', error.message);
      return { success: false, error: error.message };
    }
  },

  // ─── Fetch Gym Bag saved videos ──────────────────────────
  fetchGymBagVideos: async (userId) => {
    try {
      // Fetches video_interactions and the joined video
      const { data, error } = await supabase
        .from('video_interactions')
        .select(`
          created_at,
          videos (*)
        `)
        .eq('user_id', userId)
        .eq('interaction_type', 'gym_bag')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const validVideos = (data || []).map(i => i.videos).filter(Boolean);
      if (validVideos.length === 0) return [];

      // Fetch profiles in batch for saved videos
      const userIds = [...new Set(validVideos.map((v) => v.user_id).filter(Boolean))];
      let profilesMap = {};
      if (userIds.length > 0) {
        try {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);
          if (!profilesError && profilesData) {
            profilesData.forEach((p) => {
              profilesMap[p.id] = p;
            });
          }
        } catch (pErr) {
          console.warn('[Feed] Error batch fetching profiles for gym bag:', pErr.message);
        }
      }

      // Query actual user interactions to set active visual states
      let userInteractions = [];
      try {
        const { useAuthStore } = await import('./authStore');
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.uid) {
          const videoIds = validVideos.map((v) => v.id);
          const { data: interactions } = await supabase
            .from('video_interactions')
            .select('video_id, interaction_type')
            .eq('user_id', currentUser.uid)
            .in('video_id', videoIds);
          if (interactions) userInteractions = interactions;
        }
      } catch (authErr) {
        console.warn('[Feed] Error getting active user interactions:', authErr.message);
      }

      return validVideos.map((v) => {
        const hasShaped = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'shape'
        );
        const hasBoosted = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'boost'
        );
        const inGymBag = userInteractions.some(
          (i) => i.video_id === v.id && i.interaction_type === 'gym_bag'
        );

        const userProfile = profilesMap[v.user_id];

        return {
          id: v.id,
          videoUrl: v.video_url,
          mediaType: v.media_type || 'video',
          userId: v.user_id,
          username: userProfile?.username || v.username,
          userAvatar: userProfile?.avatar_url || v.user_avatar || '',
          displayName: userProfile?.display_name || v.display_name,
          caption: v.caption || '',
          hashtags: v.hashtags || [],
          category: v.category || 'geral',
          shapes: v.shapes || 0,
          boosts: v.boosts || 0,
          gym_bag_saves: v.gym_bag_saves || 0,
          comments: v.comments || 0,
          shares: v.shares || 0,
          views: v.views || 0,
          hasShaped,
          hasBoosted,
          inGymBag,
          createdAt: new Date(v.created_at),
        };
      });
    } catch (error) {
      console.error('[Feed] fetchGymBagVideos error:', error.message);
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
      uploadingPost: {
        progress: 5,
        mediaType: file.type.startsWith('video') ? 'video' : 'image',
        caption: metadata.caption || '',
        statusText: file.type.startsWith('video') ? '🎥 Inicializando...' : '📷 Otimizando imagem...'
      },
      uploadError: null,
    });

    try {
      const isVideo = file.type.startsWith('video');
      const mediaType = isVideo ? 'video' : 'image';
      const bucketName = isVideo ? 'videos' : 'posts';

      let finalFile = file;
      if (isVideo) {
        if (file.size > 2 * 1024 * 1024) {
          try {
            const { compressVideo } = await import('../utils/compression');
            finalFile = await compressVideo(file, {
              onProgress: (pct) => {
                // Map transcoding progress (0-100%) to banner progress (5-50%)
                const progress = Math.round(5 + (pct * 45) / 100);
                set((s) => ({
                  uploadingPost: s.uploadingPost
                    ? {
                        ...s.uploadingPost,
                        progress,
                        statusText: `🎥 Otimizando vídeo para publicação (${pct}%)...`
                      }
                    : null
                }));
              }
            });
          } catch (compErr) {
            console.warn('[Feed] Video compression failed, using original file:', compErr);
          }
        }
      } else {
        try {
          const { compressImage } = await import('../utils/compression');
          finalFile = await compressImage(file, { maxWidth: 900, maxHeight: 900, quality: 0.7 });
        } catch (compErr) {
          console.warn('[Feed] Image compression failed, using original file:', compErr);
        }
      }

      const fileExt = finalFile.name ? finalFile.name.split('.').pop().toLowerCase() : (isVideo ? 'webm' : 'jpg');
      const fileName = `${metadata.userId}/${Date.now()}.${fileExt}`;

      console.log(`[Feed] Uploading ${mediaType} → bucket '${bucketName}': ${fileName}`);
      set((s) => ({
        uploadingPost: s.uploadingPost
          ? { ...s.uploadingPost, progress: 50, statusText: '🎥 Enviando para o servidor...' }
          : null
      }));

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, finalFile, {
          contentType: finalFile.type,
          cacheControl: '86400',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Feed] Storage upload error:', uploadError);
        throw new Error(uploadError.message);
      }

      set((s) => ({
        uploadingPost: s.uploadingPost
          ? { ...s.uploadingPost, progress: 75, statusText: '🎥 Processando URL pública...' }
          : null
      }));

      // Get public URL (synchronous — no network call needed)
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Não foi possível obter a URL pública do arquivo.');

      console.log('[Feed] File uploaded. URL:', publicUrl);
      set((s) => ({
        uploadingPost: s.uploadingPost
          ? { ...s.uploadingPost, progress: 85, statusText: '🎥 Registrando publicação...' }
          : null
      }));

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
      
      // Update user's total_videos in profiles table
      try {
        const { count: videoCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', metadata.userId)
          .neq('category', 'desafio');

        await supabase
          .from('profiles')
          .update({ total_videos: videoCount || 0 })
          .eq('id', metadata.userId);

        // Dynamically import useAuthStore to prevent circular dependency
        const { useAuthStore } = await import('./authStore');
        useAuthStore.getState().refreshProfile();
      } catch (profileErr) {
        console.warn('[Feed] Error updating total_videos profile count:', profileErr.message);
      }

      set((s) => ({
        uploadingPost: s.uploadingPost
          ? { ...s.uploadingPost, progress: 100, statusText: '🎉 Publicado com sucesso!' }
          : null
      }));

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
          videos: metadata.category === 'desafio' ? state.videos : [newVideo, ...state.videos],
          uploadingPost: null,
          currentIndex: metadata.category === 'desafio' ? state.currentIndex : 0,
        }));
      }, 1500);

      return { success: true, videoId: insertedPost.id };
    } catch (error) {
      console.error('[Feed] createPost failed:', error.message);
      set({ uploadingPost: null, uploadError: error.message });
      return { success: false, error: error.message };
    }
    // Note: feed cache is invalidated by the setTimeout above adding the new video
    // and will be refreshed on next fetchVideos call
  },

  fetchComments: async (videoId) => {
    // Check cache first
    const cached = cacheGet(CACHE_KEYS.comments(videoId));
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const result = data || [];
      cacheSet(CACHE_KEYS.comments(videoId), result, CACHE_TTL.COMMENTS);
      return result;
    } catch (err) {
      console.error('[Feed] fetchComments error:', err.message);
      return [];
    }
  },

  addComment: async (videoId, content, parentId = null) => {
    try {
      const { useAuthStore } = await import('./authStore');
      const authState = useAuthStore.getState();
      const user = authState.user;
      const profile = authState.profile;

      if (!user) throw new Error('Usuário não autenticado.');

      const commentData = {
        video_id: videoId,
        user_id: user.uid,
        username: profile?.username || 'user',
        avatar_url: profile?.avatar_url || '',
        content: content,
        parent_id: parentId,
      };

      const { data: insertedComment, error: insertErr } = await supabase
        .from('video_comments')
        .insert(commentData)
        .select()
        .single();

      if (insertErr) throw insertErr;

      const { data: videoData } = await supabase
        .from('videos')
        .select('comments, user_id')
        .eq('id', videoId)
        .single();

      // Increment comments count locally in state
      set((state) => ({
        videos: state.videos.map((v) =>
          v.id === videoId ? { ...v, comments: (v.comments || 0) + 1 } : v
        ),
      }));

      // Create notification for the video owner
      if (videoData && videoData.user_id !== user.uid) {
        const { useSocialStore } = await import('./socialStore');
        useSocialStore.getState().createNotification(videoData.user_id, user.uid, 'comment', videoId);
      }

      // Scan and create mention notifications
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const matches = [...content.matchAll(mentionRegex)];
      if (matches.length > 0) {
        const usernames = matches.map((m) => m[1].toLowerCase());
        const { useSocialStore } = await import('./socialStore');
        const socialStore = useSocialStore.getState();
        for (const username of usernames) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();

          if (profileData && profileData.id !== user.uid) {
            await socialStore.createNotification(profileData.id, user.uid, 'mention', videoId);
          }
        }
      }

      // Invalidate comments cache so next fetch gets fresh data
      cacheInvalidate(CACHE_KEYS.comments(videoId));

      return { success: true, comment: insertedComment };
    } catch (err) {
      console.error('[Feed] addComment error:', err.message);
      return { success: false, error: err.message };
    }
  },

  toggleCommentLike: async (commentId) => {
    try {
      const { useAuthStore } = await import('./authStore');
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('Usuário não autenticado.');

      // Check if already liked
      const { data: existingLike, error: selectErr } = await supabase
        .from('comment_likes')
        .select('*')
        .eq('user_id', currentUser.uid)
        .eq('comment_id', commentId)
        .maybeSingle();

      if (selectErr) throw selectErr;

      if (existingLike) {
        // Delete like
        const { error: deleteErr } = await supabase
          .from('comment_likes')
          .delete()
          .eq('id', existingLike.id);
        if (deleteErr) throw deleteErr;
        return { success: true, liked: false };
      } else {
        // Insert like
        const { error: insertErr } = await supabase
          .from('comment_likes')
          .insert({
            user_id: currentUser.uid,
            comment_id: commentId
          });
        if (insertErr) throw insertErr;
        return { success: true, liked: true };
      }
    } catch (err) {
      console.error('[Feed] toggleCommentLike error:', err.message);
      return { success: false, error: err.message };
    }
  },
    }),
    {
      name: 'fitverse-feed-cache',
      partialize: (state) => ({ 
        videos: state.videos.slice(0, 20), // only cache the first 20 videos to save storage
      }),
    }
  )
);
