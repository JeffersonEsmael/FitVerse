import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Camera, Save, Loader2, Globe, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import { supabase } from '../config/supabase';

export default function EditProfileScreen() {
  const { user, profile, updateProfile } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setIsPublic(profile.is_public !== false);
      setPhotoPreview(profile.avatar_url || '');
    }
  }, [profile]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato inválido. Use JPG, PNG, WEBP ou GIF.');
      setSaveStatus('error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 5MB.');
      setSaveStatus('error');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setSaveStatus(null);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      setErrorMsg('Sessão expirada. Faça login novamente.');
      setSaveStatus('error');
      return;
    }

    if (!displayName.trim()) {
      setErrorMsg('O nome de exibição não pode estar vazio.');
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);
    setErrorMsg('');

    let avatarUrl = profile?.avatar_url || '';

    try {
      // ── 1. Upload avatar if a new photo was selected ──
      if (photoFile) {
        console.log('[EditProfile] Uploading avatar...');

        const sessionResult = await supabase.auth.getSession();
        const session = sessionResult?.data?.session;
        if (!session) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        const fileExt = photoFile.name.split('.').pop().toLowerCase();
        const fileName = `${user.uid}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, {
            contentType: photoFile.type,
            upsert: true,
          });

        if (uploadError) {
          console.error('[EditProfile] Avatar upload error:', uploadError);
          throw new Error(`Falha ao enviar foto: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = urlData?.publicUrl || avatarUrl;
        console.log('[EditProfile] Avatar URL:', avatarUrl);
      }

      // ── 2. Save profile data ──
      const updates = {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase() || profile?.username || 'user',
        bio: bio.trim(),
        avatar_url: avatarUrl,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      };

      console.log('[EditProfile] Saving profile:', updates);
      const result = await updateProfile(updates);

      if (!result.success) {
        throw new Error(result.error || 'Falha ao salvar perfil.');
      }

      // ── 3. Success — show tick then navigate ──
      console.log('[EditProfile] Saved successfully!');
      setSaveStatus('success');

      // Navigate immediately — no setTimeout needed
      navigate('profile');
    } catch (err) {
      console.error('[EditProfile] Save error:', err.message);
      setErrorMsg(err.message);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper screenKey="edit_profile">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('profile')} disabled={isSaving}>
            <ChevronLeft size={24} color="#fff" />
          </button>
          <h2 style={styles.title}>Editar Perfil</h2>
          <button
            style={{ ...styles.saveBtn, opacity: isSaving ? 0.5 : 1 }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving
              ? <Loader2 size={20} color="#00D4FF" style={{ animation: 'spin 1s linear infinite' }} />
              : saveStatus === 'success'
              ? <CheckCircle size={20} color="#39FF14" />
              : <Save size={20} color="#00D4FF" />
            }
          </button>
        </div>

        {/* Error message */}
        {saveStatus === 'error' && errorMsg && (
          <motion.div
            style={styles.errorBar}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={16} color="#FF2D55" />
            <span style={styles.errorBarText}>{errorMsg}</span>
          </motion.div>
        )}

        {/* Loading overlay */}
        {isSaving && (
          <div style={styles.savingOverlay}>
            <div style={styles.savingCard}>
              <div style={styles.savingSpinner} />
              <span style={styles.savingText}>
                {photoFile ? 'Enviando foto e salvando...' : 'Salvando alterações...'}
              </span>
            </div>
          </div>
        )}

        <div style={styles.content}>
          {/* Avatar Section */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrapper}>
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarPlaceholder}>
                  {displayName.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <button
                style={styles.cameraBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}
              >
                <Camera size={20} color="#fff" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
            </div>
            <span style={styles.avatarHint}>Toque para alterar a foto</span>
          </div>

          {/* Form Fields */}
          <div style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Nome de exibição *</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={styles.input}
                placeholder="Seu nome"
                maxLength={50}
                disabled={isSaving}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Nome de usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                style={styles.input}
                placeholder="username"
                maxLength={30}
                disabled={isSaving}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={styles.textarea}
                placeholder="Fale um pouco sobre seus objetivos fitness..."
                maxLength={150}
                disabled={isSaving}
              />
              <span style={styles.charCount}>{bio.length}/150</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Visibilidade da conta</label>
              <div style={styles.toggleRow}>
                <button
                  style={{ ...styles.toggleBtn, ...(isPublic ? styles.toggleActive : {}) }}
                  onClick={() => setIsPublic(true)}
                  disabled={isSaving}
                >
                  <Globe size={16} /> Pública
                </button>
                <button
                  style={{ ...styles.toggleBtn, ...(!isPublic ? styles.toggleActive : {}) }}
                  onClick={() => setIsPublic(false)}
                  disabled={isSaving}
                >
                  <Lock size={16} /> Privada
                </button>
              </div>
            </div>
          </div>

          <motion.button
            style={{ ...styles.submitBtn, opacity: isSaving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={isSaving}
            whileTap={{ scale: 0.97 }}
          >
            {isSaving
              ? (photoFile ? 'Enviando foto...' : 'Salvando...')
              : 'Salvar Alterações'
            }
          </motion.button>
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0A0A0F' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' },
  title: { fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  saveBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' },
  errorBar: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 16px',
    background: 'rgba(255,45,85,0.08)',
    borderBottom: '1px solid rgba(255,45,85,0.15)',
  },
  errorBarText: { fontSize: '13px', color: '#FF2D55', fontFamily: "'Inter', sans-serif", flex: 1 },
  savingOverlay: {
    position: 'absolute', inset: 0, zIndex: 50,
    background: 'rgba(10,10,15,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  savingCard: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px', padding: '24px 32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
  },
  savingSpinner: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '3px solid rgba(0,212,255,0.2)',
    borderTopColor: '#00D4FF',
    animation: 'spin 0.8s linear infinite',
  },
  savingText: { fontSize: '15px', color: '#fff', fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  content: { flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column' },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' },
  avatarWrapper: { position: 'relative', width: '100px', height: '100px', borderRadius: '50%', marginBottom: '12px' },
  avatarImg: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #00D4FF' },
  avatarPlaceholder: {
    width: '100%', height: '100%', borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '36px', fontWeight: 800, border: '3px solid #00D4FF',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: '32px', height: '32px', borderRadius: '50%',
    background: '#A855F7', border: '2px solid #0A0A0F',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  avatarHint: { fontSize: '13px', color: '#6C6C88' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', color: '#B0B0C8', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  input: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '14px 16px', color: '#fff',
    fontSize: '16px', outline: 'none', fontFamily: "'Inter', sans-serif",
  },
  textarea: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '14px 16px', color: '#fff',
    fontSize: '16px', outline: 'none', minHeight: '100px', resize: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  charCount: { fontSize: '12px', color: '#6C6C88', textAlign: 'right' },
  toggleRow: { display: 'flex', gap: '8px' },
  toggleBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '12px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    color: '#6C6C88', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  toggleActive: { background: 'rgba(0,212,255,0.1)', borderColor: 'rgba(0,212,255,0.3)', color: '#00D4FF' },
  submitBtn: {
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none', borderRadius: '16px', padding: '16px',
    color: '#fff', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif", boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
    marginTop: 'auto',
  },
};
