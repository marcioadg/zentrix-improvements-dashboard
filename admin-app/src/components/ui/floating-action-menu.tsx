"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type FloatingActionMenuProps = {
  options: {
    label: string;
    onClick: () => void;
    Icon?: React.ReactNode;
  }[];
  className?: string;
  variant?: 'fixed' | 'inline';
};

const FloatingActionMenu = ({
  options,
  className,
  variant = 'fixed',
}: FloatingActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isInline = variant === 'inline';
  const containerClass = isInline ? "relative" : "fixed right-12 z-[70]";
  const buttonSize = isInline ? "min-w-[56px] min-h-[56px] w-14 h-14" : "min-w-[56px] min-h-[56px] w-14 h-14";

  return (
    <div 
      ref={menuRef} 
      className={cn(containerClass, className)}
      style={!isInline ? {
        bottom: `calc(3.5rem + env(safe-area-inset-bottom))`
      } : undefined}
    >
      <Button
        onClick={toggleMenu}
        size="icon"
        aria-label="Open action menu"
        className={`${buttonSize} rounded-full bg-primary/90 hover:bg-primary shadow-2xl backdrop-blur-md ring-1 ring-white/20 dark:ring-white/10`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        >
          <Plus className={isInline ? "w-7 h-7" : "w-6 h-6"} />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ 
              opacity: 0, 
              y: isInline ? 10 : 10,
              x: isInline ? 0 : 10,
              filter: "blur(10px)" 
            }}
            animate={{ 
              opacity: 1, 
              y: 0,
              x: 0,
              filter: "blur(0px)" 
            }}
            exit={{ 
              opacity: 0, 
              y: isInline ? 10 : 10,
              x: isInline ? 0 : 10,
              filter: "blur(10px)" 
            }}
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.1,
            }}
            className={isInline 
              ? "absolute bottom-16 left-1/2 -translate-x-1/2 mb-2" 
              : "absolute bottom-16 right-0 mb-2"
            }
          >
            <div className={cn(
              "flex flex-col gap-2",
              isInline ? "items-center" : "items-end"
            )}>
              {options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: isInline ? 10 : 0, x: isInline ? 0 : 20 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, y: isInline ? 10 : 0, x: isInline ? 0 : 20 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                >
                  <Button
                    onClick={() => {
                      option.onClick();
                      setIsOpen(false);
                    }}
                    size="sm"
                    className="min-h-[48px] flex items-center gap-2 bg-primary/90 hover:bg-primary shadow-2xl backdrop-blur-md rounded-xl ring-1 ring-white/20 dark:ring-white/10"
                  >
                    {option.Icon}
                    <span>{option.label}</span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingActionMenu;