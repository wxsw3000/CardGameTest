import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

interface SquareUnitCardProps {
  id: string;
  name: string;
  attack: number;
  hp: number;
  portrait: string;
  queuePosition: number;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function SquareUnitCard({
  id,
  name,
  attack,
  hp,
  portrait,
  queuePosition,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: SquareUnitCardProps) {
  // Calculate opacity based on queue position (top card is fully opaque)
  const opacity = queuePosition === 0 ? 1 : queuePosition === 1 ? 0.8 : 0.6;

  return (
    <motion.div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="relative cursor-grab active:cursor-grabbing"
      style={{ opacity: isDragging ? 0.5 : opacity }}
      whileHover={{ scale: queuePosition === 0 ? 1.05 : 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Card Container - Perfect Square */}
      <div
        className="relative w-[100px] h-[100px] rounded-md overflow-hidden"
        style={{
          boxShadow: isDragging
            ? "0 8px 24px rgba(230, 194, 0, 0.5)"
            : "0 4px 8px rgba(0, 0, 0, 0.5)",
          border: isDragging ? "2px solid #E6C200" : "none",
        }}
      >
        {/* Bronze/Iron texture border */}
        <div
          className="absolute inset-0 border-2 rounded-md"
          style={{
            borderColor: "#4A3F35",
            background: "linear-gradient(135deg, #3a3226 0%, #1a1612 100%)",
          }}
        >
          {/* Character Portrait */}
          <div className="absolute inset-2 rounded-sm overflow-hidden">
            <img
              src={portrait}
              alt={name}
              className="w-full h-full object-cover"
              style={{
                filter: "grayscale(50%) contrast(1.2) sepia(30%)",
              }}
            />

            {/* Ink wash overlay */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, transparent 30%, rgba(0,0,0,0.4) 100%)",
              }}
            />
          </div>

          {/* Attack Badge - Top Left */}
          <div
            className="absolute -top-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10"
            style={{
              backgroundColor: "#C21F30",
              border: "2px solid #0A0A0A",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              color: "#FFFFFF",
            }}
          >
            {attack}
          </div>

          {/* HP Badge - Top Right */}
          <div
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold z-10"
            style={{
              backgroundColor: "#2B6C2E",
              border: "2px solid #0A0A0A",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              color: "#FFFFFF",
            }}
          >
            {hp}
          </div>

          {/* Name Label - Bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center text-[9px] font-serif leading-tight truncate"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "#E5E5E5",
            }}
          >
            {name}
          </div>
        </div>

        {/* Glow effect when dragging */}
        {isDragging && (
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{
              boxShadow: "0 0 20px rgba(230, 194, 0, 0.8)",
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Queue indicator for non-top cards */}
        {queuePosition > 0 && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        )}
      </div>

      {/* Position indicator */}
      {queuePosition === 0 && (
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{ backgroundColor: "#E6C200" }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
}
