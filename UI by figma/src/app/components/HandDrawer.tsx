import { motion } from "motion/react";
import { BattleCard } from "./BattleCard";
import { ChevronUp } from "lucide-react";

interface Card {
  id: string;
  type: "sword" | "shield" | "horse" | "special";
  name: string;
  power: number;
}

interface HandDrawerProps {
  cards: Card[];
  onCardDragStart?: (cardId: string) => void;
}

export function HandDrawer({ cards, onCardDragStart }: HandDrawerProps) {
  return (
    <motion.div
      className="relative w-full"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Red sash divider */}
      <div
        className="absolute -top-1 left-0 right-0 h-2"
        style={{
          background: "linear-gradient(to bottom, #C21F30, transparent)",
          boxShadow: "0 2px 8px rgba(194, 31, 48, 0.5)",
        }}
      />

      {/* Drawer handle indicator */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center">
        <motion.div
          className="w-12 h-6 rounded-t-xl flex items-center justify-center"
          style={{
            backgroundColor: "rgba(194, 31, 48, 0.3)",
            border: "1px solid rgba(194, 31, 48, 0.5)",
            borderBottom: "none",
          }}
          whileHover={{ y: -2 }}
        >
          <ChevronUp className="w-4 h-4 text-red-400" />
        </motion.div>
      </div>

      {/* Paper texture background */}
      <div
        className="relative rounded-t-3xl overflow-hidden"
        style={{
          backgroundColor: "#F5F4EF",
          backgroundImage:
            'url("https://images.unsplash.com/photo-1617565085015-13cb9d366120?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjBwYXBlciUyMHRleHR1cmUlMjBwYXJjaG1lbnR8ZW58MXx8fHwxNzcwODM3NzIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral")',
          backgroundSize: "cover",
          backgroundBlendMode: "multiply",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Dark overlay for dark mode */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Content */}
        <div className="relative px-4 py-6">
          {/* Title */}
          <div className="text-center mb-4">
            <h3
              className="text-lg font-serif tracking-wider"
              style={{ color: "#E5E5E5" }}
            >
              待命之卒
            </h3>
            <div className="h-px w-24 mx-auto mt-2 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
          </div>

          {/* Scrollable card container */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-min px-2">
              {cards.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onDragStart={() => onCardDragStart?.(card.id)}
                  draggable
                >
                  <BattleCard
                    type={card.type}
                    name={card.name}
                    power={card.power}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Drag hint */}
          <div className="text-center mt-4 text-xs text-gray-400">
            拖动卡牌至上方战场部署
          </div>
        </div>

        {/* Decorative ink strokes */}
        <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-red-900/30 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-red-900/30 rounded-tr-lg" />
      </div>
    </motion.div>
  );
}
