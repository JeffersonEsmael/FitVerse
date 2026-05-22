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
      <div style={styles.container}>
        <div style={styles.header}>
          <Bell size={22} color="#00D4FF" />
          <h2 style={styles.title}>Notificações</h2>
        </div>

        <div style={styles.section}>
          {isLoadingNotifs && notifications.length === 0 ? (
            <div style={styles.centerText}>Carregando...</div>
          ) : notifications.length === 0 ? (
            <div style={styles.emptyState}>
              <Bell size={40} color="#6C6C88" />
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
                  style={{ ...styles.notifRow, background: notif.read ? 'rgba(255,255,255,0.02)' : 'rgba(0,212,255,0.08)' }}
                  initial={{ x: -15, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNotifClick(notif)}
                  whileTap={{ scale: 0.98 }}
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
                  
                  <div style={{ ...styles.iconWrap, background: `${config.color}15` }}>
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
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: '80px' },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  notifRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' },
  avatar: { width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #00D4FF, #A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' },
  iconWrap: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  text: { fontSize: '14px', color: '#B0B0C8', lineHeight: '1.3', fontFamily: "'Inter', sans-serif" },
  username: { color: '#fff', fontWeight: 600 },
  time: { fontSize: '12px', color: '#6C6C88' },
  centerText: { textAlign: 'center', color: '#6C6C88', fontSize: '14px', marginTop: '10px' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px' }
};
