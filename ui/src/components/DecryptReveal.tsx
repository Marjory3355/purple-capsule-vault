import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Unlock } from "lucide-react";

interface DecryptRevealProps {
  value: number;
  isDecrypting: boolean;
  onComplete?: () => void;
  label?: string;
  prefix?: string;
  suffix?: string;
}

// Confetti particle component
const Confetti = ({ color, delay }: { color: string; delay: number }) => {
  const randomX = Math.random() * 100;
  const randomRotation = Math.random() * 720 - 360;
  
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ 
        backgroundColor: color,
        left: `${randomX}%`,
        top: -20,
      }}
      initial={{ y: 0, rotate: 0, opacity: 1 }}
      animate={{ 
        y: window.innerHeight + 100, 
        rotate: randomRotation,
        opacity: 0,
      }}
      transition={{ 
        duration: 3 + Math.random() * 2,
        delay,
        ease: "easeIn",
      }}
    />
  );
};

// Number flip animation
const FlipNumber = ({ digit, delay }: { digit: string; delay: number }) => {
  return (
    <motion.span
      className="inline-block"
      initial={{ rotateX: 90, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 200,
      }}
    >
      {digit}
    </motion.span>
  );
};

export const DecryptReveal = ({
  value,
  isDecrypting,
  onComplete,
  label = "Decrypted Result",
  prefix = "$",
  suffix = "/mo",
}: DecryptRevealProps) => {
  const [showValue, setShowValue] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [scrambledText, setScrambledText] = useState("******");
  
  const confettiColors = [
    "#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE",
    "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95",
    "#F59E0B", "#10B981", "#3B82F6", "#EC4899",
  ];

  // Scramble effect during decryption
  useEffect(() => {
    if (isDecrypting) {
      const chars = "0123456789$%#@!*";
      const interval = setInterval(() => {
        let result = "";
        for (let i = 0; i < 8; i++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
        setScrambledText(result);
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [isDecrypting]);

  // Reveal animation when value is ready
  useEffect(() => {
    if (value > 0 && !isDecrypting) {
      // Small delay before reveal
      const timer = setTimeout(() => {
        setShowValue(true);
        setShowConfetti(true);
        onComplete?.();
        
        // Hide confetti after animation
        setTimeout(() => setShowConfetti(false), 4000);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [value, isDecrypting, onComplete]);

  const formattedValue = value.toLocaleString();
  const digits = `${prefix}${formattedValue}${suffix}`.split("");

  return (
    <div className="relative">
      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <Confetti 
                key={i} 
                color={confettiColors[i % confettiColors.length]}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative overflow-hidden rounded-2xl"
        animate={showValue ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* Background glow effect */}
        <AnimatePresence>
          {showValue && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-violet-500/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        <div className="relative p-8 text-center">
          {/* Label */}
          <motion.div 
            className="flex items-center justify-center gap-2 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isDecrypting ? (
              <Lock className="h-5 w-5 text-violet-500 animate-pulse" />
            ) : showValue ? (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <Unlock className="h-5 w-5 text-green-500" />
              </motion.div>
            ) : (
              <Lock className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </motion.div>

          {/* Value display */}
          <div className="relative h-20 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isDecrypting ? (
                <motion.div
                  key="scrambled"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-4xl md:text-5xl font-bold font-mono text-violet-500"
                >
                  {scrambledText}
                </motion.div>
              ) : showValue ? (
                <motion.div
                  key="revealed"
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 bg-clip-text text-transparent"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                  }}
                >
                  <div className="flex items-center justify-center perspective-1000">
                    {digits.map((digit, index) => (
                      <FlipNumber 
                        key={index} 
                        digit={digit} 
                        delay={index * 0.05}
                      />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  className="text-4xl md:text-5xl font-bold text-muted-foreground/30"
                >
                  ******
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sparkle effects */}
          <AnimatePresence>
            {showValue && (
              <>
                <motion.div
                  className="absolute top-4 right-8"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                </motion.div>
                <motion.div
                  className="absolute bottom-4 left-8"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Sparkles className="h-4 w-4 text-violet-400" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Shimmer effect during decryption */}
        {isDecrypting && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default DecryptReveal;
