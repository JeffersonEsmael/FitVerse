import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import VideoCard from '../components/feed/VideoCard';
import { ArrowLeft } from 'lucide-react';

export default function PostDetailsScreen() {
  const { screenParams, goBack } = useNavigationStore();
  const post = screenParams?.post;

  if (!post) {
    return (
      <ScreenWrapper screenKey="post_details" noPadding={true}>
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>Post não encontrado</p>
          <button onClick={goBack} style={styles.errorBackBtn}>Voltar</button>
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper screenKey="post_details" noPadding={true}>
      <div style={styles.container}>
        {/* Floating Back Button */}
        <button style={styles.backBtn} onClick={goBack} aria-label="Voltar">
          <ArrowLeft size={24} color="#fff" />
        </button>

        <div style={styles.videoWrapper}>
          <VideoCard video={post} isActive={true} index={0} />
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  videoWrapper: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: 'max(env(safe-area-inset-top, 0px), 16px)',
    left: '16px',
    zIndex: 1000,
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    transition: 'all 0.2s',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px',
    background: '#0A0A0F',
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '16px',
    fontFamily: "'Inter', sans-serif",
  },
  errorBackBtn: {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    background: '#39FF14',
    color: '#000',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Outfit', sans-serif",
  }
};
