import { motion } from "motion/react";

interface SealButtonProps {
  onClick?: () => void;
  label?: string;
}

export function SealButton({ onClick, label = "出战" }: SealButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="relative w-20 h-20 rounded-full cursor-pointer"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          backgroundColor: "#C21F30",
          boxShadow: "0 0 20px rgba(194, 31, 48, 0.6)",
        }}
        animate={{
          boxShadow: [
            "0 0 20px rgba(194, 31, 48, 0.6)",
            "0 0 30px rgba(194, 31, 48, 0.8)",
            "0 0 20px rgba(194, 31, 48, 0.6)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main seal body */}
      <div
        className="absolute inset-1 rounded-full flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #E84855, #C21F30 50%, #8B1A24)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {/* Inner shadow */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.4)",
          }}
        />

        {/* Text */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <span
            className="text-xl font-black tracking-wider"
            style={{
              color: "#FFFFFF",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              fontFamily: "serif",
            }}
          >
            {label}
          </span>
        </div>

        {/* Seal texture pattern */}
        <div className="absolute inset-0 opacity-20">
          {/* Ancient seal pattern simulation */}
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="white"
              strokeWidth="1"
            />
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="white"
              strokeWidth="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Top highlight */}
      <div
        className="absolute top-2 left-1/4 right-1/4 h-1 rounded-full"
        style={{
          background: "rgba(255, 255, 255, 0.5)",
          filter: "blur(2px)",
        }}
      />

      {/* Rotating ring decoration */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-dashed"
        style={{ borderColor: "rgba(212, 175, 55, 0.4)" }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.button>
  );
}
