import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface SwipeHintOverlayProps {
  show: boolean;
  onDismiss: () => void;
}

export const SwipeHintOverlay: React.FC<SwipeHintOverlayProps> = ({ show, onDismiss }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[6px] overflow-hidden"
          onClick={onDismiss}
          onTouchStart={onDismiss}
        >
          <div className="flex flex-col items-center gap-2 text-white px-4">
            {/* Animated hand with swipe motion */}
            <motion.div
              animate={{
                x: [0, -30, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Hand className="h-8 w-8 -rotate-45" />
            </motion.div>
            
            <motion.p 
              className="text-sm font-medium text-center"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Swipe to edit or archive
            </motion.p>
            
            <motion.p 
              className="text-xs text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Tap to dismiss
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hook to manage swipe hint state
export const useSwipeHint = () => {
  const { user } = useAuth();
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const checkHintStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('has_seen_swipe_hint')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          logger.error('Error checking swipe hint status:', error);
          setIsLoading(false);
          return;
        }

        // Show hint if user hasn't seen it (null or false)
        const hasSeen = data?.has_seen_swipe_hint ?? false;
        setShowHint(!hasSeen);
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to check swipe hint status:', err);
        setIsLoading(false);
      }
    };

    checkHintStatus();
  }, [user?.id]);

  const dismissHint = async () => {
    setShowHint(false);
    
    if (!user?.id) return;

    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          has_seen_swipe_hint: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
    } catch (err) {
      logger.error('Failed to persist swipe hint dismissal:', err);
    }
  };

  return {
    showHint,
    dismissHint,
    isLoading
  };
};
