import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Video, Play, Bookmark } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useFeedStore } from '../stores/feedStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

// Utility to format views counts
function formatViews(views) {
  if (!views || views < 0) return '0';
  if (views < 1000) return `${views}`;
  if (views < 1000000) {
    const val = views / 1000;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',');
    return `${formatted}k`;
  } else {
    const val = views / 1000000;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace('.', ',');
    return `${formatted}M`;
  }
}

export default function SavedItemsScreen() {
  const { user } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const { fetchGymBagVideos } = useFeedStore();
  const [savedVideos, setSavedVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      fetchGymBagVideos(user.uid)
        .then((videos) => {
          setSavedVideos(videos || []);
        })
        .catch((err) => {
          console.error('[SavedItemsScreen] Error loading saved videos:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [user?.uid, fetchGymBagVideos]);

  return (
    <ScreenWrapper screenKey="saved_items">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('settings')}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Itens Salvos</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loadingContainer}>
              <span style={styles.loadingText}>Carregando salvos...</span>
            </div>
          ) : savedVideos.length === 0 ? (
            <div style={styles.emptyContainer}>
              <Bookmark size={48} color="rgba(255,255,255,0.2)" />
              <span style={styles.emptyTitle}>Nenhum vídeo salvo</span>
              <span style={styles.emptyText}>Os vídeos que você salvar no feed aparecerão aqui.</span>
            </div>
          ) : (
            <div style={styles.videoGrid}>
              {savedVideos.map((post, idx) => (
                <motion.div
                  key={post.id}
                  style={styles.videoThumb}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('post_details', { params: { post, allPosts: savedVideos, startIndex: idx } })}
                >
                  {post.mediaType === 'image' ? (
                    <img src={post.videoUrl} alt="" style={styles.thumbMedia} />
                  ) : (
                    <video src={post.videoUrl} style={styles.thumbMedia} muted preload="metadata" />
                  )}
                  <div style={styles.videoOverlay}>
                    <div style={styles.viewsBadge}>
                      <Play size={10} fill="#fff" stroke="none" /> {formatViews(post.views)}
                    </div>
                  </div>
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
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0A0A0F',
    overflowY: 'auto',
    paddingBottom: '100px',
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
    padding: '16px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '60px 16px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  emptyText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: '1.4',
    maxWidth: '280px',
    fontFamily: "'Inter', sans-serif",
  },
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '20px',
  },
  videoThumb: {
    aspectRatio: '9/16',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
  },
  thumbMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '24px 10px 10px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
  },
  viewsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#fff',
    fontWeight: 700,
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
  },
};
