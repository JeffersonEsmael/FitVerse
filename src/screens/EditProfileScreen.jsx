import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Camera, Save, Loader2 } from 'lucide-react';
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
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setPhotoPreview(profile.avatar_url || profile.photoURL || '');
    }
  }, [profile]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let avatarUrl = profile?.avatar_url || '';

    try {
      // 1. Upload new photo if selected
      if (photoFile && user?.uid !== 'demo-user') {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, photoFile, { upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatarUrl = data.publicUrl;
        }
      }

      // 2. Update profile data
      const updates = {
        display_name: displayName,
        username: username,
        bio: bio,
        avatar_url: avatarUrl,
      };

      await updateProfile(updates);
      navigate('profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil. Tente novamente.');
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
            {isSaving ? <Loader2 size={20} style={styles.spinner} /> : <Save size={20} color="#fff" />}
          </button>
        </div>

        <div style={styles.content}>
          {/* Avatar Section */}
          <div style={styles.avatarSection}>
            <div style={styles.avatarWrapper}>
              {photoPreview ? (
                <img src={photoPreview} alt="Avatar" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatarPlaceholder}>{displayName.charAt(0) || '?'}</div>
              )}
              
              <button style={styles.cameraBtn} onClick={() => fileInputRef.current?.click()}>
                <Camera size={20} color="#fff" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
            </div>
            <span style={styles.avatarHint}>Toque para alterar a foto</span>
          </div>

          {/* Form Fields */}
          <div style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Nome de exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={styles.input}
                placeholder="Seu nome"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Nome de usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                style={styles.input}
                placeholder="@username"
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
              />
              <span style={styles.charCount}>{bio.length}/150</span>
            </div>
          </div>
          
          <motion.button 
            style={styles.submitBtn} 
            onClick={handleSave}
            disabled={isSaving}
            whileTap={{ scale: 0.97 }}
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </motion.button>
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
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
  },
  saveBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    color: '#00D4FF',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  avatarWrapper: {
    position: 'relative',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    marginBottom: '12px',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #00D4FF',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4FF, #A855F7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '36px',
    fontWeight: 800,
    border: '3px solid #00D4FF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#A855F7',
    border: '2px solid #0A0A0F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  avatarHint: {
    fontSize: '13px',
    color: '#6C6C88',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '32px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    color: '#B0B0C8',
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
  },
  input: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  textarea: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    minHeight: '100px',
    resize: 'none',
    fontFamily: "'Inter', sans-serif",
  },
  charCount: {
    fontSize: '12px',
    color: '#6C6C88',
    textAlign: 'right',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #00D4FF, #0088CC)',
    border: 'none',
    borderRadius: '16px',
    padding: '16px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 4px 15px rgba(0,212,255,0.3)',
    marginTop: 'auto',
  },
};
