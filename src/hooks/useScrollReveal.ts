"use client";

import { useEffect, useRef, useState } from "react";

// ===== Scroll Reveal Hook =====
interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook that uses IntersectionObserver to detect when an element scrolls into the viewport.
 * Uses root: null (viewport) which requires the viewport to be the scroll container.
 * Call `useLandingScroll()` in the page component to ensure the viewport scrolls.
 *
 * NOTE: prefers-reduced-motion check is disabled because the user has it enabled
 * system-wide in Windows, but still wants landing page animations.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {},
) {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -50px 0px",
    triggerOnce = true,
  } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // NOTE: prefers-reduced-motion check disabled - user preference
    // To re-enable for accessibility, uncomment:
    // if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    //   setIsVisible(true)
    //   return
    // }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
        root: null,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}

/**
 * Call this hook in the landing page component to ensure the viewport (html/body)
 * is the scroll container. This fixes IntersectionObserver when the root layout
 * sets overflow-y: auto on the body.
 *
 * On mount: forces html & body to allow natural viewport scrolling.
 * On unmount: restores original overflow styles.
 */
export function useLandingScroll() {
  useEffect(() => {
    // Save original styles
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const origHtmlOverflow = htmlEl.style.overflow;
    const origHtmlHeight = htmlEl.style.height;
    const origBodyOverflow = bodyEl.style.overflow;
    const origBodyOverflowY = bodyEl.style.overflowY;
    const origBodyHeight = bodyEl.style.height;

    // Force viewport scrolling by removing overflow constraints
    htmlEl.style.overflow = "visible";
    htmlEl.style.height = "auto";
    bodyEl.style.overflow = "visible";
    bodyEl.style.overflowY = "visible";
    bodyEl.style.height = "auto";

    // Add smooth scrolling for anchor links
    htmlEl.style.scrollBehavior = "smooth";

    return () => {
      // Restore original styles
      htmlEl.style.overflow = origHtmlOverflow;
      htmlEl.style.height = origHtmlHeight;
      htmlEl.style.scrollBehavior = "";
      bodyEl.style.overflow = origBodyOverflow;
      bodyEl.style.overflowY = origBodyOverflowY;
      bodyEl.style.height = origBodyHeight;
    };
  }, []);
}
