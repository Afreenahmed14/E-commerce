import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from './gsapSetup';

/**
 * Reveals the direct children of the returned ref element with a staggered
 * fade-up as the container scrolls into view. Used for "product grid"-style
 * sections (step cards, candidate cards, stat cards) so the page feels
 * alive without every element animating on every render.
 *
 * @param {object} options
 * @param {string} options.childSelector - CSS selector for children to stagger (default direct children)
 * @param {number} options.deps - dependency array item (e.g. data.length) to re-run when content changes
 */
export function useScrollReveal(childSelector, deps = []) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || !containerRef.current) return;

    const targets = childSelector
      ? containerRef.current.querySelectorAll(childSelector)
      : containerRef.current.children;

    if (!targets || targets.length === 0) return;

    gsap.set(targets, { opacity: 0, y: 28 });

    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });

    return () => {
      tween.scrollTrigger && tween.scrollTrigger.kill();
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

/**
 * Animates a numeric value counting up from 0 to `value` whenever it
 * changes, writing the formatted number into the DOM node directly (avoids
 * a re-render per animation frame). Pass a formatter for currency/commas.
 */
export function useCountUp(value, { duration = 1, formatter = (n) => Math.round(n) } = {}) {
  const elRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || value === undefined || value === null) return;

    if (prefersReducedMotion()) {
      elRef.current.textContent = formatter(value);
      return;
    }

    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: value,
      duration,
      ease: 'power1.out',
      onUpdate: () => {
        if (elRef.current) elRef.current.textContent = formatter(obj.val);
      },
    });

    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return elRef;
}
