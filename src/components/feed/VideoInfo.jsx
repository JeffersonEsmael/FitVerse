import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigationStore } from '../../stores/navigationStore';

export default function VideoInfo({ video, isFollowing, isSelf, onFollowToggle }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigationStore((s) => s.navigate);

  const handleUserClick = (e) => {
    e.stopPropagation();
    if (video.userId) {
      navigate('public_profile', { params: { userId: video.userId } });
    }
  };

  return (
    <div style={styles.container} onClick={(e) => e.stopPropagation()}>
      {/* Username */}
      <div style={styles.userRow}>
        <span style={{ ...styles.username, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} onClick={handleUserClick}>
          @{video.username}
          {(video.username?.toLowerCase() === 'flowrise' || video.username?.toLowerCase() === 'flowride') && (
            <span style={styles.verifiedBadge}>✓</span>
          )}
        </span>
        {!isSelf && (
          <motion.button
            style={{
              ...styles.followBtn,
              background: isFollowing ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderColor: isFollowing ? 'transparent' : 'rgba(255,255,255,0.3)',
              cursor: isFollowing ? 'default' : 'pointer',
              color: isFollowing ? 'rgba(255,255,255,0.4)' : '#fff',
            }}
            whileTap={isFollowing ? {} : { scale: 0.9 }}
            onClick={isFollowing ? undefined : onFollowToggle}
            disabled={isFollowing}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </motion.button>
        )}
      </div>

      {/* Caption */}
      <div
        style={styles.caption}
        onClick={() => video.caption?.length > 80 && setExpanded(!expanded)}
      >
        {video.caption?.length > 80 && !expanded
          ? `${video.caption.slice(0, 80)}...`
          : video.caption}
        {video.caption?.length > 80 && (
          <span style={styles.expandBtn}>
            {expanded ? ' (menos)' : ' (mais)'}
          </span>
        )}
      </div>

      {/* Hashtags */}
      <div style={styles.hashtags}>
        {video.hashtags?.slice(0, 4).map((tag) => (
          <span key={tag} style={styles.hashtag}>#{tag}</span>
        ))}
      </div>

      {/* Music */}
      <div style={styles.musicRow}>
        <span style={styles.musicIcon}>♪</span>
        <div style={styles.musicText}>
          <motion.span
            animate={{ x: [-200, 100] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            style={styles.musicMarquee}
          >
            Original sound — {video.displayName}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: '80px',
    left: '16px',
    right: '80px',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  username: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#00D4FF',
    color: '#0A0A0F',
    borderRadius: '50%',
    width: '14px',
    height: '14px',
    fontSize: '9px',
    fontWeight: 'bold',
    marginLeft: '4px',
    lineHeight: 1,
    flexShrink: 0,
  },
  followBtn: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  caption: {
    color: '#fff',
    fontSize: '14px',
    lineHeight: '1.4',
    fontFamily: "'Inter', sans-serif",
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
    cursor: 'pointer',
  },
  expandBtn: {
    color: '#00D4FF',
    fontWeight: 700,
    marginLeft: '6px',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },
  hashtags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  hashtag: {
    color: '#00D4FF',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  musicRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    width: '200px',
  },
  musicIcon: {
    color: '#fff',
    fontSize: '14px',
  },
  musicText: {
    overflow: 'hidden',
    flex: 1,
  },
  musicMarquee: {
    display: 'inline-block',
    color: '#fff',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    whiteSpace: 'nowrap',
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
};
