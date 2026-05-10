import React from 'react';
import { motion } from 'framer-motion';

export default function BoostIcon({ filled, size = 28, color = '#FFD700' }) {
  // Zap/Lightning Bolt
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="miter"
      strokeMiterlimit="10"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Aggressive Bolt */}
      <path d="M14 2L4 13h8l-3 9 12-11h-8l3-9z" />
    </motion.svg>
  );
}
