import React from 'react';
import { motion } from 'framer-motion';
import { Home, Search, PlusCircle, Trophy, User } from 'lucide-react';
import { useNavigationStore } from '../../stores/navigationStore';

const tabs = [
  { id: 'feed', icon: Home, label: 'Feed' },
  { id: 'explore', icon: Search, label: 'Explorar' },
  { id: 'create', icon: PlusCircle, label: '' },
  { id: 'ranking', icon: Trophy, label: 'Ranking' },
  { id: 'profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useNavigationStore();

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCreate = tab.id === 'create';
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(isCreate ? styles.createTab : {}),
              }}
              whileTap={{ scale: 0.9 }}
            >
              {isCreate ? (
                <motion.div
                  style={styles.createButton}
                  whileHover={{ scale: 1.1 }}
                  animate={{ boxShadow: isActive ? '0 0 25px rgba(0,212,255,0.5)' : '0 0 15px rgba(0,212,255,0.3)' }}
                >
                  <PlusCircle size={28} color="#fff" />
                </motion.div>
              ) : (
                <>
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
                </>
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
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: '64px',
    maxWidth: '500px',
    margin: '0 auto',
    padding: '0 8px',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    flex: 1,
    height: '100%',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: '8px 0',
    WebkitTapHighlightColor: 'transparent',
  },
  createTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(0,212,255,0.3)',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '3px',
    borderRadius: '0 0 4px 4px',
    background: '#00D4FF',
    boxShadow: '0 0 8px rgba(0,212,255,0.5)',
  },
};
