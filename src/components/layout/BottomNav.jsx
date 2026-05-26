import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, MessageCircle, Bell, User } from 'lucide-react';
import { useNavigationStore } from '../../stores/navigationStore';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useSocialStore } from '../../stores/socialStore';

const tabs = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'explore', icon: Search, label: 'Explorar' },
  { id: 'messages', icon: MessageCircle, label: 'Mensagens' },
  { id: 'notifications', icon: Bell, label: 'Notificações' },
  { id: 'profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useNavigationStore();
  const { user } = useAuthStore();
  const { conversations, fetchConversations } = useChatStore();
  const { notifications, fetchNotifications, markNotificationsRead } = useSocialStore();

  React.useEffect(() => {
    if (user?.uid) {
      fetchConversations(user.uid);
      fetchNotifications(user.uid);

      // Periodically refresh notifications/messages (every 10s)
      const interval = setInterval(() => {
        fetchConversations(user.uid);
        fetchNotifications(user.uid);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user?.uid]);

  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'notifications' && user?.uid) {
      markNotificationsRead(user.uid);
    }
  };

  const formatBadge = (count) => {
    if (count <= 0) return null;
    return count > 9 ? '+9' : `+${count}`;
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={styles.tab}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.85,
                  color: isActive ? '#00D4FF' : '#6C6C88',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{ position: 'relative', display: 'inline-flex', padding: '4px' }}
              >
                <Icon size={24} />
                {tab.id === 'messages' && totalUnreadMessages > 0 && (
                  <div style={styles.badge}>{formatBadge(totalUnreadMessages)}</div>
                )}
                {tab.id === 'notifications' && unreadNotifsCount > 0 && (
                  <div style={styles.badge}>{formatBadge(unreadNotifsCount)}</div>
                )}
              </motion.div>
              <motion.span
                style={{
                  ...styles.label,
                  color: isActive ? '#00D4FF' : '#6C6C88',
                }}
                animate={{ opacity: isActive ? 1 : 0.6 }}
              >
                {tab.label}
              </motion.span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  style={styles.indicator}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 'max(env(safe-area-inset-bottom, 20px), 20px)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '468px', // Restrict to mobile width
    zIndex: 50,
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '64px',
    padding: '0 8px',
    position: 'relative',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative', // this ensures the absolute indicator is positioned relative to the tab
    WebkitTapHighlightColor: 'transparent',
  },
  label: {
    display: 'none',
  },
  indicator: {
    position: 'absolute',
    top: 'calc(50% - 24px)',
    left: 'calc(50% - 24px)',
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.2)',
    zIndex: -1,
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: '#FF2D55',
    color: '#fff',
    borderRadius: '10px',
    minWidth: '16px',
    height: '16px',
    padding: '0 4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '9px',
    fontWeight: 'bold',
    fontFamily: "'Inter', sans-serif",
    border: '1.5px solid #0A0A0F',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
};
