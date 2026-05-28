import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1] // spring easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface FadeTransitionProps {
  children: React.ReactNode;
  delay?: number;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3,
        delay,
        ease: 'easeOut'
      }}
    >
      {children}
    </motion.div>
  );
};

interface ScaleTransitionProps {
  children: React.ReactNode;
  delay?: number;
}

export const ScaleTransition: React.FC<ScaleTransitionProps> = ({
  children,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        duration: 0.2,
        delay,
        ease: [0.34, 1.56, 0.64, 1]
      }}
    >
      {children}
    </motion.div>
  );
};

interface StaggerChildrenProps {
  children: React.ReactNode;
  staggerDelay?: number;
}

export const StaggerChildren: React.FC<StaggerChildrenProps> = ({
  children,
  staggerDelay = 0.05
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
      }}
      transition={{
        duration: 0.3,
        ease: [0.34, 1.56, 0.64, 1]
      }}
    >
      {children}
    </motion.div>
  );
};
