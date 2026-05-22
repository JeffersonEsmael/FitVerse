import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, Trophy, Award, ShoppingBag, Bell } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import ShapeIcon from '../components/icons/ShapeIcon';

// Map notification types to text and icons
const notifConfig = {
  follow: { text: 'começou a te seguir', icon: UserPlus, color: '#A855F7' },
  shape: { text: 'deu shape no seu vídeo', icon: (props) => <ShapeIcon filled={true} size={props.size} color={props.color} />, color: '#39FF14' },
  comment: { text: 'comentou no seu vídeo', icon: MessageCircle, color: '#00D4FF' },
  save: { text: 'salvou seu vídeo', icon: Heart, color: '#FF2D55' },
};

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

  const handleNotifClick = (notif) => {
    if (notif.type === 'follow' && notif.sender_id) {
      navigate('public_profile', { userId: notif.sender_id });
    }
  };

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
          <Bell size={24} color="#fff" />
          <h2 style={styles.title}>Notificações</h2>
        </div>

        <div style={styles.section}>
          {isLoadingNotifs && notifications.length === 0 ? (
            <div style={styles.centerText}>Carregando...</div>
          ) : notifications.length === 0 ? (
            <div style={styles.emptyState}>
              <Bell size={48} color="rgba(255,255,255,0.4)" />
              <span style={styles.centerText}>Nenhuma notificação ainda.</span>
            </div>
          ) : (
            notifications.map((notif, i) => {
              const config = notifConfig[notif.type] || { text: 'interagiu com você', icon: Bell, color: '#6C6C88' };
              const Icon = config.icon;
              const senderName = notif.sender?.username || 'Usuário';

              return (
                <motion.div
                  key={notif.id}
                  style={{ ...styles.notifRow, background: notif.read ? 'rgba(255,255,255,0.05)' : 'rgba(0,212,255,0.1)' }}
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNotifClick(notif)}
                  whileTap={{ scale: 0.95 }}
                >
                  <div style={styles.avatar}>
                    {notif.sender?.avatar_url ? (
                      <img src={notif.sender.avatar_url} style={styles.avatarImg} alt="" />
                    ) : (
                      <div style={styles.avatarPlaceholder}>{senderName.charAt(0)}</div>
                    )}
                  </div>
                  
                  <div style={styles.info}>
                    <span style={styles.text}>
                      <strong style={styles.username}>@{senderName}</strong> {config.text}
                    </span>
                    <span style={styles.time}>{new Date(notif.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div style={{ ...styles.iconWrap, background: `${config.color}15`, border: `1px solid ${config.color}30` }}>
                    <Icon size={16} color={config.color} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '100px', position: 'relative', zIndex: 1 },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '-10%', left: '-20%', zIndex: 0, pointerEvents: 'none',
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '60%', right: '-10%', zIndex: 0, pointerEvents: 'none',
  },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: '-0.5px' },
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  notifRow: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '24px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)', boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' },
  iconWrap: { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(10px)' },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  text: { fontSize: '15px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.4', fontFamily: "'Inter', sans-serif" },
  username: { color: '#fff', fontWeight: 700, fontFamily: "'Outfit', sans-serif" },
  time: { fontSize: '12px', color: 'rgba(255,255,255,0.5)' },
  centerText: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginTop: '10px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }
};
