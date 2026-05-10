import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Zap, Clock, Target, ChevronRight, Utensils } from 'lucide-react';
import { useNutriStore } from '../stores/nutriStore';
import ScreenWrapper from '../components/layout/ScreenWrapper';

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
  const { meals, dailyGoals, dailyTotals, lastScanResult, isScanning, simulateScan, clearScanResult } = useNutriStore();

  return (
    <ScreenWrapper screenKey="nutriscan">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerRow}>
            <Utensils size={22} color="#39FF14" />
            <h2 style={styles.title}>NutriScan</h2>
          </div>
          <p style={styles.subtitle}>Escaneie sua refeição com IA</p>
        </div>

        {/* Scan button */}
        <div style={styles.scanSection}>
          <motion.button
            style={styles.scanBtn}
            onClick={() => { clearScanResult(); simulateScan(); }}
            disabled={isScanning}
            whileTap={{ scale: 0.95 }}
            animate={isScanning ? { boxShadow: ['0 0 20px rgba(57,255,20,0.3)', '0 0 40px rgba(57,255,20,0.6)', '0 0 20px rgba(57,255,20,0.3)'] } : {}}
            transition={isScanning ? { repeat: Infinity, duration: 1 } : {}}
          >
            {isScanning ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Zap size={32} color="#fff" />
              </motion.div>
            ) : (
              <Camera size={32} color="#fff" />
            )}
          </motion.button>
          <span style={styles.scanLabel}>
            {isScanning ? 'Analisando...' : 'Toque para escanear'}
          </span>
        </div>

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
  title: { fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  subtitle: { fontSize: '14px', color: '#6C6C88', fontFamily: "'Inter', sans-serif" },
  scanSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  scanBtn: {
    width: '88px', height: '88px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #39FF14, #00CC44)',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 30px rgba(57,255,20,0.3)',
  },
  scanLabel: { fontSize: '14px', color: '#B0B0C8', fontWeight: 500, fontFamily: "'Inter', sans-serif" },
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
