import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import { useAuthStore } from '../../stores/authStore';

export default function CommentsSheet({ isOpen, onClose, videoId }) {
  const { fetchComments, addComment } = useFeedStore();
  const { user } = useAuthStore();
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const listEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && videoId) {
      setIsLoading(true);
      fetchComments(videoId).then((data) => {
        setComments(data);
        setIsLoading(false);
      });
    }
  }, [isOpen, videoId, fetchComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || !user) return;
    
    setIsSubmitting(true);
    const result = await addComment(videoId, newComment.trim());
    
    if (result.success && result.comment) {
      setComments((prev) => [result.comment, ...prev]);
      setNewComment('');
      // Scroll to top where the new comment was added
      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    setIsSubmitting(false);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            style={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            style={styles.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            {/* Header Drag Handle */}
            <div style={styles.dragHandle} onClick={onClose} />

            {/* Header */}
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <MessageCircle size={18} color="#00D4FF" />
                <span style={styles.title}>Comentários</span>
                <span style={styles.countBadge}>{comments.length}</span>
              </div>
              <button style={styles.closeBtn} onClick={onClose}>
                <X size={20} color="#fff" />
              </button>
            </div>

            {/* Content list */}
            <div style={styles.commentsList}>
              {isLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner} />
                  <span style={styles.loadingText}>Carregando comentários...</span>
                </div>
              ) : comments.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <MessageCircle size={36} color="rgba(255,255,255,0.2)" />
                  <span style={styles.emptyText}>Nenhum comentário ainda.</span>
                  <span style={styles.emptySub}>Seja o primeiro a deixar seu shape falar!</span>
                </div>
              ) : (
                comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    style={styles.commentItem}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div style={styles.avatarCol}>
                      {comment.avatar_url ? (
                        <img src={comment.avatar_url} alt="" style={styles.avatarImg} />
                      ) : (
                        <div style={styles.avatarPlaceholder}>
                          {comment.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={styles.commentBody}>
                      <div style={styles.commentMeta}>
                        <span style={styles.username}>@{comment.username}</span>
                        <span style={styles.time}>{formatTime(comment.created_at)}</span>
                      </div>
                      <p style={styles.commentContent}>{comment.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={listEndRef} />
            </div>

            {/* Input Footer */}
            {user ? (
              <form onSubmit={handleSubmit} style={styles.footer}>
                <input
                  type="text"
                  placeholder="Adicione um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={styles.input}
                  disabled={isSubmitting}
                />
                <motion.button
                  type="submit"
                  style={{
                    ...styles.sendBtn,
                    background: newComment.trim() ? '#00D4FF' : 'rgba(255,255,255,0.05)',
                    boxShadow: newComment.trim() ? '0 0 15px rgba(0,212,255,0.4)' : 'none',
                  }}
                  whileTap={newComment.trim() ? { scale: 0.9 } : {}}
                  disabled={!newComment.trim() || isSubmitting}
                >
                  <Send size={16} color={newComment.trim() ? '#0A0A0F' : 'rgba(255,255,255,0.3)'} />
                </motion.button>
              </form>
            ) : (
              <div style={styles.footerPlaceholder}>
                Faça login para comentar.
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 10000,
  },
  sheet: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    height: '65vh',
    background: 'rgba(10, 10, 15, 0.94)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    borderTopLeftRadius: '28px',
    borderTopRightRadius: '28px',
    zIndex: 10001,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -15px 40px rgba(0,0,0,0.5)',
  },
  dragHandle: {
    width: '40px',
    height: '5px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '3px',
    margin: '12px auto 4px',
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: 700,
    background: 'rgba(0,212,255,0.15)',
    color: '#00D4FF',
    padding: '2px 8px',
    borderRadius: '12px',
    fontFamily: "'Inter', sans-serif",
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  commentsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    gap: '12px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2.5px solid rgba(0,212,255,0.2)',
    borderTopColor: '#00D4FF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    gap: '10px',
  },
  emptyText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    marginTop: '6px',
  },
  emptySub: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  commentItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  avatarCol: {
    flexShrink: 0,
  },
  avatarImg: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4FF, #0072FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '14px',
  },
  commentBody: {
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '10px 14px',
  },
  commentMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  username: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
  },
  time: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
  },
  commentContent: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: '1.45',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  footer: {
    padding: '16px 20px max(env(safe-area-inset-bottom, 16px), 16px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    background: 'rgba(10, 10, 15, 0.98)',
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '12px 18px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  footerPlaceholder: {
    padding: '16px 20px max(env(safe-area-inset-bottom, 16px), 16px)',
    textAlign: 'center',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  }
};
