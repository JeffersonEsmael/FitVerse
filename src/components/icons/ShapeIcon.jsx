import React from 'react';
import { motion } from 'framer-motion';

export default function ShapeIcon({ filled, size = 28, color = '#39FF14' }) {
  // SVG of a flexed bicep/muscle. 
  // We use a custom path to represent the Shape.
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? color : color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Main Arm / Muscle Outline */}
      <path d="M6 18 C 5 12, 7.5 6.5, 11 5 C 13.5 4, 16 6.5, 14.5 9 C 13.5 10.5, 12.5 11.5, 11.5 12.5 C 15 9.5, 20 10.5, 21.5 14.5 C 22.5 17.5, 19 20, 15 20.5 C 11 21, 7 20, 6 18 Z" />
      {/* Fist Thumb Detail */}
      <path d="M11.5 7.5 L11.5 9.5 L13.5 9.5" strokeWidth="2.5" stroke={filled ? '#0A0A0F' : color} fill="none" />
      {/* Bicep Smile Detail */}
      <path d="M11.5 17 C 14 19.5 17.5 19 19 16" strokeWidth="2.5" stroke={filled ? '#0A0A0F' : color} fill="none" />
    </motion.svg>
  );
}
