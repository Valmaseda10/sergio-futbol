const ROJO = "#e0141d";
const ORO = "#c9971f";
const BLANCO = "#ffffff";

// Recreación simplificada (no pixel-perfect) del escudo de la Cultural y
// Deportiva Leonesa, dibujada a partir de la imagen que pasó el usuario:
// corona dorada, aro rojo con "CULTURAL" / "LEONESA" / "1923" y león
// rampante rojo coronado (melena en forma de sol, cuerpo, cola y una garra
// levantada) sobre fondo blanco. Se usa tanto de logo (cabecera, login)
// como de marca de agua de fondo, así que prioriza que la silueta se
// reconozca claramente como un león incluso a tamaño pequeño, por encima
// del detalle fino del trazo.
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

      {/* León rampante coronado, centrado en el aro blanco */}
      <g transform="translate(35 87) scale(0.68)">
        <g fill={ROJO}>
          {/* melena: sol de 12 puntas alrededor de la cabeza */}
          <path d="M 125.0 65.0 L 137.8 73.8 L 122.3 75.0 L 129.0 89.0 L 115.0 82.3 L 113.8 97.8 L 105.0 85.0 L 96.2 97.8 L 95.0 82.3 L 81.0 89.0 L 87.7 75.0 L 72.2 73.8 L 85.0 65.0 L 72.2 56.2 L 87.7 55.0 L 81.0 41.0 L 95.0 47.7 L 96.2 32.2 L 105.0 45.0 L 113.8 32.2 L 115.0 47.7 L 129.0 41.0 L 122.3 55.0 L 137.8 56.2 Z" />
          {/* cara, dentro de la melena */}
          <circle cx="105" cy="65" r="20" />
          {/* cuerpo, inclinado, saliendo por debajo de la melena */}
          <path
            d="M 90 78
               C 78 82 70 94 70 108
               C 70 124 78 138 92 146
               C 100 150 110 150 116 144
               C 124 136 126 122 120 108
               C 116 98 112 88 108 80 Z"
          />
          {/* patas traseras */}
          <path d="M100 140 C 96 152 96 166 104 174 C 110 178 116 174 114 164 C 112 154 106 146 100 140 Z" />
          <path d="M86 138 C 78 146 74 158 78 168 C 84 172 90 168 90 158 C 90 150 88 144 86 138 Z" />
          {/* pata delantera levantada, con garra */}
          <path
            d="M92 82 C80 76 68 68 62 56"
            stroke={ROJO}
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M58 50 L48 42 M58 50 L50 54 M58 50 L56 60"
            stroke={ROJO}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          {/* cola, sale del cuerpo y se curva por encima del lomo */}
          <path
            d="M110 142 C136 140 150 118 144 98 C141 88 132 82 124 82"
            stroke={ROJO}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="127" cy="80" rx="7" ry="5" transform="rotate(15 127 80)" />
        </g>
        {/* corona pequeña sobre la melena */}
        <g fill={ORO}>
          <path d="M92 36 L94 26 L100 34 L104 22 L108 34 L114 26 L116 36 Z" />
        </g>
      </g>
    </svg>
  );
}
