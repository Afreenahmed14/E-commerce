import { useEffect, useRef } from 'react';
import {
  SiReact, SiVuedotjs, SiAngular, SiJavascript, SiTypescript, SiTailwindcss,
  SiNodedotjs, SiExpress, SiPython, SiDjango, SiPhp,
  SiMongodb, SiPostgresql, SiMysql, SiRedis, SiCloudinary,
  SiDocker, SiKubernetes, SiGit, SiGithub, SiFigma, SiJira,
} from 'react-icons/si';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';
import './Technologies.css';

const CATEGORIES = [
  {
    name: 'Frontend',
    color: '#2563eb',
    techs: [
      { name: 'React', Icon: SiReact },
      { name: 'Vue.js', Icon: SiVuedotjs },
      { name: 'Angular', Icon: SiAngular },
      { name: 'JavaScript', Icon: SiJavascript },
      { name: 'TypeScript', Icon: SiTypescript },
      { name: 'Tailwind CSS', Icon: SiTailwindcss },
    ],
  },
  {
    name: 'Backend',
    color: '#16a34a',
    techs: [
      { name: 'Node.js', Icon: SiNodedotjs },
      { name: 'Express', Icon: SiExpress },
      { name: 'Python', Icon: SiPython },
      { name: 'Django', Icon: SiDjango },
      { name: 'PHP', Icon: SiPhp },
    ],
  },
  {
    name: 'Database',
    color: '#d97706',
    techs: [
      { name: 'MongoDB', Icon: SiMongodb },
      { name: 'PostgreSQL', Icon: SiPostgresql },
      { name: 'MySQL', Icon: SiMysql },
      { name: 'Redis', Icon: SiRedis },
    ],
  },
  {
    name: 'Cloud & DevOps',
    color: '#0ea5e9',
    techs: [
      { name: 'Docker', Icon: SiDocker },
      { name: 'Kubernetes', Icon: SiKubernetes },
      { name: 'Cloudinary', Icon: SiCloudinary },
      { name: 'Git', Icon: SiGit },
      { name: 'GitHub', Icon: SiGithub },
    ],
  },
  {
    name: 'Design & Tools',
    color: '#dc2626',
    techs: [
      { name: 'Figma', Icon: SiFigma },
      { name: 'Jira', Icon: SiJira },
    ],
  },
];

export default function Technologies() {
  const treeRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || !treeRef.current) return;

    // Scoped with gsap.context() so cleanup can fully `revert()` every
    // tween's inline styles rather than just `kill()`-ing them. This matters
    // because React 18 StrictMode mounts every effect twice in development:
    // mount -> cleanup -> mount again. With plain `tl.kill()`, the first
    // (killed) timeline can leave elements frozen mid-tween (e.g. still at
    // opacity: 0), and since `.from()` captures whatever the CURRENT inline
    // style is as its animation target, the second timeline's `.from()`
    // calls would then capture that frozen opacity: 0 as their target too —
    // leaving the whole tree permanently invisible. `ctx.revert()` removes
    // all gsap-applied inline styles on cleanup, so every re-run starts from
    // the real, untouched CSS state instead of the previous run's leftovers.
    const ctx = gsap.context(() => {
      const root = treeRef.current.querySelector('.tech-root');
      const trunk = treeRef.current.querySelectorAll('.tech-trunk-line');
      const branches = treeRef.current.querySelectorAll('.tech-branch');
      const leaves = treeRef.current.querySelectorAll('.tech-leaf');

      const tl = gsap.timeline({ defaults: { ease: 'back.out(1.6)' } });
      tl.from(root, { opacity: 0, scale: 0.6, duration: 0.5 })
        .from(trunk, { scaleY: 0, transformOrigin: 'top center', duration: 0.4, ease: 'power2.out' }, '-=0.15')
        .from(branches, { opacity: 0, y: -16, duration: 0.5, stagger: 0.08 }, '-=0.2')
        .from(leaves, { opacity: 0, y: 16, scale: 0.5, duration: 0.4, stagger: 0.03 }, '-=0.2');

      // Gentle continuous float on every leaf icon, each with its own phase
      // offset so the whole tree feels alive rather than perfectly synced.
      leaves.forEach((leaf, i) => {
        gsap.to(leaf, {
          y: i % 2 === 0 ? -6 : 6,
          duration: 2 + (i % 5) * 0.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.05,
        });
      });
    }, treeRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="tech-page">
      <div className="container section tech-header">
        <h1>Our Technology Stack</h1>
        <p className="text-muted">
          HourlyRecruit's engineer network covers the full range of modern
          development skills — organized here like a tree, from foundation to leaves.
        </p>
      </div>

      <div className="container tech-tree" ref={treeRef}>
        <div className="tech-root">Technologies We Support</div>
        <div className="tech-trunk-line" />
        <div className="tech-branches">
          {CATEGORIES.map((cat) => (
            <div className="tech-branch-wrap" key={cat.name}>
              <div className="tech-branch" style={{ borderColor: cat.color, color: cat.color }}>
                {cat.name}
              </div>
              <div className="tech-leaves">
                {cat.techs.map(({ name, Icon }) => (
                  <div className="tech-leaf" key={name} title={name}>
                    <div className="tech-leaf-icon" style={{ color: cat.color }}>
                      <Icon size={28} />
                    </div>
                    <span className="tech-leaf-label">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
