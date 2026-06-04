import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Zap, Clock, Target, ChevronRight, Utensils, ArrowLeft, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { useNutriStore } from '../stores/nutriStore';
import { useNavigationStore } from '../stores/navigationStore';
import { useAuthStore } from '../stores/authStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to Base64 JPEG with 0.7 quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(new Error('Erro ao carregar imagem para compressão: ' + err.message));
    };
    reader.onerror = (err) => reject(new Error('Erro ao ler o arquivo: ' + err.message));
  });
};

function MacroChart({ totals, goals }) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const calPct = Math.min((totals.calories / goals.calories) * 100, 100);
  const offset = circumference - (calPct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#calGradient)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          strokeDasharray={circumference}
        />
        <defs>
          <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#39FF14" />
          </linearGradient>
        </defs>
      </svg>
      <div style={chartStyles.center}>
        <motion.span
          style={chartStyles.cal}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
        >
          {totals.calories}
        </motion.span>
        <span style={chartStyles.calLabel}>/ {goals.calories} kcal</span>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color, icon }) {
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <div style={macroStyles.row}>
      <div style={macroStyles.left}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <div style={macroStyles.info}>
          <span style={macroStyles.label}>{label}</span>
          <span style={macroStyles.value}>{value}g <span style={{ color: '#6C6C88' }}>/ {goal}g</span></span>
        </div>
      </div>
      <div style={macroStyles.track}>
        <motion.div
          style={{ ...macroStyles.fill, background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

function ScanResult({ result }) {
  if (!result) return null;
  return (
    <motion.div
      style={scanStyles.card}
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div style={scanStyles.header}>
        <Zap size={18} color="#39FF14" />
        <span style={scanStyles.title}>Resultado do Scan</span>
      </div>
      {result.foods.map((food, i) => (
        <div key={i} style={scanStyles.foodRow}>
          <span style={{ fontSize: '24px' }}>{food.icon}</span>
          <div style={scanStyles.foodInfo}>
            <span style={scanStyles.foodName}>{food.name}</span>
            <span style={scanStyles.foodMeta}>{food.weight}g • {food.protein}g prot • {food.carbs}g carb • {food.fat}g fat</span>
          </div>
          <span style={scanStyles.foodCal}>{food.calories} kcal</span>
        </div>
      ))}
      <div style={scanStyles.totalRow}>
        <span style={scanStyles.totalLabel}>Total</span>
        <span style={scanStyles.totalVal}>{result.totals.calories} kcal</span>
      </div>
    </motion.div>
  );
}

function MealItem({ meal, index }) {
  const time = new Date(meal.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const names = meal.foods.map(f => f.icon + ' ' + f.name).join(', ');
  return (
    <motion.div
      style={mealStyles.row}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <div style={mealStyles.time}>
        <Clock size={12} color="#6C6C88" />
        <span>{time}</span>
      </div>
      <div style={mealStyles.info}>
        <span style={mealStyles.foods}>{names}</span>
        <span style={mealStyles.cal}>{meal.totals.calories} kcal</span>
      </div>
    </motion.div>
  );
}

export default function NutriScanScreen() {
  const { 
    meals, 
    dailyGoals, 
    dailyTotals, 
    lastScanResult, 
    isScanning, 
    scanMealWithVision, 
    clearScanResult,
    error: storeError
  } = useNutriStore();
  const { goBack } = useNavigationStore();
  const { user } = useAuthStore();

  const [selectedImage, setSelectedImage] = useState(null);
  const [localError, setLocalError] = useState(null);
  const fileInputRef = useRef(null);

  const triggerFileSelect = () => {
    if (isScanning) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError(null);
    clearScanResult();

    try {
      const compressedBase64 = await compressImage(file);
      setSelectedImage(compressedBase64);
      await scanMealWithVision(compressedBase64, user?.uid);
    } catch (err) {
      console.error(err);
      setLocalError(err.message || 'Ocorreu um erro ao processar a imagem.');
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const handleCancelOrClear = () => {
    setSelectedImage(null);
    setLocalError(null);
    clearScanResult();
  };

  const activeError = localError || storeError;

  return (
    <ScreenWrapper screenKey="nutriscan">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <button style={styles.backBtn} onClick={goBack}>
              <ArrowLeft size={20} color="#fff" />
            </button>
            <Utensils size={22} color="#39FF14" />
            <h2 style={styles.title}>NutriScan</h2>
          </div>
          <p style={styles.subtitle}>Escaneie sua refeição com IA</p>
        </div>

        {/* Scan section / Upload Card / Preview */}
        {!selectedImage ? (
          <div style={styles.scanSection}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />
            <motion.div
              style={styles.uploadCard}
              onClick={triggerFileSelect}
              whileHover={{ scale: 1.02, borderColor: 'rgba(57,255,20,0.5)', boxShadow: '0 0 25px rgba(57,255,20,0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={styles.uploadGlow} />
              <Camera size={36} color="#39FF14" style={{ marginBottom: '12px' }} />
              <span style={styles.uploadTitle}>Escanear Prato com Visão</span>
              <span style={styles.uploadDesc}>Tire uma foto ou faça upload da sua refeição</span>
            </motion.div>
          </div>
        ) : (
          <div style={styles.previewContainer}>
            <div style={styles.imageWrapper}>
              <img src={selectedImage} alt="Refeição" style={styles.previewImage} />
              
              {/* Laser Line Scanning Animation */}
              {isScanning && (
                <>
                  <motion.div
                    style={styles.laserLine}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  />
                  <div style={styles.scanningOverlay}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      style={{ marginBottom: '12px' }}
                    >
                      <Zap size={32} color="#39FF14" />
                    </motion.div>
                    <span style={styles.scanningText}>Identificando macros com Kimi K2.5...</span>
                  </div>
                </>
              )}

              {/* Clear Image Button when not scanning */}
              {!isScanning && (
                <button style={styles.clearBtn} onClick={handleCancelOrClear}>
                  <Trash2 size={16} color="#FF2D55" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {activeError && (
          <motion.div
            style={styles.errorCard}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <AlertCircle size={20} color="#FF2D55" style={{ flexShrink: 0 }} />
            <div style={styles.errorInfo}>
              <span style={styles.errorTitle}>Erro no Escaneamento</span>
              <p style={styles.errorDesc}>{activeError}</p>
              <button style={styles.retryBtn} onClick={triggerFileSelect}>
                <RefreshCw size={12} style={{ marginRight: '6px' }} /> Tentar Novamente
              </button>
            </div>
          </motion.div>
        )}

        {/* Scan result */}
        <AnimatePresence>
          {lastScanResult && <ScanResult result={lastScanResult} />}
        </AnimatePresence>

        {/* Daily summary */}
        <div style={styles.dailySection}>
          <h3 style={styles.sectionTitle}>📊 Resumo Diário</h3>
          <div style={styles.summaryCard}>
            <div style={styles.chartRow}>
              <MacroChart totals={dailyTotals} goals={dailyGoals} />
              <div style={styles.macros}>
                <MacroBar label="Proteína" value={dailyTotals.protein} goal={dailyGoals.protein} color="#00D4FF" icon="🥩" />
                <MacroBar label="Carboidrato" value={dailyTotals.carbs} goal={dailyGoals.carbs} color="#39FF14" icon="🍚" />
                <MacroBar label="Gordura" value={dailyTotals.fat} goal={dailyGoals.fat} color="#FF6B35" icon="🥑" />
              </div>
            </div>
          </div>
        </div>

        {/* Meal history */}
        {meals.length > 0 && (
          <div style={styles.historySection}>
            <h3 style={styles.sectionTitle}>🕐 Refeições de Hoje</h3>
            {meals.map((meal, i) => (
              <MealItem key={meal.id} meal={meal} index={i} />
            ))}
          </div>
        )}
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' },
  header: { marginBottom: '20px' },
  headerRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    marginRight: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  },
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  subtitle: { fontSize: '14px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" },
  scanSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  uploadCard: {
    width: '100%',
    padding: '32px 20px',
    borderRadius: '20px',
    border: '2px dashed rgba(57,255,20,0.2)',
    background: 'rgba(57,255,20,0.02)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  uploadGlow: {
    position: 'absolute',
    top: '-50%', left: '-50%', width: '200%', height: '200%',
    background: 'radial-gradient(circle, rgba(57,255,20,0.05) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  uploadTitle: { fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: '4px' },
  uploadDesc: { fontSize: '12px', color: '#6C6C88', fontFamily: "'Inter', sans-serif", textAlign: 'center' },
  previewContainer: { width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '24px' },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    maxHeight: '300px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  previewImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '4px',
    background: 'linear-gradient(90deg, transparent, #39FF14 20%, #39FF14 80%, transparent)',
    boxShadow: '0 0 12px rgba(57,255,20,0.8), 0 0 25px rgba(57,255,20,0.5)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  scanningText: { fontSize: '14px', color: '#39FF14', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  clearBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.7)',
    border: '1px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(5px)',
    transition: 'all 0.2s ease',
    zIndex: 12,
  },
  errorCard: {
    display: 'flex',
    gap: '12px',
    background: 'rgba(255,45,85,0.06)',
    border: '1px solid rgba(255,45,85,0.15)',
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '24px',
    alignItems: 'flex-start',
  },
  errorInfo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
  errorTitle: { fontSize: '14px', fontWeight: 700, color: '#FF2D55', fontFamily: "'Outfit', sans-serif" },
  errorDesc: { fontSize: '12px', color: '#B0B0C8', fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.4 },
  retryBtn: {
    background: 'rgba(255,45,85,0.15)',
    color: '#FF2D55',
    border: '1px solid rgba(255,45,85,0.2)',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: '6px',
    alignSelf: 'flex-start',
    fontFamily: "'Inter', sans-serif",
  },
  dailySection: { marginBottom: '24px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", marginBottom: '12px' },
  summaryCard: { background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' },
  chartRow: { display: 'flex', gap: '20px', alignItems: 'center' },
  macros: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' },
  historySection: { marginBottom: '32px' },
};

const chartStyles = {
  center: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  cal: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif" },
  calLabel: { fontSize: '10px', color: '#6C6C88' },
};

const macroStyles = {
  row: { display: 'flex', flexDirection: 'column', gap: '4px' },
  left: { display: 'flex', alignItems: 'center', gap: '8px' },
  info: { display: 'flex', justifyContent: 'space-between', flex: 1 },
  label: { fontSize: '12px', color: '#B0B0C8', fontWeight: 500 },
  value: { fontSize: '12px', color: '#fff', fontWeight: 600 },
  track: { width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: '9999px' },
};

const scanStyles = {
  card: { background: 'rgba(57,255,20,0.06)', border: '1px solid rgba(57,255,20,0.15)', borderRadius: '16px', padding: '16px', marginBottom: '24px' },
  header: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  title: { fontSize: '16px', fontWeight: 700, color: '#39FF14', fontFamily: "'Outfit', sans-serif" },
  foodRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  foodInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  foodName: { fontSize: '14px', fontWeight: 600, color: '#fff' },
  foodMeta: { fontSize: '11px', color: '#6C6C88' },
  foodCal: { fontSize: '14px', fontWeight: 700, color: '#39FF14' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', marginTop: '4px' },
  totalLabel: { fontSize: '14px', fontWeight: 600, color: '#B0B0C8' },
  totalVal: { fontSize: '18px', fontWeight: 800, color: '#39FF14', fontFamily: "'Outfit', sans-serif" },
};

const mealStyles = {
  row: { display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '6px' },
  time: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6C6C88', minWidth: '50px' },
  info: { flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  foods: { fontSize: '13px', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' },
  cal: { fontSize: '13px', fontWeight: 700, color: '#39FF14' },
};
