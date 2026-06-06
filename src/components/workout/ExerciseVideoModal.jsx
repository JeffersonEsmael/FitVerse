import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Dumbbell, Award, Video } from 'lucide-react';
import { fetchVideosForExercise } from '../../utils/exercises';
import verifiedBadgeImg from '../../assets/verified.png';

export default function ExerciseVideoModal({ isOpen, onClose, exerciseName }) {
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && exerciseName) {
      setIsLoading(true);
      setActiveVideo(null);
      setVideos([]);
      fetchVideosForExercise(exerciseName).then((res) => {
        setVideos(res);
        if (res.length > 0) {
          setActiveVideo(res[0]);
        }
        setIsLoading(false);
      });
    }
  }, [isOpen, exerciseName]);

  if (!isOpen) return null;

  const otherVideos = videos.filter((v) => v.id !== activeVideo?.id);

  const renderVerifiedBadge = (username) => {
    const clean = username?.toLowerCase() || '';
    if (clean === 'flowrise' || clean === 'flowride') {
      return (
        <img src={verifiedBadgeImg} alt="verificado" style={{ width: '14px', height: '14px', marginLeft: '4px', objectFit: 'contain', flexShrink: 0 }} />
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      <div style={styles.backdrop} onClick={onClose}>
        <motion.div
          style={styles.modal}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Video Player / Media Section */}
          <div style={styles.playerContainer}>
            {isLoading ? (
              <div style={styles.loaderContainer}>
                <div style={styles.spinner} />
                <span style={styles.loaderText}>Procurando demonstrações...</span>
              </div>
            ) : !activeVideo ? (
              <div style={styles.noVideoContainer}>
                <Dumbbell size={40} color="rgba(255,255,255,0.2)" />
                <span style={styles.noVideoTitle}>Sem vídeo demonstrativo</span>
                <p style={styles.noVideoText}>
                  Nenhuma execução foi publicada ainda para <strong>"{exerciseName}"</strong>.
                </p>
              </div>
            ) : (
              <video
                key={activeVideo.id}
                src={activeVideo.videoUrl}
                style={styles.videoPlayer}
                controls
                autoPlay
                playsInline
              />
            )}

            {/* Float Close Button */}
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={18} color="#fff" />
            </button>
          </div>

          {/* Active Video Meta Info */}
          <div style={styles.metaContainer}>
            <div style={styles.exerciseNameRow}>
              <span style={styles.dumbbellIcon}>💪</span>
              <span style={styles.exerciseTitle}>{exerciseName}</span>
            </div>

            {activeVideo && (
              <div style={styles.creatorRow}>
                {activeVideo.userAvatar ? (
                  <img src={activeVideo.userAvatar} alt="" style={styles.creatorAvatar} />
                ) : (
                  <div style={styles.creatorAvatarPlaceholder}>
                    {activeVideo.displayName?.charAt(0) || activeVideo.username?.charAt(0) || '?'}
                  </div>
                )}
                <div style={styles.creatorInfo}>
                  <div style={styles.creatorNameRow}>
                    <span style={styles.creatorDisplayName}>{activeVideo.displayName}</span>
                    {renderVerifiedBadge(activeVideo.username)}
                  </div>
                  <span style={styles.creatorUsername}>@{activeVideo.username}</span>
                </div>
                {activeVideo.isOfficial ? (
                  <span style={styles.officialTag}>
                    <Award size={12} style={{ marginRight: 4 }} /> Tutorial Oficial
                  </span>
                ) : (
                  <span style={styles.userVideoTag}>Vídeo da Comunidade</span>
                )}
              </div>
            )}

            {activeVideo?.caption && (
              <p style={styles.videoCaption}>"{activeVideo.caption}"</p>
            )}
          </div>

          {/* Related Videos List */}
          <div style={styles.relatedSection}>
            <span style={styles.relatedTitle}>
              {otherVideos.length > 0
                ? `Vídeos Relacionados de Outros Usuários (${otherVideos.length})`
                : 'Outras Execuções da Comunidade'}
            </span>

            {otherVideos.length === 0 ? (
              <div style={styles.emptyRelated}>
                <Video size={20} color="rgba(255,255,255,0.2)" />
                <span style={styles.emptyRelatedText}>Nenhum outro vídeo relacionado postado</span>
              </div>
            ) : (
              <div style={styles.relatedScrollList}>
                {otherVideos.map((vid) => (
                  <div
                    key={vid.id}
                    style={styles.relatedItem}
                    onClick={() => setActiveVideo(vid)}
                  >
                    <div style={styles.relatedThumb}>
                      {vid.mediaType === 'image' ? (
                        <img src={vid.videoUrl} alt="" style={styles.relatedThumbMedia} />
                      ) : (
                        <video src={vid.videoUrl} style={styles.relatedThumbMedia} muted preload="metadata" />
                      )}
                      <div style={styles.playOverlay}>
                        <Play size={14} color="#00D4FF" fill="#00D4FF" />
                      </div>
                    </div>
                    <div style={styles.relatedMeta}>
                      <div style={styles.relatedUserRow}>
                        <span style={styles.relatedUsername}>@{vid.username}</span>
                        {renderVerifiedBadge(vid.username)}
                      </div>
                      <p style={styles.relatedCaption}>{vid.caption || 'Exercício demonstrado'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(10px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    width: '100%',
    maxWidth: '460px',
    height: '82vh',
    background: '#0A0A0F',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '28px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  playerContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid rgba(0,212,255,0.15)',
    borderTopColor: '#00D4FF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Inter', sans-serif",
  },
  noVideoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '24px',
    gap: '8px',
  },
  noVideoTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  noVideoText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: '1.4',
    fontFamily: "'Inter', sans-serif",
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    backdropFilter: 'blur(10px)',
  },
  metaContainer: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  exerciseNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dumbbellIcon: {
    fontSize: '18px',
  },
  exerciseTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
  },
  creatorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 12px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  creatorAvatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  creatorAvatarPlaceholder: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4FF, #0072FF)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '12px',
  },
  creatorInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  creatorNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  creatorDisplayName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Inter', sans-serif",
  },
  creatorUsername: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#00D4FF',
    color: '#0A0A0F',
    borderRadius: '50%',
    width: '12px',
    height: '12px',
    fontSize: '8px',
    fontWeight: 'bold',
    marginLeft: '2px',
    lineHeight: 1,
    flexShrink: 0,
  },
  officialTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#39FF14',
    background: 'rgba(57,255,20,0.1)',
    padding: '4px 8px',
    borderRadius: '8px',
    fontFamily: "'Inter', sans-serif",
  },
  userVideoTag: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Inter', sans-serif",
  },
  videoCaption: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    lineHeight: '1.4',
    fontFamily: "'Inter', sans-serif",
    margin: 0,
  },
  relatedSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 20px 24px 20px',
    overflowHidden: true,
  },
  relatedTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'Outfit', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  emptyRelated: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: '1px dashed rgba(255,255,255,0.06)',
    borderRadius: '20px',
    padding: '24px',
  },
  emptyRelatedText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: "'Inter', sans-serif",
    textAlign: 'center',
  },
  relatedScrollList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
  },
  relatedItem: {
    display: 'flex',
    gap: '12px',
    padding: '10px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    alignItems: 'center',
  },
  relatedThumb: {
    width: '48px',
    height: '64px',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
    background: '#000',
    flexShrink: 0,
  },
  relatedThumbMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  playOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedMeta: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  relatedUserRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  relatedUsername: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#fff',
  },
  relatedCaption: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: "'Inter', sans-serif",
    margin: 0,
  },
};
