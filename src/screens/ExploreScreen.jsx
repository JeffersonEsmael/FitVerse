import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Hash, X } from 'lucide-react';
import ScreenWrapper from '../components/layout/ScreenWrapper';

const trendingTags = [
  { tag: 'treino', count: '125K', color: '#00D4FF' },
  { tag: 'dieta', count: '98K', color: '#39FF14' },
  { tag: 'evolução', count: '87K', color: '#FF6B35' },
  { tag: 'legday', count: '72K', color: '#A855F7' },
  { tag: 'motivação', count: '65K', color: '#FFD700' },
  { tag: 'cardio', count: '54K', color: '#FF2D55' },
  { tag: 'prétreino', count: '43K', color: '#00D4FF' },
  { tag: 'definição', count: '38K', color: '#39FF14' },
];

const categories = [
  { name: 'Treino', icon: '🏋️', color: '#00D4FF' },
  { name: 'Dieta', icon: '🥗', color: '#39FF14' },
  { name: 'Cardio', icon: '🏃', color: '#FF6B35' },
  { name: 'Evolução', icon: '📈', color: '#A855F7' },
  { name: 'Humor', icon: '😂', color: '#FFD700' },
  { name: 'Rotina', icon: '⏰', color: '#FF2D55' },
  { name: 'Desafio', icon: '🏆', color: '#00D4FF' },
  { name: 'Dicas', icon: '💡', color: '#39FF14' },
];

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);

  return (
    <ScreenWrapper screenKey="explore">
      <div style={styles.container}>
        {/* Search bar */}
        <div style={styles.searchWrap}>
          <Search size={18} color="#6C6C88" />
          <input
            style={styles.searchInput}
            placeholder="Buscar vídeos, pessoas, hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button style={styles.clearBtn} onClick={() => setSearchQuery('')}>
              <X size={16} color="#6C6C88" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🔥 Categorias</h3>
          <div style={styles.catGrid}>
            {categories.map((cat, i) => (
              <motion.button
                key={cat.name}
                style={{
                  ...styles.catCard,
                  borderColor: selectedCat === cat.name ? cat.color : 'rgba(255,255,255,0.06)',
                  background: selectedCat === cat.name ? `${cat.color}15` : 'rgba(255,255,255,0.03)',
                }}
                onClick={() => setSelectedCat(selectedCat === cat.name ? null : cat.name)}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span style={styles.catIcon}>{cat.icon}</span>
                <span style={{ ...styles.catName, color: selectedCat === cat.name ? cat.color : '#B0B0C8' }}>{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Trending hashtags */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <TrendingUp size={18} color="#FF6B35" />
            <h3 style={styles.sectionTitle}>Trending</h3>
          </div>
          {trendingTags.map((t, i) => (
            <motion.div
              key={t.tag}
              style={styles.tagRow}
              initial={{ x: -15, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div style={styles.tagLeft}>
                <span style={styles.tagNum}>#{i + 1}</span>
                <Hash size={16} color={t.color} />
                <span style={styles.tagName}>{t.tag}</span>
              </div>
              <span style={{ ...styles.tagCount, color: t.color }}>{t.count} posts</span>
            </motion.div>
          ))}
        </div>

        {/* Content grid placeholder */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>✨ Descubra</h3>
          <div style={styles.discoverGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <motion.div
                key={i}
                style={{
                  ...styles.gridItem,
                  ...(i === 1 ? styles.gridItemLarge : {}),
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              />
            ))}
          </div>
        </div>
      </div>
    </ScreenWrapper>
  );
}

const styles = {
  container: { padding: '0 16px', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 16px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
    marginBottom: '20px',
  },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '15px', fontFamily: "'Inter', sans-serif" },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  section: { marginBottom: '24px' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", margin: 0 },
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  catCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '14px 8px', borderRadius: '12px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s' },
  catIcon: { fontSize: '24px' },
  catName: { fontSize: '11px', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  tagRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', marginBottom: '4px', cursor: 'pointer', transition: 'background 0.2s' },
  tagLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  tagNum: { fontSize: '13px', color: '#6C6C88', fontWeight: 700, width: '24px' },
  tagName: { fontSize: '15px', color: '#fff', fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  tagCount: { fontSize: '12px', fontWeight: 600 },
  discoverGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' },
  gridItem: { aspectRatio: '1', borderRadius: '8px', background: 'linear-gradient(145deg, #1A1A2E, #22223A)' },
  gridItemLarge: { gridColumn: 'span 2', gridRow: 'span 2' },
};
