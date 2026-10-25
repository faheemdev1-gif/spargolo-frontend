import { useEffect } from "react";

export function usePlayback(ref, enabled) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    let inView = false;
    const update = () => {
      if (enabled && inView && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        update();
      },
      { threshold: 0.15 },
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", update);
    if (!enabled) video.pause();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      video.pause();
    };
  }, [ref, enabled]);
}
