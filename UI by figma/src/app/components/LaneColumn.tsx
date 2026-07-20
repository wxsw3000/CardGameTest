import { motion, AnimatePresence } from "motion/react";
import { SquareUnitCard } from "./SquareUnitCard";

interface Unit {
  id: string;
  name: string;
  attack: number;
  hp: number;
  portrait: string;
}

interface LaneColumnProps {
  lane: "left" | "center" | "right";
  units: Unit[];
  onDragStart?: (unitId: string) => void;
  onDragEnd?: () => void;
  onDrop?: (unitId: string, targetLane: "left" | "center" | "right") => void;
  draggingUnitId?: string | null;
  isDragOver?: boolean;
}

export function LaneColumn({
  lane,
  units,
  onDragStart,
  onDragEnd,
  onDrop,
  draggingUnitId,
  isDragOver = false,
}: LaneColumnProps) {
  const laneNames = {
    left: "左营",
    center: "中营",
    right: "右营",
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingUnitId && onDrop) {
      onDrop(draggingUnitId, lane);
    }
  };

  return (
    <motion.div
      className="relative flex-1 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Lane Header */}
      <div className="text-center mb-3 pb-2 border-b border-gray-700/50">
        <h3
          className="text-sm font-serif tracking-widest"
          style={{ color: "#E5E5E5" }}
        >
          {laneNames[lane]}
        </h3>
      </div>

      {/* Cards Container */}
      <motion.div
        className={`relative flex-1 flex flex-col items-center gap-3 px-2 py-3 rounded-lg transition-all duration-300 ${
          isDragOver ? "bg-yellow-900/20" : "bg-transparent"
        }`}
        style={{
          border: isDragOver ? "2px dashed #E6C200" : "2px dashed transparent",
        }}
        animate={{
          scale: isDragOver ? 1.02 : 1,
        }}
      >
        <AnimatePresence mode="popLayout">
          {units.length > 0 ? (
            units.map((unit, index) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <SquareUnitCard
                  id={unit.id}
                  name={unit.name}
                  attack={unit.attack}
                  hp={unit.hp}
                  portrait={unit.portrait}
                  queuePosition={index}
                  isDragging={draggingUnitId === unit.id}
                  onDragStart={() => onDragStart?.(unit.id)}
                  onDragEnd={onDragEnd}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              className="flex-1 flex items-center justify-center text-gray-600 text-xs font-serif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              空位
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop zone indicator */}
        {isDragOver && units.length === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="text-xs font-serif"
              style={{ color: "#E6C200" }}
            >
              放置于此
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Ghost placeholder when dragging from this lane */}
      {draggingUnitId &&
        units.some((u) => u.id === draggingUnitId) &&
        units.length > 0 && (
          <motion.div
            className="absolute top-16 left-1/2 -translate-x-1/2 w-[100px] h-[100px] border-2 border-dashed rounded-md"
            style={{ borderColor: "#4A5568" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">
              ···
            </div>
          </motion.div>
        )}
    </motion.div>
  );
}
