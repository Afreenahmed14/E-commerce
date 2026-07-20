import { useCountUp } from '../../utils/gsapHooks';

/**
 * Renders a number that counts up from 0 to `value` using GSAP whenever
 * `value` changes. Used on dashboard stat cards so KPI numbers feel alive
 * rather than just appearing.
 */
export default function CountUpValue({ value, formatter, duration = 1 }) {
  const ref = useCountUp(value, { duration, formatter });
  return <span ref={ref}>{formatter ? formatter(value) : value}</span>;
}
