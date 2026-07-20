import { motion } from "motion/react";
import { Sparkles, Zap, X } from "lucide-react";

interface GachaButtonProps {
  type: "single" | "ten" | "close";
  onClick?: () => void;
}

export function GachaButton({ type, onClick }: GachaButtonProps) {
  const configs = {
    single: {
      label: "单抽",
      icon: Sparkles,
      gradient: "from-purple-500 via-purple-600 to-purple-700",
      shadow: "shadow-lg shadow-purple-500/50",
      hoverShadow: "hover:shadow-xl hover:shadow-purple-500/70",
    },
    ten: {
      label: "十连",
      icon: Zap,
      gradient: "from-yellow-500 via-amber-500 to-yellow-600",
      shadow: "shadow-lg shadow-yellow-500/50",
      hoverShadow: "hover:shadow-xl hover:shadow-yellow-500/70",
    },
    close: {
      label: "关闭",
      icon: X,
      gradient: "from-gray-600 via-gray-700 to-gray-800",
      shadow: "shadow-lg shadow-gray-500/30",
      hoverShadow: "hover:shadow-xl hover:shadow-gray-500/50",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative px-8 py-4 rounded-xl font-bold text-lg text-white
        bg-gradient-to-br ${config.gradient}
        ${config.shadow} ${config.hoverShadow}
        transition-all duration-300
        active:scale-95
        flex items-center justify-center gap-2 min-w-[140px]
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 顶部高光 */}
      <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-white/30 rounded-full blur-sm" />
      
      <Icon className="w-5 h-5" />
      <span>{config.label}</span>

      {/* 边框 */}
      <div className="absolute inset-0 rounded-xl border-2 border-white/20" />
    </motion.button>
  );
}
