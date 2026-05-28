import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Lock, Mail, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useNavigationStore } from '../stores/navigationStore';
import { useAuthStore } from '../stores/authStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

export default function SecuritySettingsScreen() {
  const navigate = useNavigationStore((s) => s.navigate);
  const { user } = useAuthStore();

  // Email state
  const [email, setEmail] = useState(user?.email || '');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ type: null, message: '' });

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: null, message: '' });

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!email || email === user?.email) return;

    setIsEmailLoading(true);
    setEmailStatus({ type: null, message: '' });

    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;

      setEmailStatus({
        type: 'success',
        message: 'E-mail de confirmação enviado para o novo endereço!',
      });
    } catch (err) {
      setEmailStatus({
        type: 'error',
        message: err.message || 'Erro ao atualizar e-mail.',
      });
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Preencha todos os campos de senha.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    setIsPasswordLoading(true);
    setPasswordStatus({ type: null, message: '' });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordStatus({
        type: 'success',
        message: 'Senha atualizada com sucesso!',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message: err.message || 'Erro ao atualizar senha.',
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <ScreenWrapper screenKey="security_settings">
      {/* Liquid Bubble Background */}
      <div style={styles.bgBlob} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('settings')}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Segurança</h2>
          <div style={{ width: 24 }} />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Email Card */}
          <motion.div
            style={styles.card}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div style={styles.cardHeader}>
              <Mail size={18} color="#00D4FF" />
              <h3 style={styles.cardTitle}>Alterar E-mail</h3>
            </div>
            <p style={styles.cardSubtitle}>Atualize o endereço de e-mail da sua conta FitVerse.</p>

            <form onSubmit={handleUpdateEmail} style={styles.form}>
              <div style={styles.inputWrapper}>
                <input
                  type="email"
                  placeholder="Novo E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <AnimatePresence mode="wait">
                {emailStatus.message && (
                  <motion.div
                    style={emailStatus.type === 'success' ? styles.statusSuccess : styles.statusError}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {emailStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{emailStatus.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isEmailLoading || email === user?.email}
                style={{
                  ...styles.submitBtn,
                  opacity: (isEmailLoading || email === user?.email) ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                {isEmailLoading ? <Loader2 size={18} style={styles.spinner} /> : 'Salvar Novo E-mail'}
              </motion.button>
            </form>
          </motion.div>

          {/* Password Card */}
          <motion.div
            style={styles.card}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div style={styles.cardHeader}>
              <Lock size={18} color="#39FF14" />
              <h3 style={styles.cardTitle}>Alterar Senha</h3>
            </div>
            <p style={styles.cardSubtitle}>Sua nova senha deve ter no mínimo 6 caracteres.</p>

            <form onSubmit={handleUpdatePassword} style={styles.form}>
              <div style={styles.inputContainer}>
                <div style={styles.inputWrapper}>
                  <input
                    type={showPass.current ? 'text' : 'password'}
                    placeholder="Senha Atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowPass((s) => ({ ...s, current: !s.current }))}
                  >
                    {showPass.current ? <EyeOff size={16} color="rgba(255,255,255,0.4)" /> : <Eye size={16} color="rgba(255,255,255,0.4)" />}
                  </button>
                </div>

                <div style={styles.inputWrapper}>
                  <input
                    type={showPass.new ? 'text' : 'password'}
                    placeholder="Nova Senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowPass((s) => ({ ...s, new: !s.new }))}
                  >
                    {showPass.new ? <EyeOff size={16} color="rgba(255,255,255,0.4)" /> : <Eye size={16} color="rgba(255,255,255,0.4)" />}
                  </button>
                </div>

                <div style={styles.inputWrapper}>
                  <input
                    type={showPass.confirm ? 'text' : 'password'}
                    placeholder="Confirmar Nova Senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowPass((s) => ({ ...s, confirm: !s.confirm }))}
                  >
                    {showPass.confirm ? <EyeOff size={16} color="rgba(255,255,255,0.4)" /> : <Eye size={16} color="rgba(255,255,255,0.4)" />}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {passwordStatus.message && (
                  <motion.div
                    style={passwordStatus.type === 'success' ? styles.statusSuccess : styles.statusError}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {passwordStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{passwordStatus.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isPasswordLoading}
                style={{
                  ...styles.submitBtn,
                  opacity: isPasswordLoading ? 0.6 : 1,
                  background: 'linear-gradient(135deg, #39FF14, #00CC00)',
                  color: '#0A0A0F',
                }}
                whileTap={{ scale: 0.98 }}
              >
                {isPasswordLoading ? <Loader2 size={18} style={{ ...styles.spinner, stroke: '#0A0A0F' }} /> : 'Atualizar Senha'}
              </motion.button>
            </form>
          </motion.div>
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
    color: '#fff',
    position: 'relative',
    zIndex: 1,
  },
  bgBlob: {
    position: 'absolute',
    top: '-10%',
    left: '-20%',
    width: '80vw',
    height: '80vw',
    background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, rgba(0,0,0,0) 70%)',
    filter: 'blur(80px)',
    zIndex: 0,
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
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
    gap: '20px',
    overflowY: 'auto',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: '1.4',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '6px',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    paddingRight: '48px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    transition: 'all 0.2s ease',
    '&:focus': {
      border: '1px solid #00D4FF',
      background: 'rgba(255,255,255,0.08)',
    },
  },
  eyeBtn: {
    position: 'absolute',
    right: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  statusSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'rgba(57,255,20,0.1)',
    border: '1px solid rgba(57,255,20,0.2)',
    color: '#39FF14',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },
  statusError: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'rgba(255,45,85,0.1)',
    border: '1px solid rgba(255,45,85,0.2)',
    color: '#FF2D55',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
};
