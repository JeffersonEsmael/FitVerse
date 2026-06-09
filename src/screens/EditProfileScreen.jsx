import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Camera, Save, Loader2, CheckCircle, AlertCircle, Lock, X, Plus } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useNavigationStore } from '../stores/navigationStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';
import { supabase } from '../config/supabase';

const PROFILE_THEME_OPTIONS = [
  { id: 'default', name: 'Padrão', color: '#0A0A0F', glow: '#0A0A0F', medalsRequired: 0 },
  { id: 'green', name: 'Verde', color: '#39FF14', glow: 'rgba(57, 255, 20, 0.12)', medalsRequired: 1 },
  { id: 'blue', name: 'Azul', color: '#00D4FF', glow: 'rgba(0, 212, 255, 0.12)', medalsRequired: 2 },
  { id: 'yellow', name: 'Dourado', color: '#FFD700', glow: 'rgba(255, 215, 0, 0.12)', medalsRequired: 3 },
  { id: 'pink', name: 'Rosa', color: '#FF2D55', glow: 'rgba(255, 45, 85, 0.12)', medalsRequired: 5 },
  { id: 'orange', name: 'Laranja', color: '#FF9500', glow: 'rgba(255, 149, 0, 0.12)', medalsRequired: 8 },
];

const calculateMedalsCount = (profileData, posts, completedChallenges) => {
  let count = 0;
  const followers = profileData.followers || 0;
  const postsCount = posts?.length || 0;
  const totalShapes = posts?.reduce((sum, p) => sum + (p.shapes || 0), 0) || 0;
  
  if (postsCount >= 1) count++;
  if (postsCount >= 5) count++;
  if (postsCount >= 10) count++;
  if (followers >= 1) count++;
  if (followers >= 10) count++;
  if (followers >= 100) count++;
  if (totalShapes >= 50) count++;
  
  count += completedChallenges?.length || 0;
  return count;
};

export default function EditProfileScreen() {
  const { user, profile, updateProfile } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState('personal');
  const [address, setAddress] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [profileThemeColor, setProfileThemeColor] = useState('default');
  const [medalsCount, setMedalsCount] = useState(0);
  const [isLoadingMedals, setIsLoadingMedals] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const [hasGarage, setHasGarage] = useState('não');
  const [operatingHours, setOperatingHours] = useState('');
  const [businessPhotos, setBusinessPhotos] = useState([]);

  const fileInputRef = useRef(null);
  const businessPhotoInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setPhotoPreview(profile.avatar_url || '');
      setProfileType(profile.profile_type || 'personal');
      setAddress(profile.address || '');
      setWhatsapp(profile.whatsapp || '');
      setProfileThemeColor(profile.profile_theme_color || 'default');
      setHasGarage(profile.has_garage || 'não');
      setOperatingHours(profile.operating_hours || '');
      const pPhotos = Array.isArray(profile.business_photos) ? profile.business_photos : [];
      setBusinessPhotos(pPhotos.map((url, i) => ({ id: `existing_${i}_${url}`, url, file: null })));
    }
  }, [profile]);

  useEffect(() => {
    const loadMedalsData = async () => {
      if (!user?.uid) return;
      try {
        const { data: posts } = await supabase
          .from('videos')
          .select('id, shapes')
          .eq('user_id', user.uid);
        
        const { data: participations } = await supabase
          .from('challenge_participants')
          .select('progress, challenge_id')
          .eq('user_id', user.uid);

        let completedChallenges = [];
        if (participations && participations.length > 0) {
          const ids = participations.map(p => p.challenge_id);
          const { data: challenges } = await supabase
            .from('challenges')
            .select('id, duration')
            .in('id', ids);
          
          const durationMap = {};
          (challenges || []).forEach(c => { durationMap[c.id] = c.duration || 30; });
          
          completedChallenges = participations.filter(p => (p.progress || 0) >= (durationMap[p.challenge_id] || 30));
        }

        const totalMedals = calculateMedalsCount(profile || {}, posts || [], completedChallenges);
        setMedalsCount(totalMedals);
      } catch (err) {
        console.error('[EditProfile] Error loading medals count:', err);
      } finally {
        setIsLoadingMedals(false);
      }
    };

    loadMedalsData();
  }, [user?.uid, profile]);

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

  const handleBusinessPhotoSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        alert('Formato inválido. Use JPG, PNG, WEBP ou GIF.');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        continue;
      }
      newPhotos.push({
        id: `temp_${Date.now()}_${i}_${Math.random()}`,
        url: URL.createObjectURL(file),
        file,
      });
    }
    setBusinessPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemoveBusinessPhoto = (id) => {
    setBusinessPhotos((prev) => prev.filter((p) => p.id !== id));
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

        let finalFile = photoFile;
        try {
          const { compressImage } = await import('../utils/compression');
          finalFile = await compressImage(photoFile, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
        } catch (compErr) {
          console.warn('[EditProfile] Avatar compression failed, using original file:', compErr);
        }

        const fileExt = finalFile.name ? finalFile.name.split('.').pop().toLowerCase() : 'jpg';
        const fileName = `${user.uid}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, finalFile, {
            contentType: finalFile.type,
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

      // Validate business inputs
      if (profileType === 'business') {
        if (!address.trim()) {
          throw new Error('O endereço da empresa é obrigatório para perfis empresariais.');
        }
        if (!whatsapp.trim()) {
          throw new Error('O WhatsApp de contato é obrigatório para perfis empresariais.');
        }
      }

      // Upload business photos if any
      const uploadedPhotoUrls = [];
      if (profileType === 'business') {
        console.log('[EditProfile] Uploading business gallery photos...');
        for (const photo of businessPhotos) {
          if (photo.file) {
            const fileExt = photo.file.name ? photo.file.name.split('.').pop().toLowerCase() : 'jpg';
            const fileName = `business_photos/${user.uid}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${fileExt}`;
            
            let finalFile = photo.file;
            try {
              const { compressImage } = await import('../utils/compression');
              finalFile = await compressImage(photo.file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
            } catch (compErr) {
              console.warn('[EditProfile] Business photo compression failed, using original file:', compErr);
            }

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, finalFile, {
                contentType: finalFile.type,
                upsert: true,
              });

            if (uploadError) {
              console.error('[EditProfile] Business photo upload error:', uploadError);
              throw new Error(`Falha ao enviar foto da galeria: ${uploadError.message}`);
            }

            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            uploadedPhotoUrls.push(urlData?.publicUrl);
          } else {
            uploadedPhotoUrls.push(photo.url);
          }
        }
      }

      // ── 2. Save profile data ──
      const updates = {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase() || profile?.username || 'user',
        bio: bio.trim(),
        avatar_url: avatarUrl,
        profile_type: profileType,
        address: profileType === 'business' ? address.trim() : null,
        whatsapp: profileType === 'business' ? whatsapp.trim() : null,
        has_garage: profileType === 'business' ? hasGarage : 'não',
        operating_hours: profileType === 'business' ? operatingHours.trim() : null,
        business_photos: profileType === 'business' ? uploadedPhotoUrls : null,
        profile_theme_color: profileThemeColor,
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



  const getThemeBackground = (themeId) => {
    const option = PROFILE_THEME_OPTIONS.find(o => o.id === themeId);
    return option && option.id !== 'default' 
      ? `radial-gradient(circle at top, ${option.glow} 0%, #0A0A0F 70%)` 
      : '#0A0A0F';
  };

  return (
    <ScreenWrapper screenKey="edit_profile">
      <div style={{ ...styles.container, background: getThemeBackground(profileThemeColor) }}>
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

            {/* Tipo de Perfil */}
            <div style={styles.field}>
              <label style={styles.label}>Tipo de Perfil</label>
              <div style={styles.toggleRow}>
                <button
                  type="button"
                  style={{ ...styles.toggleBtn, ...(profileType === 'personal' ? styles.toggleActive : {}) }}
                  onClick={() => setProfileType('personal')}
                >
                  Pessoal
                </button>
                <button
                  type="button"
                  style={{ ...styles.toggleBtn, ...(profileType === 'business' ? styles.toggleActive : {}) }}
                  onClick={() => setProfileType('business')}
                >
                  Empresarial (Academia)
                </button>
              </div>
            </div>

            {/* Business Fields */}
            {profileType === 'business' && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>Endereço da Empresa *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={styles.input}
                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                    maxLength={150}
                    disabled={isSaving}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>WhatsApp de Contato (DDI + DDD + Número) *</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
                    style={styles.input}
                    placeholder="Ex: 5511999999999"
                    maxLength={20}
                    disabled={isSaving}
                  />
                  <span style={{ fontSize: '11px', color: '#6C6C88' }}>
                    Insira apenas números com código do país. Ex: 55 (Brasil) + 11 (SP) + 999999999.
                  </span>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Tem garagem?</label>
                  <div style={styles.toggleRow}>
                    <button
                      type="button"
                      style={{ ...styles.toggleBtn, ...(hasGarage === 'sim' ? styles.toggleActive : {}) }}
                      onClick={() => setHasGarage('sim')}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.toggleBtn, ...(hasGarage === 'não' ? styles.toggleActive : {}) }}
                      onClick={() => setHasGarage('não')}
                    >
                      Não
                    </button>
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Horário de funcionamento</label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    style={styles.input}
                    placeholder="Ex: Seg a Sex: 06h - 22h, Sáb: 08h - 14h"
                    maxLength={100}
                    disabled={isSaving}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Fotos da Empresa (Galeria)</label>
                  <span style={{ fontSize: '11px', color: '#6C6C88', marginBottom: '4px' }}>
                    O padrão são 3 fotos, mas você pode adicionar mais. A primeira foto será usada na galeria principal.
                  </span>
                  
                  {/* Photo previews list */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {businessPhotos.map((photo) => (
                      <div key={photo.id} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden' }}>
                        <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveBusinessPhoto(photo.id)}
                          style={{
                            position: 'absolute', top: '2px', right: '2px',
                            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', zIndex: 10
                          }}
                        >
                          <X size={12} color="#fff" />
                        </button>
                      </div>
                    ))}
                    
                    {/* Add button */}
                    <button
                      type="button"
                      onClick={() => businessPhotoInputRef.current?.click()}
                      style={{
                        width: '80px', height: '80px', borderRadius: '8px',
                        border: '2.5px dashed rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.4)', fontSize: '11px', gap: '4px', cursor: 'pointer'
                      }}
                    >
                      <Plus size={20} />
                      Adicionar
                    </button>
                  </div>
                  <input
                    ref={businessPhotoInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleBusinessPhotoSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              </>
            )}

            {/* Cor de Fundo do Perfil */}
            <div style={styles.field}>
              <label style={styles.label}>Cor de Fundo do Perfil</label>
              <span style={{ fontSize: '12px', color: '#6C6C88', marginBottom: '4px' }}>
                {profileType === 'business' 
                  ? 'Perfis empresariais possuem todas as cores liberadas!' 
                  : `Desbloqueie novas cores ganhando medalhas! Você tem ${medalsCount} medalhas.`}
              </span>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                {PROFILE_THEME_OPTIONS.map((opt) => {
                  const isUnlocked = profileType === 'business' || medalsCount >= opt.medalsRequired;
                  const isSelected = profileThemeColor === opt.id;
                  
                  return (
                    <div
                      key={opt.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (isUnlocked) {
                          setProfileThemeColor(opt.id);
                        } else {
                          alert(`Esta cor exige ${opt.medalsRequired} medalhas! Ganhe mais medalhas participando e concluindo desafios.`);
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: opt.color === '#0A0A0F' ? '#12121A' : opt.color,
                          border: isSelected 
                            ? `3px solid #00D4FF` 
                            : isUnlocked 
                              ? `2px solid rgba(255,255,255,0.2)` 
                              : `2px solid rgba(255,255,255,0.05)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected && opt.color !== '#0A0A0F' ? `0 0 14px ${opt.color}aa` : 'none',
                          opacity: isUnlocked ? 1 : 0.4,
                          position: 'relative',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {!isUnlocked && (
                          <Lock size={14} color="rgba(255,255,255,0.6)" />
                        )}
                        {isSelected && isUnlocked && (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00D4FF' }} />
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: isSelected ? '#00D4FF' : '#B0B0C8', fontWeight: isSelected ? 700 : 500 }}>
                        {opt.name}
                      </span>
                    </div>
                  );
                })}
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
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.1)',
    color: '#FF2D55', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif", marginTop: '16px'
  }
};
