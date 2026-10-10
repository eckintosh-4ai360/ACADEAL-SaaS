const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function normalizeYouTubeUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  const prefixed =
    /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    return new URL(prefixed);
  } catch {
    return null;
  }
}

function normalizeVideoId(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const cleaned = candidate.trim().split(/[?&#/]/)[0];
  return YOUTUBE_VIDEO_ID_PATTERN.test(cleaned) ? cleaned : null;
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  const parsedUrl = normalizeYouTubeUrl(rawUrl);
  if (!parsedUrl) return null;

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "youtu.be") {
    return normalizeVideoId(parsedUrl.pathname.slice(1));
  }

  const isYouTubeHost =
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com") ||
    hostname === "youtube-nocookie.com" ||
    hostname.endsWith(".youtube-nocookie.com");

  if (!isYouTubeHost) {
    return null;
  }

  if (parsedUrl.pathname === "/watch") {
    return normalizeVideoId(parsedUrl.searchParams.get("v"));
  }

  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  if (pathSegments.length >= 2) {
    const [firstSegment, secondSegment] = pathSegments;
    if (
      firstSegment === "embed" ||
      firstSegment === "shorts" ||
      firstSegment === "live" ||
      firstSegment === "v"
    ) {
      return normalizeVideoId(secondSegment);
    }
  }

  return null;
}

export function toCanonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}
