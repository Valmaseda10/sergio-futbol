import { clubConfig } from "@/lib/club-config";

const GRANA = clubConfig.colorPrimario;
const GOLD = clubConfig.colorSecundario;
const PAPER = "#fbf7f5";

export function Crest({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.08}
      viewBox="0 0 100 108"
      className={className}
      aria-hidden="true"
    >
      <polygon points="18,3 8,9 8,11 15,8" fill={GOLD} />
      <polygon points="50,0 40,8 40,10 50,4 60,10 60,8" fill={GOLD} />
      <polygon points="82,3 92,9 92,11 85,8" fill={GOLD} />
      <path
        d="M50 8 L90 24 L90 58 Q90 92 50 106 Q10 92 10 58 L10 24 Z"
        fill={GRANA}
        stroke={GOLD}
        strokeWidth={3}
      />
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fontFamily="var(--font-oswald), sans-serif"
        fontWeight={700}
        fontSize={42}
        fill={PAPER}
      >
        {clubConfig.escudoIniciales}
      </text>
    </svg>
  );
}
