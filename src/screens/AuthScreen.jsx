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
  const { login, register, error, clearError } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    // Validation
    if (!email.includes('@')) {
      alert('Por favor, insira um email válido (ex: seuemail@gmail.com).');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      alert('A senha precisa ter no mínimo 6 caracteres.');
      setIsSubmitting(false);
      return;
    }
    if (mode === 'register' && name.trim().length < 2) {
      alert('Insira seu nome completo.');
      setIsSubmitting(false);
      return;
    }

    try {
      let result;
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        result = await register(email, password, name.trim());
      }

      if (result?.success) {
        navigate('feed');
      } else {
        alert('Erro: ' + (result?.error || 'Falha na autenticação'));
      }
    } catch (err) {
      alert('Erro inesperado: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background effects */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <motion.div
        style={styles.card}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div style={styles.logoSection}>
          <span style={{ fontSize: '36px' }}>🏋️</span>
          <h1 style={styles.logo}>FitVerse</h1>
          <p style={styles.tagline}>
            {mode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta fitness'}
          </p>
        </div>

        {/* Form */}
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
                  <User size={18} color="#6C6C88" />
                  <input style={styles.input} type="text" placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.inputWrap}>
            <Mail size={18} color="#6C6C88" />
            <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required />
          </div>

          <div style={styles.inputWrap}>
            <Lock size={18} color="#6C6C88" />
            <input style={styles.input} type={showPass ? 'text' : 'password'} placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              {showPass ? <EyeOff size={18} color="#6C6C88" /> : <Eye size={18} color="#6C6C88" />}
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <motion.button
            type="submit"
            style={styles.submitBtn}
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} style={styles.spinner} />
            ) : (
              <>
                {mode === 'login' ? 'Entrar' : 'Criar Conta'}
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        {/* Toggle mode */}
        <p style={styles.toggleText}>
          {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
          <span style={styles.toggleLink} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}>
            {mode === 'login' ? 'Criar conta' : 'Fazer login'}
          </span>
        </p>
      </motion.div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute', inset: 0,
    background: '#0A0A0F',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px', overflow: 'hidden',
  },
  bgGlow1: {
    position: 'absolute', top: '-20%', right: '-10%', width: '300px', height: '300px',
    borderRadius: '50%', background: 'rgba(0,212,255,0.08)', filter: 'blur(80px)',
  },
  bgGlow2: {
    position: 'absolute', bottom: '-15%', left: '-10%', width: '250px', height: '250px',
    borderRadius: '50%', background: 'rgba(57,255,20,0.06)', filter: 'blur(80px)',
  },
  card: {
    width: '100%', maxWidth: '400px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px', padding: '32px 24px',
    position: 'relative', zIndex: 1,
  },
  logoSection: { textAlign: 'center', marginBottom: '28px' },
  logo: {
    fontSize: '32px', fontWeight: 900, margin: '8px 0 4px',
    fontFamily: "'Outfit', sans-serif",
    background: 'linear-gradient(135deg, #00D4FF, #39FF14)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  tagline: { fontSize: '14px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
  },
  input: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif",
  },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  error: { fontSize: '13px', color: '#FF2D55', fontFamily: "'Inter', sans-serif", textAlign: 'center' },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)', color: '#fff',
    fontSize: '16px', fontWeight: 700, fontFamily: "'Inter', sans-serif",
    boxShadow: '0 0 20px rgba(0,212,255,0.3)', marginTop: '4px',
  },
  spinner: { width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' },
  toggleText: { textAlign: 'center', fontSize: '14px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" },
  toggleLink: { color: '#00D4FF', fontWeight: 600, cursor: 'pointer' },
};
