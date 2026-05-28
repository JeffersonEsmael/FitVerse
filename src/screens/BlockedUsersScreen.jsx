import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ShieldAlert, UserMinus, UserCheck } from 'lucide-react';
import { useNavigationStore } from '../stores/navigationStore';
import { useAuthStore } from '../stores/authStore';
import { useBlockedStore } from '../stores/blockedStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function BlockedUsersScreen() {
  const navigate = useNavigationStore((s) => s.navigate);
  const { user } = useAuthStore();
  const { blockedUsers, isLoading, fetchBlockedUsers, unblockUser } = useBlockedStore();

  useEffect(() => {
    if (user?.uid) {
      fetchBlockedUsers(user.uid);
    }
  }, [user?.uid, fetchBlockedUsers]);

  const handleUnblock = async (targetUserId) => {
    if (user?.uid) {
      await unblockUser(user.uid, targetUserId);
    }
  };

  return (
    <ScreenWrapper screenKey="blocked_users">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('settings')}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Usuários Bloqueados</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isLoading && blockedUsers.length === 0 ? (
            <div style={styles.centerWrap}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Carregando lista...</span>
            </div>
          ) : blockedUsers.length === 0 ? (
            <motion.div
              style={styles.emptyState}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={styles.emptyIconWrap}
              >
                <ShieldAlert size={48} color="#FF2D55" />
              </motion.div>
              <span style={styles.emptyTitle}>Sua lista está limpa!</span>
              <span style={styles.emptySubtitle}>Você não bloqueou nenhum usuário no FitVerse.</span>
            </motion.div>
          ) : (
            <div style={styles.list}>
              <p style={styles.introText}>
                Usuários bloqueados não podem ver seus posts, te mandar mensagens ou ver seu perfil.
              </p>

              <AnimatePresence>
                {blockedUsers.map((blocked, index) => (
                  <motion.div
                    key={blocked.id}
                    style={styles.row}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0, height: 0, padding: 0, marginBottom: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 350, damping: 25 }}
                  >
                    {/* User profile */}
                    <div style={styles.profile}>
                      <div style={styles.avatar}>
                        {blocked.avatar_url ? (
                          <img src={blocked.avatar_url} style={styles.avatarImg} alt="" />
                        ) : (
                          <div style={styles.avatarPlaceholder}>
                            {blocked.display_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div style={styles.info}>
                        <span style={styles.displayName}>{blocked.display_name}</span>
                        <span style={styles.username}>@{blocked.username}</span>
                      </div>
                    </div>

                    {/* Unblock button */}
                    <motion.button
                      style={styles.unblockBtn}
                      onClick={() => handleUnblock(blocked.id)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ backgroundColor: 'rgba(255, 45, 85, 0.1)' }}
                    >
                      <UserCheck size={14} />
                      <span>Desbloquear</span>
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
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
    color: '#fff',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
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
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  centerWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '2.5px solid rgba(255,255,255,0.15)',
    borderTopColor: '#FF2D55',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '40px 24px',
  },
  emptyIconWrap: {
    width: '96px',
    height: '96px',
    borderRadius: '32px',
    background: 'rgba(255, 45, 85, 0.05)',
    border: '1px solid rgba(255, 45, 85, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 12px 32px rgba(255, 45, 85, 0.05)',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    color: '#fff',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: '1.5',
    textAlign: 'center',
    maxWidth: '260px',
  },
  introText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: '1.5',
    margin: '0 0 20px',
    fontFamily: "'Inter', sans-serif",
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    marginBottom: '10px',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    overflow: 'hidden',
  },
  profile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  displayName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  username: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unblockBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '12px',
    background: 'rgba(255, 45, 85, 0.05)',
    border: '1px solid rgba(255, 45, 85, 0.15)',
    color: '#FF2D55',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
};
