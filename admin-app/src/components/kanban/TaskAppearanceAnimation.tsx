
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TaskAppearanceAnimationProps {
  children: React.ReactNode;
  taskId: string;
  isNew?: boolean;
}

export const TaskAppearanceAnimation: React.FC<TaskAppearanceAnimationProps> = ({
  children,
  taskId,
  isNew = false,
}) => {
  const [showNewIndicator, setShowNewIndicator] = useState(isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => {
        setShowNewIndicator(false);
      }, 3000); // Show indicator for 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isNew]);

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: -20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
      className="relative"
    >
      {showNewIndicator && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute -top-2 -right-2 z-10"
        >
          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">
            New!
          </div>
        </motion.div>
      )}
      {children}
    </motion.div>
  );
};
