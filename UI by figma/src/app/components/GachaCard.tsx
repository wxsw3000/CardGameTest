import { motion } from "motion/react";

export function GachaCard() {
  return (
    <motion.div
      className="relative w-64 h-80 mx-auto"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* 外层发光效果 */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600"
        animate={{
          boxShadow: [
            "0 0 20px rgba(251, 191, 36, 0.5)",
            "0 0 40px rgba(251, 191, 36, 0.8)",
            "0 0 20px rgba(251, 191, 36, 0.5)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 内层卡牌 */}
      <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 flex items-center justify-center overflow-hidden">
        {/* 光芒效果 */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-white/30 via-transparent to-transparent"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* 星光粒子 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* SSR文字 */}
        <motion.div
          className="relative z-10"
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="text-8xl font-black text-white drop-shadow-2xl tracking-wider">
            SSR
          </div>
          <motion.div
            className="absolute inset-0 text-8xl font-black text-yellow-200 mix-blend-overlay"
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            SSR
          </motion.div>
        </motion.div>

        {/* 边框装饰 */}
        <div className="absolute inset-0 rounded-xl border-4 border-white/30" />
        <div className="absolute inset-2 rounded-lg border-2 border-yellow-200/50" />
      </div>

      {/* 底部光晕 */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-yellow-500/50 blur-3xl rounded-full"
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
