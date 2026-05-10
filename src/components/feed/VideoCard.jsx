import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Volume2, VolumeX } from 'lucide-react';
import VideoActions from './VideoActions';
import VideoInfo from './VideoInfo';

export default function VideoCard({ video, isActive, index }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.currentTime = 0;
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 800);
    } else {
      el.play().then(() => setIsPlaying(true));
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) videoRef.current.muted = !isMuted;
  };

  return (
    <div style={styles.container} onClick={togglePlay}>
      {/* Video element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        style={styles.video}
        loop
        muted={isMuted}
        playsInline
        preload={isActive ? 'auto' : 'metadata'}
      />

      {/* Gradient overlays */}
      <div style={styles.gradientTop} />
      <div style={styles.gradientBottom} />

      {/* Play icon on pause */}
      {showPlayIcon && (
        <motion.div
          style={styles.playIcon}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.8 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Play size={64} fill="white" color="white" />
        </motion.div>
      )}

      {/* Mute toggle */}
      <motion.button
        style={styles.muteBtn}
        onClick={toggleMute}
        whileTap={{ scale: 0.85 }}
      >
        {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
      </motion.button>

      {/* Video info (bottom-left) */}
      <VideoInfo video={video} />

      {/* Action buttons (right side) */}
      <VideoActions video={video} />
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flexShrink: 0,
    background: '#000',
    overflow: 'hidden',
    scrollSnapAlign: 'start',
  },
  video: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    minWidth: '100%',
    minHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'cover',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '120px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '280px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  playIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  muteBtn: {
    position: 'absolute',
    top: '60px',
    right: '16px',
    zIndex: 10,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
  },
};
