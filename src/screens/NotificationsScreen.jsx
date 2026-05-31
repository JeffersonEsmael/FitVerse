import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, Award, Bell, AtSign, Play } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';

// Map notification types to text, icons and colors
const notifConfig = {
  follow: { text: 'começou a te seguir', icon: UserPlus, color: '#A855F7' },
  shape: {
    text: 'deu shape no seu vídeo',
    icon: (props) => <ShapeIcon filled={true} size={props.size} color={props.color} />,
    color: '#39FF14',
  },
  comment: { text: 'comentou:', icon: MessageCircle, color: '#00D4FF' },
  mention: { text: 'mencionou você em um comentário', icon: AtSign, color: '#FF9500' },
  save: { text: 'salvou seu vídeo', icon: Heart, color: '#FF2D55' },
  boost: { text: 'deu boost no seu vídeo', icon: Award, color: '#FFD700' },
  message: { text: 'te enviou uma mensagem', icon: MessageCircle, color: '#A855F7' },
};

// Group notifications by date: Today, This Week, Earlier
function groupNotifications(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = { today: [], thisWeek: [], earlier: [] };

  notifications.forEach((notif) => {
    const notifDate = new Date(notif.created_at);
    if (notifDate >= today) {
      groups.today.push(notif);
    } else if (notifDate >= weekAgo) {
      groups.thisWeek.push(notif);
    } else {
      groups.earlier.push(notif);
    }
  });

  return groups;
}

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function NotificationRow({ notif, index, onNotifClick }) {
  const config = notifConfig[notif.type] || { text: 'interagiu com você', icon: Bell, color: '#6C6C88' };
  const Icon = config.icon;
  const senderName = notif.sender?.username || 'Usuário';
  const hasPreview = notif.type === 'comment' && notif.reference_data?.preview;
  const hasVideoThumb = ['shape', 'comment', 'save', 'boost', 'mention'].includes(notif.type) && notif.reference_data?.video_thumbnail;

  return (
    <motion.div
      style={{
        ...styles.notifRow,
        background: notif.read ? 'rgba(255,255,255,0.03)' : 'rgba(0,212,255,0.06)',
        borderColor: notif.read ? 'rgba(255,255,255,0.06)' : 'rgba(0,212,255,0.15)',
      }}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => onNotifClick(notif)}
      whileTap={{ scale: 0.97 }}
    >
      {/* Avatar */}
      <div style={styles.avatar}>
        {notif.sender?.avatar_url ? (
          <img src={notif.sender.avatar_url} style={styles.avatarImg} alt="" />
        ) : (
          <div style={styles.avatarPlaceholder}>{senderName.charAt(0).toUpperCase()}</div>
        )}
        {/* Notification type badge on avatar */}
        <div style={{ ...styles.typeBadge, background: config.color, boxShadow: `0 0 8px ${config.color}50` }}>
          <Icon size={10} color="#fff" />
        </div>
      </div>

      {/* Info */}
      <div style={styles.info}>
        <span style={styles.text}>
          <strong style={styles.username}>@{senderName}</strong> {config.text}
        </span>
        {/* Comment preview */}
        {hasPreview && (
          <span style={styles.commentPreview}>"{notif.reference_data.preview}"</span>
        )}
        <span style={styles.time}>{formatRelativeTime(notif.created_at)}</span>
      </div>

      {/* Video thumbnail for video-related notifs */}
      {hasVideoThumb ? (
        <div style={styles.videoThumb}>
          <img src={notif.reference_data.video_thumbnail} alt="" style={styles.videoThumbImg} />
          <div style={styles.videoThumbOverlay}>
            <Play size={12} color="#fff" fill="#fff" />
          </div>
        </div>
      ) : (
        <div style={{ ...styles.iconWrap, background: `${config.color}12`, border: `1px solid ${config.color}25` }}>
          <Icon size={16} color={config.color} />
        </div>
      )}
    </motion.div>
  );
}

function SectionHeader({ title, count }) {
  return (
    <div style={styles.sectionHeader}>
      <span style={styles.sectionTitle}>{title}</span>
      {count > 0 && <span style={styles.sectionCount}>{count}</span>}
    </div>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const { notifications, isLoadingNotifs, fetchNotifications, markNotificationsRead } = useSocialStore();

  useEffect(() => {
    if (user?.uid) {
      fetchNotifications(user.uid);
      markNotificationsRead(user.uid);
    }
  }, [user?.uid, fetchNotifications, markNotificationsRead]);

  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  const handleNotifClick = async (notif) => {
    if (notif.type === 'follow' && notif.sender_id) {
      navigate('public_profile', { params: { userId: notif.sender_id } });
    } else if (notif.type === 'message' && notif.reference_id && notif.sender_id) {
      navigate('messages', { params: { conversationId: notif.reference_id, otherUserId: notif.sender_id } });
    } else if (['shape', 'comment', 'save', 'boost', 'mention'].includes(notif.type)) {
      // For video-related notifs, navigate to the video if reference_id is available
      if (notif.reference_id) {
        const feedStore = useFeedStore.getState();
        const vIndex = feedStore.videos.findIndex((v) => v.id === notif.reference_id);
        if (vIndex !== -1) {
          feedStore.setCurrentIndex(vIndex);
          navigate('feed');
        } else {
          // Fetch the specific video from Supabase and insert it at the beginning of the feed
          try {
            const { supabase } = await import('../config/supabase');
            const { data, error } = await supabase
              .from('videos')
              .select('*')
              .eq('id', notif.reference_id)
              .single();
            if (data && !error) {
              const newVideo = {
                id: data.id,
                videoUrl: data.video_url,
                mediaType: data.media_type || 'video',
                userId: data.user_id,
                username: data.username,
                userAvatar: data.user_avatar || '',
                displayName: data.display_name,
                caption: data.caption || '',
                hashtags: data.hashtags || [],
                category: data.category || 'geral',
                shapes: data.shapes || 0,
                boosts: data.boosts || 0,
                gym_bag_saves: data.gym_bag_saves || 0,
                comments: data.comments || 0,
                shares: data.shares || 0,
                views: data.views || 0,
                hasShaped: false,
                hasBoosted: false,
                inGymBag: false,
                createdAt: new Date(data.created_at),
              };
              useFeedStore.setState({
                videos: [newVideo, ...feedStore.videos],
                currentIndex: 0,
              });
            }
          } catch (err) {
            console.error('Error fetching notification video:', err);
          }
          navigate('feed');
        }
      } else if (notif.sender_id) {
        navigate('public_profile', { params: { userId: notif.sender_id } });
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScreenWrapper screenKey="notifications">
      {/* Liquid Bubble Animated Backgrounds */}
      <motion.div
        style={styles.bgBlob1}
        animate={{ x: [0, 40, -40, 0], y: [0, -40, 40, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={styles.bgBlob2}
        animate={{ x: [0, -30, 30, 0], y: [0, 40, -30, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <Bell size={24} color="#fff" />
            <h2 style={styles.title}>Notificações</h2>
          </div>
          {unreadCount > 0 && (
            <motion.div
              style={styles.unreadBadge}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              {unreadCount} nova{unreadCount > 1 ? 's' : ''}
            </motion.div>
          )}
        </div>

        <div style={styles.section}>
          {isLoadingNotifs && notifications.length === 0 ? (
            <div style={styles.loadingState}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={styles.loadingSpinner}
              />
              <span style={styles.centerText}>Carregando...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div style={styles.emptyState}>
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <Bell size={48} color="rgba(255,255,255,0.3)" />
              </motion.div>
              <span style={styles.emptyTitle}>Nenhuma notificação</span>
              <span style={styles.emptySubtext}>Quando alguém interagir com seu conteúdo, aparecerá aqui</span>
            </div>
          ) : (
            <>
              {/* Today */}
              {grouped.today.length > 0 && (
                <>
                  <SectionHeader title="Hoje" count={grouped.today.length} />
                  {grouped.today.map((notif, i) => (
                    <NotificationRow key={notif.id} notif={notif} index={i} onNotifClick={handleNotifClick} />
                  ))}
                </>
              )}

              {/* This Week */}
              {grouped.thisWeek.length > 0 && (
                <>
                  <SectionHeader title="Esta semana" count={grouped.thisWeek.length} />
                  {grouped.thisWeek.map((notif, i) => (
                    <NotificationRow key={notif.id} notif={notif} index={i} onNotifClick={handleNotifClick} />
                  ))}
                </>
              )}

              {/* Earlier */}
              {grouped.earlier.length > 0 && (
                <>
                  <SectionHeader title="Anteriores" count={grouped.earlier.length} />
                  {grouped.earlier.map((notif, i) => (
                    <NotificationRow key={notif.id} notif={notif} index={i} onNotifClick={handleNotifClick} />
                  ))}
                </>
              )}
            </>
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
    paddingBottom: '100px',
    position: 'relative',
    zIndex: 1,
  },
  bgBlob1: {
    position: 'absolute',
    width: '60vw',
    height: '60vw',
    minWidth: '400px',
    minHeight: '400px',
    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)',
    top: '-10%',
    left: '-20%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgBlob2: {
    position: 'absolute',
    width: '50vw',
    height: '50vw',
    minWidth: '350px',
    minHeight: '350px',
    background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)',
    top: '60%',
    right: '-10%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
    letterSpacing: '-0.5px',
  },
  unreadBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 4px 12px rgba(0,212,255,0.3)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 4px 4px',
    marginTop: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Outfit', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  sectionCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: "'Inter', sans-serif",
  },
  notifRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '20px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'visible',
    position: 'relative',
  },
  avatarImg: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(255,255,255,0.15)',
  },
  avatarPlaceholder: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '18px',
    border: '2px solid rgba(255,255,255,0.15)',
  },
  typeBadge: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #0A0A0F',
    zIndex: 2,
  },
  iconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backdropFilter: 'blur(10px)',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  text: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: '1.4',
    fontFamily: "'Inter', sans-serif",
  },
  username: {
    color: '#fff',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
  },
  commentPreview: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
    fontFamily: "'Inter', sans-serif",
  },
  time: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: "'Inter', sans-serif",
  },
  videoThumb: {
    width: '48px',
    height: '64px',
    borderRadius: '10px',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  videoThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  videoThumbOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    paddingTop: '80px',
  },
  loadingSpinner: {
    width: '28px',
    height: '28px',
    border: '2.5px solid rgba(0,212,255,0.15)',
    borderTopColor: '#00D4FF',
    borderRadius: '50%',
  },
  centerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    gap: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  emptyTitle: {
    fontSize: '17px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: "'Outfit', sans-serif",
  },
  emptySubtext: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: '1.5',
    fontFamily: "'Inter', sans-serif",
  },
};
