import { useState } from "react";
import { motion } from "motion/react";
import { LaneColumn } from "./components/LaneColumn";
import { ConfirmButton } from "./components/ConfirmButton";

interface Unit {
  id: string;
  name: string;
  attack: number;
  hp: number;
  portrait: string;
}

export default function App() {
  // Sample portraits - using different images for variety
  const portraits = [
    "https://images.unsplash.com/photo-1699005734639-ebf496f3bdbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGluZXNlJTIwd2FycmlvciUyMGluayUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MDg3NjQxOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    "https://images.unsplash.com/photo-1759108272457-e63341a65b20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmNpZW50JTIwY2hpbmVzZSUyMGdlbmVyYWwlMjBmYWNlfGVufDF8fHx8MTc3MDg3NjQxOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    "https://images.unsplash.com/photo-1658270600988-7e6a66ed253e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW11cmFpJTIwd2FycmlvciUyMHBvcnRyYWl0JTIwZGFya3xlbnwxfHx8fDE3NzA4NzY0MTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  ];

  const [leftLane, setLeftLane] = useState<Unit[]>([
    { id: "l1", name: "赵云", attack: 8, hp: 12, portrait: portraits[0] },
    { id: "l2", name: "张飞", attack: 9, hp: 14, portrait: portraits[1] },
    { id: "l3", name: "关羽", attack: 10, hp: 13, portrait: portraits[2] },
  ]);

  const [centerLane, setCenterLane] = useState<Unit[]>([
    { id: "c1", name: "诸葛亮", attack: 6, hp: 8, portrait: portraits[0] },
    { id: "c2", name: "黄忠", attack: 8, hp: 10, portrait: portraits[1] },
  ]);

  const [rightLane, setRightLane] = useState<Unit[]>([
    { id: "r1", name: "马超", attack: 9, hp: 11, portrait: portraits[2] },
  ]);

  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);
  const [dragOverLane, setDragOverLane] = useState<string | null>(null);

  const handleDragStart = (unitId: string) => {
    setDraggingUnitId(unitId);
  };

  const handleDragEnd = () => {
    setDraggingUnitId(null);
    setDragOverLane(null);
  };

  const handleDrop = (
    unitId: string,
    targetLane: "left" | "center" | "right"
  ) => {
    // Find the unit in all lanes
    let unit: Unit | undefined;
    let sourceLane: "left" | "center" | "right" | null = null;

    if (leftLane.some((u) => u.id === unitId)) {
      unit = leftLane.find((u) => u.id === unitId);
      sourceLane = "left";
    } else if (centerLane.some((u) => u.id === unitId)) {
      unit = centerLane.find((u) => u.id === unitId);
      sourceLane = "center";
    } else if (rightLane.some((u) => u.id === unitId)) {
      unit = rightLane.find((u) => u.id === unitId);
      sourceLane = "right";
    }

    if (!unit || !sourceLane) return;

    // Remove from source lane
    if (sourceLane === "left") {
      setLeftLane((prev) => prev.filter((u) => u.id !== unitId));
    } else if (sourceLane === "center") {
      setCenterLane((prev) => prev.filter((u) => u.id !== unitId));
    } else if (sourceLane === "right") {
      setRightLane((prev) => prev.filter((u) => u.id !== unitId));
    }

    // Add to target lane
    if (targetLane === "left" && sourceLane !== "left") {
      setLeftLane((prev) => [...prev, unit!]);
    } else if (targetLane === "center" && sourceLane !== "center") {
      setCenterLane((prev) => [...prev, unit!]);
    } else if (targetLane === "right" && sourceLane !== "right") {
      setRightLane((prev) => [...prev, unit!]);
    }

    setDraggingUnitId(null);
    setDragOverLane(null);
  };

  const handleConfirm = () => {
    console.log("Formation confirmed!");
    console.log("Left Lane:", leftLane);
    console.log("Center Lane:", centerLane);
    console.log("Right Lane:", rightLane);
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center bg-black">
      {/* Main frame - iPhone 14 Pro dimensions */}
      <div className="relative w-[393px] h-[852px] overflow-hidden">
        {/* Background - Deep ink with flowing water texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "#0A0A0A",
            backgroundImage: `
              linear-gradient(180deg, transparent 0%, rgba(18, 18, 18, 0.8) 50%, transparent 100%),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(255, 255, 255, 0.02) 2px,
                rgba(255, 255, 255, 0.02) 4px
              )
            `,
          }}
        />

        {/* Ink wash texture overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1762860498297-4b6c3591b041?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGluZXNlJTIwaW5rJTIwd2FzaCUyMHBhaW50aW5nJTIwbW91bnRhaW5zfGVufDF8fHx8MTc3MDgxOTQ0Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundBlendMode: "multiply",
          }}
        />

        {/* Title */}
        <motion.div
          className="absolute top-8 left-0 right-0 text-center z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1
            className="text-2xl font-black tracking-widest mb-2"
            style={{
              color: "#E5E5E5",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.8)",
              fontFamily: "serif",
            }}
          >
            调整阵型
          </h1>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-red-700" />
            <div className="text-[10px] tracking-widest" style={{ color: "#C21F30" }}>
              REBALANCE
            </div>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-red-700" />
          </div>
        </motion.div>

        {/* 3 Lane Columns (70% of screen height) */}
        <div
          className="absolute top-[120px] left-0 right-0 px-3"
          style={{ height: "calc(70% - 60px)" }}
        >
          <div className="h-full flex gap-2">
            {/* Left Lane */}
            <div
              className="relative flex-1"
              onDragEnter={() => setDragOverLane("left")}
              onDragLeave={() => setDragOverLane(null)}
            >
              <LaneColumn
                lane="left"
                units={leftLane}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingUnitId={draggingUnitId}
                isDragOver={dragOverLane === "left"}
              />
            </div>

            {/* Vertical divider - Ink brush line */}
            <div
              className="w-px"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, #4A5568 20%, #4A5568 80%, transparent)",
              }}
            />

            {/* Center Lane */}
            <div
              className="relative flex-1"
              onDragEnter={() => setDragOverLane("center")}
              onDragLeave={() => setDragOverLane(null)}
            >
              <LaneColumn
                lane="center"
                units={centerLane}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingUnitId={draggingUnitId}
                isDragOver={dragOverLane === "center"}
              />
            </div>

            {/* Vertical divider - Ink brush line */}
            <div
              className="w-px"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, #4A5568 20%, #4A5568 80%, transparent)",
              }}
            />

            {/* Right Lane */}
            <div
              className="relative flex-1"
              onDragEnter={() => setDragOverLane("right")}
              onDragLeave={() => setDragOverLane(null)}
            >
              <LaneColumn
                lane="right"
                units={rightLane}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                draggingUnitId={draggingUnitId}
                isDragOver={dragOverLane === "right"}
              />
            </div>
          </div>
        </div>

        {/* Bottom Controls (15%) */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-8"
          style={{ height: "15%" }}
        >
          <ConfirmButton onClick={handleConfirm} />
        </div>

        {/* Decorative corners */}
        <motion.div
          className="absolute top-4 left-4 w-20 h-20 border-l-2 border-t-2 rounded-tl-3xl opacity-20"
          style={{ borderColor: "#E6C200" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 0.5, duration: 1 }}
        />
        <motion.div
          className="absolute top-4 right-4 w-20 h-20 border-r-2 border-t-2 rounded-tr-3xl opacity-20"
          style={{ borderColor: "#E6C200" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 0.5, duration: 1 }}
        />
      </div>
    </div>
  );
}
