import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Heart } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../config/supabase';

export default function CommentsSheet({ isOpen, onClose, videoId }) {
  const { fetchComments, addComment, toggleCommentLike } = useFeedStore();
  const { user } = useAuthStore();
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id: commentId, username }
  const [expandedComments, setExpandedComments] = useState(new Set()); // Set of parent comment IDs that are expanded
  
  const listEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load comments and their liked status
  const loadComments = async () => {
    if (!videoId) return;
    setIsLoading(true);
    try {
      const data = await fetchComments(videoId);
      
      // Fetch liked comments by current user
      let likedCommentIds = new Set();
      if (user && data.length > 0) {
        const commentIds = data.map((c) => c.id);
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.uid)
          .in('comment_id', commentIds);
        if (likes) {
          likes.forEach((l) => likedCommentIds.add(l.comment_id));
        }
      }
      
      const formatted = data.map((c) => ({
        ...c,
        hasLiked: likedCommentIds.has(c.id),
        likes: c.likes || 0,
      }));
      
      setComments(formatted);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && videoId) {
      loadComments();
      setReplyingTo(null);
      setExpandedComments(new Set());
    }
  }, [isOpen, videoId, user?.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || !user) return;
    
    setIsSubmitting(true);
    const parentId = replyingTo ? replyingTo.id : null;
    const result = await addComment(videoId, newComment.trim(), parentId);
    
    if (result.success && result.comment) {
      const newCommentWithLike = {
        ...result.comment,
        hasLiked: false,
        likes: 0,
      };

      setComments((prev) => [newCommentWithLike, ...prev]);
      setNewComment('');
      
      // If we replied, make sure the replies section is expanded
      if (parentId) {
        setExpandedComments((prev) => {
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }

      setReplyingTo(null);
      
      // Scroll to list end or top
      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    setIsSubmitting(false);
  };

  const handleLikeToggle = async (commentId) => {
    if (!user) return;
    
    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const newHasLiked = !c.hasLiked;
          return {
            ...c,
            hasLiked: newHasLiked,
            likes: newHasLiked ? c.likes + 1 : Math.max(c.likes - 1, 0),
          };
        }
        return c;
      })
    );

    const result = await toggleCommentLike(commentId);
    if (!result.success) {
      // Revert on failure
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const revertedHasLiked = !c.hasLiked;
            return {
              ...c,
              hasLiked: revertedHasLiked,
              likes: revertedHasLiked ? c.likes + 1 : Math.max(c.likes - 1, 0),
            };
          }
          return c;
        })
      );
    }
  };

  const handleReplyClick = (comment) => {
    setReplyingTo({ id: comment.id, username: comment.username });
    setNewComment(`@${comment.username} `);
    inputRef.current?.focus();
  };

  const toggleRepliesExpand = (parentId) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  // Group top-level comments and child comments
  const topLevelComments = comments.filter((c) => !c.parent_id);
  const getRepliesForComment = (parentId) => comments.filter((c) => c.parent_id === parentId);

  // Render a single comment item (can be parent or child)
  const renderCommentItem = (comment, isChild = false) => {
    return (
      <div key={comment.id} style={{ ...styles.commentItem, marginLeft: isChild ? '44px' : '0' }}>
        <div style={styles.avatarCol}>
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {comment.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div style={styles.commentContentCol}>
          <div style={styles.commentMetaRow}>
            <span style={styles.username}>@{comment.username}</span>
            <span style={styles.time}>{formatTime(comment.created_at)}</span>
          </div>
          
          <p style={styles.commentContent}>{comment.content}</p>
          
          <div style={styles.interactionRow}>
            {comment.likes > 0 && (
              <span style={styles.likesText}>
                {comment.likes} {comment.likes === 1 ? 'like' : 'likes'}
              </span>
            )}
            <button style={styles.replyBtn} onClick={() => handleReplyClick(comment)}>
              Responder
            </button>
          </div>
        </div>

        {/* Liking Heart on the right */}
        {user && (
          <motion.button
            style={styles.likeBtn}
            onClick={() => handleLikeToggle(comment.id)}
            whileTap={{ scale: 0.8 }}
          >
            <Heart
              size={14}
              color={comment.hasLiked ? '#FF2D55' : 'rgba(255,255,255,0.4)'}
              fill={comment.hasLiked ? '#FF2D55' : 'none'}
            />
          </motion.button>
        )}
      </div>
    );
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
              ) : topLevelComments.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <MessageCircle size={36} color="rgba(255,255,255,0.2)" />
                  <span style={styles.emptyText}>Nenhum comentário ainda.</span>
                  <span style={styles.emptySub}>Seja o primeiro a deixar seu shape falar!</span>
                </div>
              ) : (
                topLevelComments.map((comment) => {
                  const replies = getRepliesForComment(comment.id);
                  const isExpanded = expandedComments.has(comment.id);
                  
                  return (
                    <div key={comment.id} style={styles.commentThreadGroup}>
                      {/* Parent Comment */}
                      {renderCommentItem(comment)}

                      {/* Expand / Collapse Replies Button */}
                      {replies.length > 0 && (
                        <button
                          style={styles.viewRepliesBtn}
                          onClick={() => toggleRepliesExpand(comment.id)}
                        >
                          <span style={styles.threadLineSmall} />
                          {isExpanded
                            ? 'Ocultar respostas'
                            : `Ver mais respostas (${replies.length})`}
                        </button>
                      )}

                      {/* Render Nested Replies */}
                      <AnimatePresence>
                        {isExpanded && replies.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={styles.repliesWrapper}
                          >
                            {/* Visual Connecting Thread Line */}
                            <div style={styles.threadLineVertical} />
                            <div style={styles.repliesListInner}>
                              {replies.map((reply) => renderCommentItem(reply, true))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
              <div ref={listEndRef} />
            </div>

            {/* Replying Banner */}
            {replyingTo && (
              <div style={styles.replyingBanner}>
                <span style={styles.replyingText}>
                  Respondendo a <strong style={{ color: '#00D4FF' }}>@{replyingTo.username}</strong>
                </span>
                <button style={styles.cancelReplyBtn} onClick={() => setReplyingTo(null)}>
                  <X size={14} color="rgba(255,255,255,0.6)" />
                </button>
              </div>
            )}

            {/* Input Footer */}
            {user ? (
              <form onSubmit={handleSubmit} style={styles.footer}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={replyingTo ? `Responder a @${replyingTo.username}...` : "Adicione um comentário..."}
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
    height: '70vh',
    background: 'rgba(10, 10, 15, 0.96)',
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
    gap: '20px',
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
  commentThreadGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  commentItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    position: 'relative',
  },
  avatarCol: {
    flexShrink: 0,
  },
  avatarImg: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  avatarPlaceholder: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4FF, #0072FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '13px',
  },
  commentContentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '16px',
    padding: '8px 12px',
    position: 'relative',
  },
  commentMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  username: {
    fontSize: '12px',
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
    lineHeight: '1.4',
    margin: '2px 0 4px',
    whiteSpace: 'pre-wrap',
    fontFamily: "'Inter', sans-serif",
  },
  interactionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '2px',
  },
  likesText: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 600,
  },
  replyBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '10px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 700,
    cursor: 'pointer',
  },
  likeBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    alignSelf: 'center',
  },
  viewRepliesBtn: {
    background: 'none',
    border: 'none',
    alignSelf: 'flex-start',
    marginLeft: '44px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
  },
  threadLineSmall: {
    width: '16px',
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
  },
  repliesWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  threadLineVertical: {
    position: 'absolute',
    left: '16px',
    top: '-8px',
    bottom: '16px',
    width: '1.5px',
    background: 'rgba(255,255,255,0.06)',
  },
  repliesListInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  replyingBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0, 212, 255, 0.08)',
    borderTop: '1px solid rgba(0, 212, 255, 0.15)',
    padding: '8px 20px',
  },
  replyingText: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: "'Inter', sans-serif",
  },
  cancelReplyBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: '12px 20px max(env(safe-area-inset-bottom, 12px), 12px)',
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
    padding: '10px 18px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  sendBtn: {
    width: '38px',
    height: '38px',
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
