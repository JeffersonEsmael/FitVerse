import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';

export const useFeedStore = create(
  persist(
    (set, get) => ({
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
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === videoId ? { ...v, views: (v.views || 0) + 1 } : v
      ),
    }));

    try {
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('views')
        .eq('id', videoId)
        .maybeSingle();

      if (!fetchError && data) {
        const currentViews = data.views || 0;
        await supabase
          .from('videos')
          .update({ views: currentViews + 1 })
          .eq('id', videoId);
      }
    } catch (dbErr) {
      console.error('[Feed] incrementViews DB error:', dbErr.message);
    }
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
        .neq('category', 'desafio')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (!data || data.length === 0) {
        if (!loadMore) set({ videos: [] });
        set({ hasMore: false, isLoading: false });
        return;
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

        return {
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
          hasShaped,
          hasBoosted,
          inGymBag,
          createdAt: new Date(v.created_at),
        };
      });

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

      if (!data || data.length === 0) return [];

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

      return data.map((v) => {
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
          hasShaped,
          hasBoosted,
          inGymBag,
          createdAt: new Date(v.created_at),
        };
      });
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

        return {
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
      uploadingPost: { progress: 5, mediaType: file.type.startsWith('video') ? 'video' : 'image', caption: metadata.caption || '' },
      uploadError: null,
    });

    try {
      const isVideo = file.type.startsWith('video');
      const mediaType = isVideo ? 'video' : 'image';
      const bucketName = isVideo ? 'videos' : 'posts';

      let finalFile = file;
      if (!isVideo) {
        try {
          const { compressImage } = await import('../utils/compression');
          finalFile = await compressImage(file, { maxWidth: 1080, maxHeight: 1080, quality: 0.8 });
        } catch (compErr) {
          console.warn('[Feed] Image compression failed, using original file:', compErr);
        }
      }

      const fileExt = finalFile.name ? finalFile.name.split('.').pop().toLowerCase() : (isVideo ? 'webm' : 'jpg');
      const fileName = `${metadata.userId}/${Date.now()}.${fileExt}`;

      console.log(`[Feed] Uploading ${mediaType} → bucket '${bucketName}': ${fileName}`);
      set((s) => ({ uploadingPost: { ...s.uploadingPost, progress: 20 } }));

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, finalFile, {
          contentType: finalFile.type,
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
  },

  fetchComments: async (videoId) => {
    try {
      const { data, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
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
