const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
];

export function getYoutubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYoutubeEmbedUrl(
  url: string,
  segundoInicio?: number | null,
  segundoFin?: number | null,
): string | null {
  const id = getYoutubeVideoId(url);
  if (!id) return null;
  const params = new URLSearchParams();
  if (segundoInicio != null && segundoInicio > 0) {
    params.set("start", String(Math.floor(segundoInicio)));
  }
  if (segundoFin != null && segundoFin > 0) {
    params.set("end", String(Math.floor(segundoFin)));
  }
  const query = params.toString();
  return `https://www.youtube-nocookie.com/embed/${id}${query ? `?${query}` : ""}`;
}

export function formatearDuracion(segundos: number) {
  const total = Math.max(0, Math.round(segundos));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
