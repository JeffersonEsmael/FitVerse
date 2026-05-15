import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function ConversationsListScreen() {
  const { user } = useAuthStore();
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const navigate = useNavigationStore((s) => s.navigate);

  useEffect(() => {
    if (user?.uid) {
      fetchConversations(user.uid);
    }
  }, [user?.uid, fetchConversations]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return 'Agora';
    if (diffHours < 24) return `${Math.floor(diffHours)}h`;
    if (diffHours < 48) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const openChat = (conv) => {
    navigate('messages', {
      params: {
        conversationId: conv.id,
        otherUserId: conv.otherUserId,
        otherUser: conv.otherUser,
      },
    });
  };

  return (
    <ScreenWrapper screenKey="conversations">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Mensagens</h2>
        </div>

        {/* Search */}
        <div style={styles.searchWrap}>
          <Search size={18} color="#6C6C88" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            style={styles.searchInput}
          />
        </div>

        {/* Conversations list */}
        <div style={styles.list}>
          {isLoading && conversations.length === 0 ? (
            <div style={styles.emptyState}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={styles.loadingSpinner}
              />
            </div>
          ) : conversations.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageCircle size={48} color="#6C6C88" />
              <span style={styles.emptyText}>Nenhuma conversa ainda</span>
              <span style={styles.emptySubtext}>Suas mensagens aparecerão aqui</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.button
                key={conv.id}
                style={styles.convItem}
                onClick={() => openChat(conv)}
                whileTap={{ scale: 0.98 }}
              >
                <div style={styles.convAvatar}>
                  {conv.otherUser.avatar_url ? (
                    <img src={conv.otherUser.avatar_url} alt="" style={styles.avatarImg} />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {conv.otherUser.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                <div style={styles.convInfo}>
                  <div style={styles.convRow}>
                    <span style={styles.convName}>{conv.otherUser.display_name}</span>
                    <span style={styles.convTime}>{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <span style={styles.convLastMsg}>{conv.lastMessage || 'Iniciar conversa...'}</span>
                </div>

                {conv.unreadCount > 0 && (
                  <div style={styles.unreadBadge}>{conv.unreadCount}</div>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: {
    padding: '0 16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 12px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: "'Inter', sans-serif",
  },
  convAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 800,
    fontSize: '18px',
    fontFamily: "'Outfit', sans-serif",
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  convRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
  },
  convTime: {
    fontSize: '12px',
    color: '#6C6C88',
  },
  convLastMsg: {
    fontSize: '13px',
    color: '#6C6C88',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unreadBadge: {
    background: '#00D4FF',
    color: '#000',
    fontSize: '11px',
    fontWeight: 800,
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    paddingTop: '80px',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#B0B0C8',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#6C6C88',
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(0,212,255,0.2)',
    borderTopColor: '#00D4FF',
    borderRadius: '50%',
  },
};
