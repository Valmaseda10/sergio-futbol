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
): string | null {
  const id = getYoutubeVideoId(url);
  if (!id) return null;
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  return segundoInicio != null && segundoInicio > 0
    ? `${base}?start=${Math.floor(segundoInicio)}`
    : base;
}
