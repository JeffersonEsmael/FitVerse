import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { cacheGet, cacheSet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from '../utils/localCache';

let messageSubscription = null;

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],
  activeConversation: null,
  isLoading: false,

  // ─── Fetch all conversations for current user (cached) ────
  fetchConversations: async (userId) => {
    // Check cache first
    const cached = cacheGet(CACHE_KEYS.conversations(userId));
    if (cached) {
      set({ conversations: cached, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Extract unique contact IDs to fetch them in a single batch query
      const otherUserIds = [
        ...new Set(
          (data || [])
            .map((conv) => conv.participant_ids.find((id) => id !== userId))
            .filter(Boolean)
        ),
      ];

      const profilesMap = {};
      if (otherUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', otherUserIds);

        if (profilesError) throw profilesError;

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const enriched = (data || []).map((conv) => {
        const otherUserId = conv.participant_ids.find((id) => id !== userId);
        const otherUser = profilesMap[otherUserId] || { display_name: 'Usuário', username: 'user', avatar_url: '' };

        return {
          id: conv.id,
          participantIds: conv.participant_ids,
          otherUserId,
          otherUser,
          lastMessage: conv.last_message || '',
          lastMessageAt: conv.updated_at,
          unreadCount: conv.unread_count || 0,
        };
      });

      set({ conversations: enriched, isLoading: false });
      cacheSet(CACHE_KEYS.conversations(userId), enriched, CACHE_TTL.CONVERSATIONS);
    } catch (error) {
      console.error('Error fetching conversations:', error.message);
      set({ isLoading: false });
    }
  },

  // ─── Get or create a conversation with another user ──────
  getOrCreateConversation: async (currentUserId, otherUserId) => {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUserId, otherUserId]);

      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [currentUserId, otherUserId],
          last_message: '',
        })
        .select()
        .single();

      if (error) throw error;
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error.message);
      return null;
    }
  },

  // ─── Fetch messages for a conversation ───────────────────
  fetchMessages: async (conversationId) => {
    set({ isLoading: true, activeConversation: conversationId });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({
        messages: (data || []).map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          content: m.content || '',
          imageUrl: m.image_url || '',
          createdAt: new Date(m.created_at),
        })),
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching messages:', error.message);
      set({ isLoading: false });
    }
  },

  // ─── Send a message ──────────────────────────────────────
  sendMessage: async (conversationId, senderId, content, imageUrl = '') => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message: content || '📷 Imagem',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Invalidate conversations cache so next fetch shows updated last message
      cacheInvalidatePattern('conversations_');

      // Create notification for the recipient
      try {
        const conv = get().conversations.find(c => c.id === conversationId);
        let recipientId = conv?.participantIds?.find(id => id !== senderId);

        if (!recipientId) {
          const { data: convData } = await supabase
            .from('conversations')
            .select('participant_ids')
            .eq('id', conversationId)
            .maybeSingle();
          if (convData) {
            recipientId = convData.participant_ids?.find(id => id !== senderId);
          }
        }

        if (recipientId) {
          const { useSocialStore } = await import('./socialStore');
          await useSocialStore.getState().createNotification(recipientId, senderId, 'message', conversationId);
        }
      } catch (notifErr) {
        console.error('Failed to create message notification:', notifErr);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error.message);
      return { success: false, error: error.message };
    }
  },

  // ─── Upload chat image ───────────────────────────────────
  uploadChatImage: async (file, userId) => {
    try {
      let finalFile = file;
      try {
        const { compressImage } = await import('../utils/compression');
        finalFile = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
      } catch (compErr) {
        console.warn('[ChatStore] Image compression failed, using original file:', compErr);
      }

      const fileExt = finalFile.name ? finalFile.name.split('.').pop().toLowerCase() : 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, finalFile, { contentType: finalFile.type, cacheControl: '86400' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading chat image:', error.message);
      return null;
    }
  },

  // ─── Realtime subscription ───────────────────────────────
  subscribeToMessages: (conversationId) => {
    // Cleanup previous subscription
    get().unsubscribeFromMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new;
          const newMessage = {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            content: m.content || '',
            imageUrl: m.image_url || '',
            createdAt: new Date(m.created_at),
          };

          set((state) => {
            // Avoid duplicates
            if (state.messages.some((msg) => msg.id === newMessage.id)) {
              return state;
            }
            return { messages: [...state.messages, newMessage] };
          });
        }
      )
      .subscribe();

    messageSubscription = channel;
  },

  unsubscribeFromMessages: () => {
    if (messageSubscription) {
      supabase.removeChannel(messageSubscription);
      messageSubscription = null;
    }
  },

  // ─── Clear messages ──────────────────────────────────────
  clearMessages: () => set({ messages: [], activeConversation: null }),

  // ─── Delete a conversation ────────────────────────────────
  deleteConversation: async (conversationId) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
      
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
      }));
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error.message);
      return { success: false, error: error.message };
    }
  },
}));
