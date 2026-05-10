import React from 'react';
import { motion } from 'framer-motion';

export default function GymBagIcon({ filled, size = 26, color = '#00D4FF' }) {
  // Gym Bag / Duffle Bag
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? '#0A0A0F' : color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Top Handle (Never filled) */}
      <path d="M9 5V3c0-1.1.9-2 2-2s2 .9 2 2v2" stroke={color} fill="none" />
      {/* Side pockets (Straps/Bottles) */}
      <path d="M5 10c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2" stroke={filled ? '#0A0A0F' : color} />
      <path d="M19 10c1.1 0 2 .9 2 2v3c0 1.1-.9 2-2 2" stroke={filled ? '#0A0A0F' : color} />
      {/* Main Bag Body */}
      <rect x="5" y="5" width="14" height="17" rx="5" stroke={color} />
      {/* Front pocket / Center detail */}
      <path d="M8 11h8v5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-5Z" />
      <path d="M12 11v7" />
    </motion.svg>
  );
}
