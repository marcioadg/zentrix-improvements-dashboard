import React, { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

const MAX_OVERFLOW = 50;

interface ElasticSliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  isStepped?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showLabel?: boolean;
}

export const ElasticSlider: React.FC<ElasticSliderProps> = ({
  value,
  onValueChange,
  onValueCommit,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  className = "",
  isStepped = true,
  leftIcon = null,
  rightIcon = null,
  showLabel = true,
}) => {
  // Handle controlled vs uncontrolled state
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<number>(
    isControlled ? value[0] : defaultValue
  );
  
  const currentValue = isControlled ? value[0] : internalValue;

  const sliderRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<"left" | "middle" | "right">("middle");
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  useEffect(() => {
    if (isControlled && value) {
      setInternalValue(value[0]);
    }
  }, [value, isControlled]);

  useMotionValueEvent(clientX, "change", (latest: number) => {
    if (sliderRef.current) {
      const { left, right } = sliderRef.current.getBoundingClientRect();
      let newOverflowValue: number;

      if (latest < left) {
        setRegion("left");
        newOverflowValue = left - latest;
      } else if (latest > right) {
        setRegion("right");
        newOverflowValue = latest - right;
      } else {
        setRegion("middle");
        newOverflowValue = 0;
      }
      overflow.jump(decay(newOverflowValue, MAX_OVERFLOW));
    }
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons > 0 && sliderRef.current) {
      const { left, width } = sliderRef.current.getBoundingClientRect();

      let newValue = min + ((e.clientX - left) / width) * (max - min);

      if (isStepped) {
        newValue = Math.round(newValue / step) * step;
      }

      newValue = Math.min(Math.max(newValue, min), max);

      if (!isControlled) {
        setInternalValue(newValue);
      }
      
      if (onValueChange) {
        onValueChange([newValue]);
      }

      clientX.jump(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { type: "spring", bounce: 0.5 });
    // Call onValueCommit when user finishes dragging
    if (onValueCommit) {
      onValueCommit([currentValue]);
    }
  };

  const getRangePercentage = (): number => {
    const totalRange = max - min;
    if (totalRange === 0) return 0;
    return ((currentValue - min) / totalRange) * 100;
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.div
        onHoverStart={() => animate(scale, 1.1)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => animate(scale, 1.1)}
        onTouchEnd={() => animate(scale, 1)}
        style={{
          scale,
          opacity: useTransform(scale, [1, 1.1], [0.8, 1]),
        }}
        className="flex w-full touch-none select-none items-center justify-center gap-3"
      >
        {leftIcon && (
          <motion.div
            animate={{
              scale: region === "left" ? [1, 1.3, 1] : 1,
              transition: { duration: 0.25 },
            }}
            style={{
              x: useTransform(() =>
                region === "left" ? -overflow.get() / scale.get() : 0
              ),
            }}
          >
            {leftIcon}
          </motion.div>
        )}

        <div
          ref={sliderRef}
          className="relative flex w-full max-w-xs flex-grow cursor-grab touch-none select-none items-center py-3"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <motion.div
            style={{
              scaleX: useTransform(() => {
                if (sliderRef.current) {
                  const { width } = sliderRef.current.getBoundingClientRect();
                  return 1 + overflow.get() / width;
                }
                return 1;
              }),
              scaleY: useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]),
              transformOrigin: useTransform(() => {
                if (sliderRef.current) {
                  const { left, width } =
                    sliderRef.current.getBoundingClientRect();
                  return clientX.get() < left + width / 2 ? "right" : "left";
                }
                return "center";
              }),
              height: useTransform(scale, [1, 1.1], [8, 12]),
              marginTop: useTransform(scale, [1, 1.1], [0, -2]),
              marginBottom: useTransform(scale, [1, 1.1], [0, -2]),
            }}
            className="flex flex-grow"
          >
            <div className="relative h-full flex-grow overflow-hidden rounded-full bg-secondary">
              <div
                className="absolute h-full rounded-full transition-all duration-150"
                style={{ width: `${getRangePercentage()}%`, background: 'var(--btn-bg, hsl(var(--primary)))' }}
              />
            </div>
          </motion.div>
        </div>

        {rightIcon && (
          <motion.div
            animate={{
              scale: region === "right" ? [1, 1.3, 1] : 1,
              transition: { duration: 0.25 },
            }}
            style={{
              x: useTransform(() =>
                region === "right" ? overflow.get() / scale.get() : 0
              ),
            }}
          >
            {rightIcon}
          </motion.div>
        )}
      </motion.div>

      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap">
          {Math.round(currentValue)}%
        </span>
      )}
    </div>
  );
};

function decay(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
}