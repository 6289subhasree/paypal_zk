"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Lightweight scroll-triggered entrance animation.
 * Returns a ref and a boolean — true once the element enters the viewport.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, visible];
}

