import React from 'react';
import { motion } from 'framer-motion';

export const LoadingScreen: React.FC = () => {
  const brandText = "EventSphere";

  // Framer Motion container variants for coordinating character reveal
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08, // Prints each letter sequentially
      }
    }
  };

  // Individual character fade-in and slide-up transition
  const letterVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0f0f11] flex items-center justify-center z-50">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="font-display text-3xl font-extrabold tracking-widest text-gray-900 dark:text-white"
      >
        {brandText.split("").map((char, index) => (
          <motion.span
            key={index}
            variants={letterVariants}
            className="inline-block"
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};
