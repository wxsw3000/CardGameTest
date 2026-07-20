import { motion } from "motion/react";
import { Sword, Shield, Wind } from "lucide-react";

interface DeckSlotProps {
  lane: "left" | "center" | "right";
  cardCount: number;
  composition: {
    swords: number;
    shields: number;
    horses: number;
  };
}

export function DeckSlot({ lane, cardCount, composition }: DeckSlotProps) {
  const laneNames = {
    left: "左军",
    center: "中军",
    right: "右军",
  };

  return (
    <motion.div
      className="relative flex-1 flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Bamboo frame container */}
      <div
        className="relative w-full h-full border-2 rounded-sm flex flex-col items-center justify-between py-3 px-2"
        style={{
          borderColor: "#E0E0E0",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          borderStyle: "solid",
          boxShadow: "inset 0 0 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Top - Probability Cloud */}
        <div className="flex gap-2 items-center">
          {composition.swords > 0 && (
            <div className="flex items-center gap-1">
              <Sword className="w-3 h-3 text-gray-300" />
              <span className="text-[10px] text-gray-400">
                {composition.swords}
              </span>
            </div>
          )}
          {composition.shields > 0 && (
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-gray-300" />
              <span className="text-[10px] text-gray-400">
                {composition.shields}
              </span>
            </div>
          )}
          {composition.horses > 0 && (
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-gray-300" />
              <span className="text-[10px] text-gray-400">
                {composition.horses}
              </span>
            </div>
          )}
        </div>

        {/* Center - Card Stack */}
        <div className="relative flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Card stack visualization */}
            {[...Array(Math.min(cardCount, 5))].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-12 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded border border-gray-600"
                style={{
                  left: `${i * 2}px`,
                  top: `${i * -2}px`,
                  zIndex: i,
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Card back pattern */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-8 h-8 border border-gray-500 rounded-full" />
                </div>
              </motion.div>
            ))}

            {/* Card count badge */}
            <div
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10"
              style={{
                backgroundColor: "#D4AF37",
                color: "#1A1A1A",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              }}
            >
              {cardCount}
            </div>
          </div>
        </div>

        {/* Bottom - Lane Label */}
        <div
          className="text-sm font-serif tracking-wider"
          style={{ color: "#E5E5E5" }}
        >
          {laneNames[lane]}
        </div>

        {/* Ink brush stroke effect corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-gray-400" />
        <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-gray-400" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-gray-400" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-gray-400" />
      </div>
    </motion.div>
  );
}