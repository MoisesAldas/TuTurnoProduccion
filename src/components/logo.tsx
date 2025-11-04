interface LogoProps {
  color?: "emerald" | "white" | "black" | "gray"
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function Logo({
  color = "emerald",
  size = "md",
  className = "",
}: LogoProps) {
  // Tamaños del texto
  const sizeClass =
    size === "sm"
      ? "text-lg"
      : size === "lg"
      ? "text-3xl"
      : "text-2xl"

  // Colores disponibles
  const colorClass =
    color === "emerald"
      ? "bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
      : color === "white"
      ? "text-white"
      : color === "black"
      ? "text-black"
      : "text-gray-700"

  return (
    <span
      className={`${sizeClass} font-black font-[Poppins] tracking-tight
      ${colorClass} transition-all duration-300 hover:scale-105 hover:brightness-110 select-none ${className}`}
    >
      tuturno
    </span>
  )
}
