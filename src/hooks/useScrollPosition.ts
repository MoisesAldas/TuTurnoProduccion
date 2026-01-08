import { useState, useEffect } from "react";

/**
 * Hook to detect if the user has scrolled past a certain threshold
 * @param threshold - Number of pixels to scroll before returning true (default: 50)
 * @returns boolean - true if scrolled past threshold, false otherwise
 */
export function useScrollPosition(threshold: number = 50): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > threshold;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    // Check initial scroll position
    handleScroll();

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Cleanup
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled, threshold]);

  return scrolled;
}
