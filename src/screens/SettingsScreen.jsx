import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, User, Lock, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function SettingsScreen() {
  const { logout } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const handleLogout = async () => {
    await logout();
    navigate('auth');
  };

  const menuItems = [
    {
      id: 'edit_profile',
      icon: User,
      title: 'Editar Perfil',
      description: 'Nome, foto, bio e @',
      color: '#00D4FF',
      onClick: () => navigate('edit_profile'),
    },
    {
      id: 'privacy_settings',
      icon: Lock,
      title: 'Privacidade',
      description: 'Conta pública ou privada',
      color: '#39FF14',
      onClick: () => navigate('privacy_settings'),
    },
    {
      id: 'logout',
      icon: LogOut,
      title: 'Sair da Conta',
      description: 'Encerrar sessão no dispositivo',
      color: '#FF2D55',
      onClick: handleLogout,
      isDanger: true,
    },
  ];

  return (
    <ScreenWrapper screenKey="settings">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('profile')}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Configurações</h2>
          <div style={{ width: 24 }} /> {/* Balance the flex header */}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.menuList}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  onClick={item.onClick}
                  style={item.isDanger ? styles.menuItemDanger : styles.menuItem}
                  whileTap={{ scale: 0.98 }}
                >
                  <div style={styles.itemLeft}>
                    <div style={{ ...styles.iconWrapper, backgroundColor: `${item.color}15` }}>
                      <Icon size={20} color={item.color} />
                    </div>
                    <div style={styles.textWrapper}>
                      <span style={styles.itemTitle}>{item.title}</span>
                      <span style={styles.itemDescription}>{item.description}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0A0A0F',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  content: {
    flex: 1,
    padding: '24px 16px',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    backdropFilter: 'blur(30px)',
    transition: 'all 0.2s ease',
  },
  menuItemDanger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '16px',
    background: 'rgba(255, 45, 85, 0.03)',
    border: '1px solid rgba(255, 45, 85, 0.1)',
    cursor: 'pointer',
    backdropFilter: 'blur(30px)',
    transition: 'all 0.2s ease',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
  },
  itemDescription: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: "'Inter', sans-serif",
  },
};
