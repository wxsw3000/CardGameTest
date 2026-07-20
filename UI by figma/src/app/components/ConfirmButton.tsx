import { motion } from "motion/react";

interface ConfirmButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export function ConfirmButton({ onClick, disabled = false }: ConfirmButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-40 h-16 rounded-xl ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          backgroundColor: "#C21F30",
          boxShadow: disabled
            ? "0 4px 12px rgba(194, 31, 48, 0.3)"
            : "0 4px 20px rgba(194, 31, 48, 0.6)",
        }}
        animate={
          disabled
            ? {}
            : {
                boxShadow: [
                  "0 4px 20px rgba(194, 31, 48, 0.6)",
                  "0 4px 30px rgba(194, 31, 48, 0.9)",
                  "0 4px 20px rgba(194, 31, 48, 0.6)",
                ],
              }
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main button body */}
      <div
        className="absolute inset-1 rounded-lg flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, #E84855, #C21F30 50%, #8B1A24)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {/* Seal stamp texture */}
        <div
          className="absolute inset-0 opacity-20 rounded-lg"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M0 0h40v40H0V0zm20 2a18 18 0 1 0 0 36 18 18 0 0 0 0-36zm0 4a14 14 0 1 1 0 28 14 14 0 0 1 0-28z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Inner shadow */}
        <div
          className="absolute inset-2 rounded-md"
          style={{
            boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.4)",
          }}
        />

        {/* Text content */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Chinese character */}
          <span
            className="text-4xl font-black"
            style={{
              color: "#FFFFFF",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              fontFamily: "serif",
            }}
          >
            令
          </span>

          {/* English subtitle */}
          <span
            className="text-[10px] tracking-widest mt-0.5"
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
            }}
          >
            EXECUTE
          </span>
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

      {/* Corner decorations */}
      <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-yellow-600/50" />
      <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-yellow-600/50" />
      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-yellow-600/50" />
      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-yellow-600/50" />
    </motion.button>
  );
}
