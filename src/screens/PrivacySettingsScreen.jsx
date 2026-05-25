import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Globe, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function PrivacySettingsScreen() {
  const { profile, updateProfile } = useAuthStore();
  const goBack = useNavigationStore((s) => s.goBack);

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  const isPublic = profile?.is_public !== false;

  const handleTogglePrivacy = async (value) => {
    if (isSaving || value === isPublic) return;

    setIsSaving(true);
    setFeedback(null);

    try {
      const result = await updateProfile({ is_public: value });
      if (result.success) {
        setFeedback({
          type: 'success',
          message: value 
            ? 'Sua conta agora está pública!' 
            : 'Sua conta agora está privada!',
        });
        // Clear feedback after 3 seconds
        setTimeout(() => setFeedback(null), 3000);
      } else {
        throw new Error(result.error || 'Erro ao atualizar privacidade.');
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper screenKey="privacy_settings">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={goBack}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Privacidade</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          <p style={styles.description}>
            Escolha quem pode ver suas publicações, bagagens de treino e atividades no app.
          </p>

          <div style={styles.optionsContainer}>
            {/* Option Public */}
            <motion.div
              style={{
                ...styles.optionCard,
                ...(isPublic ? styles.optionActive : {}),
              }}
              onClick={() => handleTogglePrivacy(true)}
              whileTap={{ scale: 0.98 }}
            >
              <div style={styles.optionHeader}>
                <div style={{ ...styles.iconWrapper, backgroundColor: isPublic ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)' }}>
                  <Globe size={20} color={isPublic ? '#00D4FF' : '#6C6C88'} />
                </div>
                <span style={{ ...styles.optionTitle, color: isPublic ? '#fff' : '#6C6C88' }}>Conta Pública</span>
                <div style={{ ...styles.radio, ...(isPublic ? styles.radioActive : {}) }}>
                  {isPublic && <div style={styles.radioDot} />}
                </div>
              </div>
              <p style={styles.optionDescription}>
                Qualquer pessoa no FitVerse pode ver seu perfil, seguir você e visualizar suas publicações e vídeos de treino.
              </p>
            </motion.div>

            {/* Option Private */}
            <motion.div
              style={{
                ...styles.optionCard,
                ...(!isPublic ? styles.optionActive : {}),
              }}
              onClick={() => handleTogglePrivacy(false)}
              whileTap={{ scale: 0.98 }}
            >
              <div style={styles.optionHeader}>
                <div style={{ ...styles.iconWrapper, backgroundColor: !isPublic ? 'rgba(0, 212, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)' }}>
                  <Lock size={20} color={!isPublic ? '#00D4FF' : '#6C6C88'} />
                </div>
                <span style={{ ...styles.optionTitle, color: !isPublic ? '#fff' : '#6C6C88' }}>Conta Privada</span>
                <div style={{ ...styles.radio, ...(!isPublic ? styles.radioActive : {}) }}>
                  {!isPublic && <div style={styles.radioDot} />}
                </div>
              </div>
              <p style={styles.optionDescription}>
                Apenas pessoas aprovadas por você podem seguir sua conta e ver suas publicações. Perfil permanece visível mas posts ficam protegidos.
              </p>
            </motion.div>
          </div>

          {/* Feedback message */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                ...styles.feedbackCard,
                backgroundColor: feedback.type === 'success' ? 'rgba(57, 255, 20, 0.05)' : 'rgba(255, 45, 85, 0.05)',
                borderColor: feedback.type === 'success' ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 45, 85, 0.2)',
              }}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={18} color="#39FF14" />
              ) : (
                <AlertCircle size={18} color="#FF2D55" />
              )}
              <span style={{ ...styles.feedbackText, color: feedback.type === 'success' ? '#39FF14' : '#FF2D55' }}>
                {feedback.message}
              </span>
            </motion.div>
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
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  description: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
    marginBottom: '24px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '24px',
  },
  optionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '18px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    backdropFilter: 'blur(30px)',
    transition: 'all 0.2s ease',
  },
  optionActive: {
    borderColor: 'rgba(0, 212, 255, 0.3)',
    background: 'rgba(0, 212, 255, 0.02)',
  },
  optionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    flex: 1,
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  optionDescription: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.5',
    paddingLeft: '48px',
  },
  radio: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#00D4FF',
  },
  radioDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#00D4FF',
  },
  feedbackCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid transparent',
    marginTop: 'auto',
  },
  feedbackText: {
    fontSize: '14px',
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
  },
};
