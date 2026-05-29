import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function ConversationsListScreen() {
  const { user } = useAuthStore();
  const { conversations, fetchConversations, deleteConversation, isLoading } = useChatStore();
  const { navigate, goBack } = useNavigationStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConvForDelete, setSelectedConvForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const longPressTimer = useRef(null);
  const [holdTriggered, setHoldTriggered] = useState(false);

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
    if (holdTriggered) return;
    navigate('messages', {
      params: {
        conversationId: conv.id,
        otherUserId: conv.otherUserId,
        otherUser: conv.otherUser,
      },
    });
  };

  const handleStartHold = (conv) => {
    setHoldTriggered(false);
    longPressTimer.current = setTimeout(() => {
      setHoldTriggered(true);
      setSelectedConvForDelete(conv);
    }, 600); // 600ms hold triggers options
  };

  const handleEndHold = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleDelete = async () => {
    if (!selectedConvForDelete) return;
    setIsDeleting(true);
    const res = await deleteConversation(selectedConvForDelete.id);
    setIsDeleting(false);
    setSelectedConvForDelete(null);
  };

  // Filter conversations based on query search
  const filteredConversations = conversations.filter((conv) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      conv.otherUser?.display_name?.toLowerCase().includes(term) ||
      conv.otherUser?.username?.toLowerCase().includes(term)
    );
  });

  return (
    <ScreenWrapper screenKey="conversations">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={goBack}>
            <ArrowLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Mensagens</h2>
        </div>

        {/* Search */}
        <div style={styles.searchWrap}>
          <Search size={18} color="#6C6C88" />
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          ) : filteredConversations.length === 0 ? (
            <div style={styles.emptyState}>
              <MessageCircle size={48} color="#6C6C88" />
              <span style={styles.emptyText}>
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </span>
              <span style={styles.emptySubtext}>
                {searchQuery ? 'Tente pesquisar outro termo' : 'Suas mensagens aparecerão aqui'}
              </span>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              // Simulated deterministic online status based on contact's ID
              const isOnline = (conv.otherUserId?.charCodeAt(0) || 0) % 2 === 0;
              return (
                <motion.button
                  key={conv.id}
                  style={styles.convItem}
                  onClick={() => openChat(conv)}
                  onTouchStart={() => handleStartHold(conv)}
                  onTouchEnd={handleEndHold}
                  onTouchMove={handleEndHold}
                  onMouseDown={() => handleStartHold(conv)}
                  onMouseUp={handleEndHold}
                  onMouseLeave={handleEndHold}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={styles.convAvatarContainer}>
                    <div style={styles.convAvatar}>
                      {conv.otherUser?.avatar_url ? (
                        <img src={conv.otherUser.avatar_url} alt="" style={styles.avatarImg} />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {conv.otherUser?.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    {/* Glowing active online status green dot */}
                    {isOnline && <div style={styles.onlineDot} />}
                  </div>

                  <div style={styles.convInfo}>
                    <div style={styles.convRow}>
                      <span style={styles.convName}>{conv.otherUser?.display_name || 'Usuário'}</span>
                      <span style={styles.convTime}>{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <span style={styles.convLastMsg}>{conv.lastMessage || 'Iniciar conversa...'}</span>
                  </div>

                  {conv.unreadCount > 0 && (
                    <div style={styles.unreadBadge}>{conv.unreadCount}</div>
                  )}

                  {/* Inline delete helper */}
                  <div
                    style={styles.trashIcon}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedConvForDelete(conv);
                    }}
                  >
                    <Trash2 size={16} color="#FF2D55" />
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Deletion Bottom Sheet Modal */}
      <AnimatePresence>
        {selectedConvForDelete && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedConvForDelete(null)}
          >
            <motion.div
              style={styles.deleteSheet}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.sheetHandle} />
              <h4 style={styles.deleteTitle}>Apagar Conversa?</h4>
              <p style={styles.deleteDesc}>
                Tem certeza que deseja apagar a conversa com <strong>{selectedConvForDelete.otherUser?.display_name || 'este usuário'}</strong>? Esta ação removerá todas as mensagens.
              </p>
              <div style={styles.deleteActions}>
                <button
                  style={styles.deleteConfirmBtn}
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Apagando...' : 'Apagar'}
                </button>
                <button
                  style={styles.deleteCancelBtn}
                  onClick={() => setSelectedConvForDelete(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
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
  convAvatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  onlineDot: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#39FF14',
    border: '2px solid #0A0A0F',
    boxShadow: '0 0 8px #39FF14',
  },
  trashIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '8px',
    background: 'rgba(255,45,85,0.05)',
    border: '1px solid rgba(255,45,85,0.1)',
    marginLeft: '8px',
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-end',
  },
  deleteSheet: {
    width: '100%',
    background: 'rgba(10, 10, 15, 0.95)',
    backdropFilter: 'blur(30px)',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '20px 20px 32px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
  },
  sheetHandle: {
    width: '40px',
    height: '4px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '2px',
    alignSelf: 'center',
    marginBottom: '8px',
  },
  deleteTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    margin: 0,
    textAlign: 'center',
    fontFamily: "'Outfit', sans-serif",
  },
  deleteDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: '1.5',
    fontFamily: "'Inter', sans-serif",
  },
  deleteActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  deleteConfirmBtn: {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    background: '#FF2D55',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
  },
  deleteCancelBtn: {
    flex: 1,
    padding: '14px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: "'Inter', sans-serif",
  },
};
