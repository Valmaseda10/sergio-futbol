// Escudo real de la Cultural y Deportiva Leonesa (archivo que pasó el
// usuario, con el fondo ya recortado), en vez de una recreación dibujada a
// mano: se usa tal cual como logo (cabecera, login) y como marca de agua de
// fondo.
const RATIO_ALTO = 224 / 162; // proporción real del archivo public/escudo-cultural.png

export function ClubCrest({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/escudo-cultural.png"
      alt=""
      width={size}
      height={Math.round(size * RATIO_ALTO)}
      className={className}
      style={{ width: size, height: size * RATIO_ALTO }}
      aria-hidden="true"
    />
  );
}
