import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const { login, register, error, clearError } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setInfoMessage('');
    setIsSubmitting(true);

    if (!email.trim() || !email.includes('@')) {
      alert('Por favor, insira um email válido.');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      alert('A senha precisa ter no mínimo 6 caracteres.');
      setIsSubmitting(false);
      return;
    }
    if (mode === 'register' && name.trim().length < 2) {
      alert('Insira seu nome (mínimo 2 caracteres).');
      setIsSubmitting(false);
      return;
    }

    try {
      let result;
      if (mode === 'login') {
        result = await login(email.trim(), password);
        if (result?.success) {
          navigate('feed');
        } else {
          alert('Erro ao entrar: ' + (result?.error || 'Verifique suas credenciais.'));
        }
      } else {
        result = await register(email.trim(), password, name.trim());
        if (result?.success) {
          if (result?.needsConfirmation) {
            setInfoMessage('✉️ Verifique seu email para confirmar o cadastro e depois faça login.');
            setMode('login');
          } else {
            navigate('feed');
          }
        } else {
          alert('Erro ao criar conta: ' + (result?.error || 'Tente novamente.'));
        }
      }
    } catch (err) {
      console.error('[AuthScreen] Unexpected error:', err);
      alert('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .liquid-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .liquid-input:focus {
          outline: none;
        }
      `}</style>

      {/* Background Liquid Blobs */}
      <motion.div
        style={styles.bgBlob1}
        animate={{ x: [0, 40, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.05, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={styles.bgBlob2}
        animate={{ x: [0, -30, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.95, 1.05, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={styles.bgBlob3}
        animate={{ x: [0, 50, -30, 0], y: [0, 20, -50, 0], scale: [1, 1.1, 0.9, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        style={styles.card}
        initial={{ y: 40, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div style={styles.logoSection}>
          <div style={styles.logoIconContainer}>
            <span style={{ fontSize: '32px' }}>✨</span>
          </div>
          <h1 style={styles.logo}>FitVerse</h1>
          <p style={styles.tagline}>
            {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta fitness'}
          </p>
        </div>

        {infoMessage && (
          <div style={styles.infoBox}>
            <p style={styles.infoText}>{infoMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form} autoComplete="off">
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                key="name"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={styles.inputWrap}>
                  <User size={20} color="rgba(255,255,255,0.7)" />
                  <input
                    className="liquid-input"
                    style={styles.input}
                    type="text"
                    placeholder="Nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.inputWrap}>
            <Mail size={20} color="rgba(255,255,255,0.7)" />
            <input
              className="liquid-input"
              style={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div style={styles.inputWrap}>
            <Lock size={20} color="rgba(255,255,255,0.7)" />
            <input
              className="liquid-input"
              style={styles.input}
              type={showPass ? 'text' : 'password'}
              placeholder="Senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              {showPass ? <EyeOff size={20} color="rgba(255,255,255,0.7)" /> : <Eye size={20} color="rgba(255,255,255,0.7)" />}
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <motion.button
            type="submit"
            style={styles.submitBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                style={styles.spinner}
              />
            ) : (
              <>
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                <ArrowRight size={20} />
              </>
            )}
          </motion.button>
        </form>

        <p style={styles.toggleText}>
          {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <span
            style={styles.toggleLink}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              clearError();
              setInfoMessage('');
            }}
          >
            {mode === 'login' ? 'Criar agora' : 'Fazer login'}
          </span>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute', inset: 0,
    backgroundColor: '#000000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px', overflow: 'hidden',
  },
  bgBlob1: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(0,122,255,0.3) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(60px)', top: '-10%', left: '-10%', zIndex: 0,
  },
  bgBlob2: {
    position: 'absolute', width: '50vw', height: '50vw', minWidth: '400px', minHeight: '400px',
    background: 'radial-gradient(circle, rgba(255,45,85,0.2) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(60px)', bottom: '-10%', right: '-10%', zIndex: 0,
  },
  bgBlob3: {
    position: 'absolute', width: '60vw', height: '60vw', minWidth: '500px', minHeight: '500px',
    background: 'radial-gradient(circle, rgba(88,86,214,0.25) 0%, rgba(0,0,0,0) 60%)',
    filter: 'blur(80px)', top: '20%', left: '20%', zIndex: 0,
  },
  card: {
    width: '100%', maxWidth: '400px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)',
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)',
    borderRadius: '40px', padding: '40px 24px',
    position: 'relative', zIndex: 10,
    display: 'flex', flexDirection: 'column',
  },
  logoSection: { textAlign: 'center', marginBottom: '32px' },
  logoIconContainer: {
    width: '64px', height: '64px', margin: '0 auto 16px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
    borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.3)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
  },
  logo: {
    fontSize: '28px', fontWeight: 800, margin: '0 0 8px',
    fontFamily: "'Outfit', sans-serif",
    color: '#ffffff', letterSpacing: '-0.5px'
  },
  tagline: { fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', sans-serif" },
  infoBox: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '20px',
  },
  infoText: {
    fontSize: '14px', color: '#fff', fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.5,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '16px 20px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '24px',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
  },
  input: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: '16px', fontFamily: "'Inter', sans-serif",
  },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' },
  error: { fontSize: '14px', color: '#FF3B30', fontFamily: "'Inter', sans-serif", textAlign: 'center', background: 'rgba(255,59,48,0.1)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,59,48,0.2)' },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '16px', borderRadius: '24px', border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
    color: '#000', fontSize: '16px', fontWeight: 700, fontFamily: "'Inter', sans-serif",
    boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,1)', 
    marginTop: '8px',
  },
  spinner: {
    width: '20px', height: '20px',
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000', borderRadius: '50%',
  },
  toggleText: { textAlign: 'center', fontSize: '15px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif" },
  toggleLink: { color: '#fff', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' },
};
