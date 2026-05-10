import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function VideoInfo({ video }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={styles.container} onClick={(e) => e.stopPropagation()}>
      {/* Username */}
      <div style={styles.userRow}>
        <span style={styles.username}>@{video.username}</span>
        <motion.button
          style={styles.followBtn}
          whileTap={{ scale: 0.9 }}
        >
          Seguir
        </motion.button>
      </div>

      {/* Caption */}
      <div
        style={{ ...styles.caption, ...(expanded ? {} : styles.captionClamped) }}
        onClick={() => setExpanded(!expanded)}
      >
        {video.caption}
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
  captionClamped: {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
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
