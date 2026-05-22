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
      <div style={styles.container}>
        {/* Header with Search Bar */}
        <div style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={20} color="#6C6C88" />
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
                  whileTap={{ scale: 0.98 }}
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

                  <ChevronRight size={20} color="#6C6C88" />
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
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: {
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '12px 16px',
    gap: '12px',
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
    paddingBottom: '80px',
  },
  centerMessage: {
    textAlign: 'center',
    color: '#6C6C88',
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
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
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
    fontWeight: 600,
    color: '#fff',
  },
  username: {
    fontSize: '13px',
    color: '#B0B0C8',
  },
  followers: {
    fontSize: '12px',
    color: '#6C6C88',
    marginTop: '4px',
  },
};
