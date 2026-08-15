const ROJO = "#e0141d";
const ORO = "#c9971f";
const BLANCO = "#ffffff";

// Recreación simplificada (no pixel-perfect) del escudo de la Cultural y
// Deportiva Leonesa, dibujada a partir de la imagen que pasó el usuario:
// corona dorada, aro rojo con "CULTURAL" / "LEONESA" / "1923" y león
// rampante rojo coronado sobre fondo blanco. Solo se usa como marca de
// agua muy tenue en los PDF, así que prioriza que se reconozca la silueta
// general sobre la fidelidad exacta del trazo.
export function ClubCrest({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (240 / 220)}
      viewBox="0 0 220 240"
      className={className}
      aria-hidden="true"
    >
      {/* Corona */}
      <g fill={ORO}>
        <path d="M55 44 L45 8 L70 26 L83 0 L96 20 L110 2 L124 20 L137 0 L150 26 L175 8 L165 44 Z" />
        <circle cx="45" cy="8" r="6" />
        <circle cx="83" cy="0" r="6" />
        <circle cx="110" cy="2" r="7" />
        <circle cx="137" cy="0" r="6" />
        <circle cx="175" cy="8" r="6" />
        <rect x="53" y="42" width="114" height="10" rx="2" />
      </g>

      {/* Aro exterior */}
      <circle cx="110" cy="142" r="95" fill={ROJO} />
      <circle cx="110" cy="142" r="71" fill={BLANCO} />

      {/* Rótulos en el aro */}
      <defs>
        <path id="arcoSuperior" d="M27,142 A83,83 0 0 1 193,142" />
        <path id="arcoInferior" d="M27,142 A83,83 0 0 0 193,142" />
      </defs>
      <text fill={BLANCO} fontSize="17" fontWeight="700" letterSpacing="2">
        <textPath href="#arcoSuperior" startOffset="50%" textAnchor="middle">
          CULTURAL
        </textPath>
      </text>
      <text fill={BLANCO} fontSize="17" fontWeight="700" letterSpacing="2">
        <textPath href="#arcoInferior" startOffset="50%" textAnchor="middle">
          LEONESA
        </textPath>
      </text>
      <text
        fill={BLANCO}
        fontSize="13"
        fontWeight="700"
        x="30"
        y="147"
        textAnchor="middle"
        transform="rotate(-78 30 147)"
      >
        1923
      </text>
      <text
        fill={BLANCO}
        fontSize="13"
        fontWeight="700"
        x="190"
        y="147"
        textAnchor="middle"
        transform="rotate(78 190 147)"
      >
        1923
      </text>

      {/* León rampante coronado */}
      <g fill={ROJO}>
        <path
          d="M95 190
             C80 188 70 172 72 155
             C73 143 82 132 80 118
             C79 108 70 104 68 92
             C74 88 84 90 90 98
             C90 86 96 76 108 72
             C104 82 106 92 112 98
             C120 90 132 88 140 94
             C133 98 126 104 126 114
             C126 124 134 128 138 120
             C142 128 138 138 128 140
             C132 148 130 158 122 162
             C126 168 136 166 142 158
             C144 168 136 178 124 178
             C126 186 120 194 110 192
             C112 184 108 178 100 180
             C98 186 100 190 95 190 Z"
        />
        {/* melena */}
        <g>
          <circle cx="108" cy="86" r="16" />
          <path d="M92 78 L86 70 L96 72 Z" />
          <path d="M96 68 L92 58 L104 64 Z" />
          <path d="M108 65 L108 54 L118 64 Z" />
          <path d="M120 68 L126 58 L124 70 Z" />
        </g>
        {/* corona pequeña */}
        <g fill={ORO}>
          <path d="M98 62 L100 54 L104 60 L108 50 L112 60 L116 54 L118 62 Z" />
        </g>
        {/* pata delantera levantada */}
        <path
          d="M92 100 C78 96 68 100 60 92"
          stroke={ROJO}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        {/* cola */}
        <path
          d="M124 176 C146 172 150 156 140 144 C148 146 152 156 146 166"
          stroke={ROJO}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
