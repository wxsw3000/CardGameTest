import { motion } from "motion/react";
import { Sword, Shield, Wind, Zap } from "lucide-react";

interface BattleCardProps {
  type: "sword" | "shield" | "horse" | "special";
  name: string;
  power: number;
  isDragging?: boolean;
}

export function BattleCard({ type, name, power, isDragging = false }: BattleCardProps) {
  const typeConfig = {
    sword: {
      icon: Sword,
      color: "#C21F30",
      bgGradient: "from-red-900/80 to-red-950/80",
    },
    shield: {
      icon: Shield,
      color: "#4A5568",
      bgGradient: "from-gray-700/80 to-gray-900/80",
    },
    horse: {
      icon: Wind,
      color: "#D4AF37",
      bgGradient: "from-yellow-800/80 to-yellow-950/80",
    },
    special: {
      icon: Zap,
      color: "#9333EA",
      bgGradient: "from-purple-800/80 to-purple-950/80",
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      className={`relative w-20 h-28 rounded-md overflow-hidden cursor-grab ${
        isDragging ? "opacity-50" : ""
      }`}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      style={{
        boxShadow: `0 4px 8px rgba(0, 0, 0, 0.3), inset 0 0 0 1px ${config.color}40`,
      }}
    >
      {/* Card background with gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient}`}
      />

      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1617565085015-13cb9d366120?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXBlciUyMHRleHR1cmUlMjBwYXJjaG1lbnR8ZW58MXx8fHwxNzcwODM3NzIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral")',
          backgroundSize: "cover",
          backgroundBlendMode: "multiply",
        }}
      />

      {/* Card content */}
      <div className="relative h-full flex flex-col items-center justify-between p-2">
        {/* Top - Icon */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: `${config.color}40`,
            border: `1px solid ${config.color}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>

        {/* Center - Power */}
        <div className="text-center flex-1 flex items-center justify-center">
          <div
            className="text-3xl font-black"
            style={{
              color: config.color,
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            {power}
          </div>
        </div>

        {/* Bottom - Name */}
        <div className="text-[10px] text-center text-gray-300 font-serif leading-tight">
          {name}
        </div>
      </div>

      {/* Decorative border */}
      <div className="absolute inset-0 border-2 border-white/10 rounded-md pointer-events-none" />

      {/* Corner decorations */}
      <div
        className="absolute top-1 left-1 w-2 h-2 border-l border-t opacity-50"
        style={{ borderColor: config.color }}
      />
      <div
        className="absolute top-1 right-1 w-2 h-2 border-r border-t opacity-50"
        style={{ borderColor: config.color }}
      />
      <div
        className="absolute bottom-1 left-1 w-2 h-2 border-l border-b opacity-50"
        style={{ borderColor: config.color }}
      />
      <div
        className="absolute bottom-1 right-1 w-2 h-2 border-r border-b opacity-50"
        style={{ borderColor: config.color }}
      />
    </motion.div>
  );
}