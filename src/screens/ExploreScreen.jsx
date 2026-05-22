import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, ChevronRight } from 'lucide-react';
import { useSocialStore } from '../stores/socialStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const { searchUsers, searchResults, isSearching, clearSearch } = useSocialStore();
  const navigate = useNavigationStore((s) => s.navigate);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers(query);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchUsers]);

  // Limpar busca ao sair
  useEffect(() => {
    return () => clearSearch();
  }, [clearSearch]);

  const handleOpenProfile = (userId) => {
    navigate('public_profile', { userId });
  };

  return (
    <ScreenWrapper screenKey="explore">
      {/* Liquid Bubble Animated Backgrounds */}
      <motion.div
        style={styles.bgBlob1}
        animate={{ x: [0, 50, -30, 0], y: [0, -30, 50, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={styles.bgBlob2}
        animate={{ x: [0, -40, 40, 0], y: [0, 50, -40, 0], scale: [1, 0.9, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div style={styles.container}>
        {/* Header with Search Bar */}
        <div style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={20} color="rgba(255,255,255,0.6)" />
            <input
              style={styles.searchInput}
              placeholder="Pesquisar usuários..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isSearching ? (
            <div style={styles.centerMessage}>Buscando...</div>
          ) : query.length >= 2 && searchResults.length === 0 ? (
            <div style={styles.centerMessage}>Nenhum usuário encontrado.</div>
          ) : query.length < 2 ? (
            <div style={styles.centerMessage}>Digite pelo menos 2 caracteres para buscar.</div>
          ) : (
            <div style={styles.resultsList}>
              {searchResults.map((u) => (
                <motion.div
                  key={u.id}
                  style={styles.userCard}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenProfile(u.id)}
                >
                  <div style={styles.avatar}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.username} style={styles.avatarImg} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>
                        {u.display_name?.charAt(0) || u.username?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.userInfo}>
                    <span style={styles.displayName}>{u.display_name || u.username}</span>
                    <span style={styles.username}>@{u.username}</span>
                    <span style={styles.followers}>{u.followers || 0} seguidores</span>
                  </div>

                  <ChevronRight size={20} color="rgba(255,255,255,0.4)" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 },
  bgBlob1: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '10%', left: '-20%', zIndex: 0, pointerEvents: 'none',
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '350px', minHeight: '350px',
    background: 'radial-gradient(circle, rgba(57,255,20,0.1) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '50%', right: '-10%', zIndex: 0, pointerEvents: 'none',
  },
  header: {
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '20px',
    padding: '12px 16px',
    gap: '12px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    paddingBottom: '100px',
  },
  centerMessage: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '40px',
    fontSize: '14px',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '24px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(30px)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid rgba(255,255,255,0.2)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '20px',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  displayName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  username: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  followers: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '4px',
  },
};
