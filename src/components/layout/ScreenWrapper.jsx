import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  enter: { opacity: 0, y: 10 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export default function ScreenWrapper({ children, screenKey, noPadding = false }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screenKey}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#0A0A0F',
          ...(noPadding ? {} : { paddingBottom: '80px' }),
        }}
        className="hide-scrollbar"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
