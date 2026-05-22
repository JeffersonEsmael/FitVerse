import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, MessageCircle, Bell, User } from 'lucide-react';
import { useNavigationStore } from '../../stores/navigationStore';

const tabs = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'explore', icon: Search, label: 'Explorar' },
  { id: 'messages', icon: MessageCircle, label: 'Mensagens' },
  { id: 'notifications', icon: Bell, label: 'Notificações' },
  { id: 'profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={styles.tab}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.85,
                  color: isActive ? '#00D4FF' : '#6C6C88',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Icon size={24} />
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
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '48px',
    height: '48px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.2)',
    zIndex: -1,
  },
};
