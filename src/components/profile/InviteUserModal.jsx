import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../config/supabase';
import verifiedBadgeImg from '../../assets/verified.png';

export default function InviteUserModal({ isOpen, onClose, title, subtitle, targetRoleFilter, onInvite }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState([]);
  const [sendingId, setSendingId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query || query.trim().length < 2) return;

    setIsSearching(true);
    try {
      let q = supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
        .limit(15);

      if (targetRoleFilter) {
        q = q.eq('profile_type', targetRoleFilter);
      }

      const { data, error } = await q;
      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('[InviteUserModal] search error:', err.message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendInvite = async (user) => {
    setSendingId(user.id);
    try {
      const res = await onInvite(user);
      if (res?.success !== false) {
        setInvitedIds(prev => [...prev, user.id]);
      } else {
        alert(res?.error || 'Erro ao enviar convite.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao enviar convite.');
    } finally {
      setSendingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={styles.modalCard}
      >
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>{title || 'Enviar Convite'}</h3>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#999" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <div style={styles.searchInputWrapper}>
            <Search size={18} color="#888" style={styles.searchIcon} />
            <input 
              type="text"
              placeholder={targetRoleFilter === 'trainer' ? "Buscar personal por @nome ou nome..." : "Buscar aluno por @nome ou nome..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn} disabled={isSearching}>
              {isSearching ? <Loader2 size={16} color="#000" style={{ animation: 'spin 1s linear infinite' }} /> : 'Buscar'}
            </button>
          </div>
        </form>

        {/* Results List */}
        <div style={styles.resultsContainer}>
          {results.length === 0 && !isSearching && query.length >= 2 && (
            <div style={styles.emptyState}>
              <span>Nenhum usuário encontrado.</span>
            </div>
          )}

          {results.length === 0 && query.length < 2 && (
            <div style={styles.emptyState}>
              <span>Digite ao menos 2 letras para pesquisar.</span>
            </div>
          )}

          {results.map((user) => {
            const isInvited = invitedIds.includes(user.id);
            const isSending = sendingId === user.id;

            return (
              <div key={user.id} style={styles.userRow}>
                <div style={styles.userInfo}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" style={styles.avatar} />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {(user.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={styles.userNames}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={styles.displayName}>{user.display_name || user.username}</span>
                      {user.profile_type !== 'personal' && (
                        <img src={verifiedBadgeImg} alt="" style={{ width: '14px', height: '14px' }} />
                      )}
                    </div>
                    <span style={styles.username}>@{user.username}</span>
                  </div>
                </div>

                <button 
                  style={{
                    ...styles.inviteBtn,
                    background: isInvited ? 'rgba(57,255,20,0.15)' : 'linear-gradient(135deg, #00D4FF, #0055FF)',
                    color: isInvited ? '#39FF14' : '#000',
                    borderColor: isInvited ? 'rgba(57,255,20,0.4)' : 'transparent',
                  }}
                  disabled={isInvited || isSending}
                  onClick={() => handleSendInvite(user)}
                >
                  {isSending ? (
                    <Loader2 size={16} color="#000" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : isInvited ? (
                    <>
                      <Check size={14} color="#39FF14" style={{ marginRight: '4px' }} />
                      <span>Enviado</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} color="#000" style={{ marginRight: '4px' }} />
                      <span>Convidar</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#1E202C',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '85vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    margin: '4px 0 0 0',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  searchForm: {
    width: '100%',
  },
  searchInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    padding: '4px 6px 4px 14px',
  },
  searchIcon: {
    marginRight: '8px',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  searchBtn: {
    background: 'linear-gradient(135deg, #00D4FF, #0055FF)',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 16px',
    color: '#000',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    maxHeight: '320px',
    paddingRight: '4px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 10px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#333',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
  },
  userNames: {
    display: 'flex',
    flexDirection: 'column',
  },
  displayName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: '14px',
  },
  username: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
  },
  inviteBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid transparent',
    borderRadius: '10px',
    padding: '6px 14px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
