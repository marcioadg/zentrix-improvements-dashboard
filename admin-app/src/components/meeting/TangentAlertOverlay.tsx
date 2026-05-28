import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap } from 'lucide-react';

interface TangentAlertOverlayProps {
  isVisible: boolean;
}

export const TangentAlertOverlay: React.FC<TangentAlertOverlayProps> = ({
  isVisible
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Full screen overlay with shake animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              x: [0, -4, 4, -4, 4, -2, 2, -1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              opacity: { duration: 0.2 },
              x: { duration: 0.8, times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1] }
            }}
            className="fixed inset-0 z-[9999] pointer-events-none"
          >
            {/* Pulsing border */}
            <motion.div
              animate={{ 
                opacity: [0.8, 1, 0.8],
                scale: [1, 1.02, 1]
              }}
              transition={{ 
                duration: 0.6,
                repeat: 3,
                ease: "easeInOut"
              }}
              className="absolute inset-0 border-8 border-amber-400 bg-amber-500/5 backdrop-blur-sm"
            />
            
            {/* Central alert message */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  rotate: [0, 10, -10, 5, -5, 0]
                }}
                transition={{ 
                  scale: { duration: 0.5, times: [0, 0.6, 1] },
                  rotate: { duration: 0.8, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
                }}
                className="bg-gradient-to-br from-amber-400 to-red-500 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-amber-300"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                  >
                    <Zap className="w-8 h-8" />
                  </motion.div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-wide">
                      TANGENT ALERT!
                    </h2>
                    <p className="text-lg font-medium opacity-90">
                      🚨 Stay on track! 🚨
                    </p>
                  </div>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.3, 1],
                      rotate: [0, -15, 15, 0]
                    }}
                    transition={{ 
                      duration: 0.6,
                      repeat: 2
                    }}
                  >
                    <AlertTriangle className="w-8 h-8" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Floating warning icons */}
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0, 1.5, 0],
                  rotate: [0, 360],
                  y: [
                    Math.random() * window.innerHeight,
                    Math.random() * window.innerHeight - 200,
                    Math.random() * window.innerHeight
                  ]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
                className="absolute pointer-events-none"
              >
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </motion.div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};