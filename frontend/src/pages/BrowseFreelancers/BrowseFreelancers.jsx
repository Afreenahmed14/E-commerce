import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiSearch, FiX, FiShield, FiZap, FiArrowRight, FiCheckCircle, FiGlobe,
  FiGrid, FiList, FiAward, FiLock as FiLockIcon, FiUsers,
} from 'react-icons/fi';
import {
  SiReact, SiNodedotjs, SiPython, SiDocker, SiKubernetes,
  SiTypescript, SiMongodb, SiSpringboot,
} from 'react-icons/si';
import { FaAws, FaJava, FaDatabase } from 'react-icons/fa';
import { candidateService } from '../../services/candidateService';
import { companyService } from '../../services/companyService';
import { taxonomyService } from '../../services/taxonomyService';
import { useAuth } from '../../hooks/useAuth';
import { useDebounce } from '../../hooks/useDebounce';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import CitySearchInput from '../../components/common/CitySearchInput';
import FilterDropdown from '../../components/common/FilterDropdown';
import CandidateCard from '../../components/common/CandidateCard';
import { AVAILABILITY_OPTIONS } from '../../utils/constants';
import { gsap, prefersReducedMotion } from '../../utils/gsapSetup';
import './BrowseFreelancers.css';

/* Quick-pick chips under the search bar — purely a fast way to set the
   same `skill` filter the Filters panel already supports. Colored like
   the Home page's tech marquee so each brand reads clearly. */
const POPULAR_SKILLS_QUICK = [
  { name: 'React', Icon: SiReact, color: '#149eca' },
  { name: 'Node.js', Icon: SiNodedotjs, color: '#3c873a' },
  { name: 'Python', Icon: SiPython, color: '#3776ab' },
  { name: 'Java', Icon: FaJava, color: '#f89820' },
  { name: 'AWS', Icon: FaAws, color: '#ff9900' },
  { name: 'Docker', Icon: SiDocker, color: '#2496ed' },
  { name: 'Kubernetes', Icon: SiKubernetes, color: '#326ce5' },
  { name: 'SQL', Icon: FaDatabase, color: '#4479a1' },
  { name: 'TypeScript', Icon: SiTypescript, color: '#3178c6' },
  { name: 'MongoDB', Icon: SiMongodb, color: '#10b981' },
  { name: 'Spring Boot', Icon: SiSpringboot, color: '#6db33f' },
];

const TRUST_STRIP_ITEMS = [
  { icon: FiAward, tone: 'gold', title: 'Top 1% Engineers', sub: 'Pre-vetted and verified talent' },
  { icon: FiShield, tone: 'blue', title: 'Secure & Confidential', sub: 'Your data is always protected' },
  { icon: FiGlobe, tone: 'cyan', title: 'Global Talent', sub: 'Hire without borders' },
  { icon: FiZap, tone: 'orange', title: 'Flexible Hiring', sub: 'Hourly, part-time or full-time' },
];

const INITIAL_FILTERS = {
  q: '', name: '', skill: '', category: '', minRate: '', maxRate: '', minExperience: '', maxExperience: '',
  minRating: '', availability: '', city: '', remote: '',
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: '-rating', label: 'Highest Rated' },
  { value: '-experience', label: 'Most Experienced' },
  { value: 'hourlyRate', label: 'Lowest Rate' },
];

const RATING_OPTIONS = [4, 3, 2, 1];

// Specialization groups, grouped by the skill taxonomy admins already
// manage — picking "Frontend Engineers" here is shorthand for filtering
// candidates whose skills intersect this list, not a separate data model
// of its own. Lives as a "Category" option inside the filter bar itself
// rather than its own separate section on the page.
const FRONTEND_SKILLS = ['React', 'React.js', 'Angular', 'Vue.js', 'Vue', 'Next.js', 'JavaScript', 'TypeScript', 'HTML/CSS', 'Tailwind CSS'];
const BACKEND_SKILLS = ['Node.js', 'Node', 'Express', 'Python', 'Django', 'PHP', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'];

// Legacy skills lookup, kept only for the original built-in developer
// types so their filter keeps matching by skill intersection like before.
// Any developer type an admin adds later (not in this map) simply filters
// by exact `developerType` match on the backend instead — see
// categoryGroups below and the `developerType` param sent alongside `skill`.
const LEGACY_TYPE_SKILLS = {
  'Frontend Developer': FRONTEND_SKILLS,
  'Backend Developer': BACKEND_SKILLS,
  'Full Stack Developer': [...FRONTEND_SKILLS, ...BACKEND_SKILLS],
  'DevOps Engineer': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Git', 'GitHub', 'Jenkins', 'Terraform'],
  'Java Developer': ['Java', 'Spring', 'Spring Boot', 'Hibernate'],
  'Mobile Developer': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Android', 'iOS'],
};

export default function BrowseFreelancers() {
  const { isAuthenticated, role } = useAuth();
  const isCompany = isAuthenticated && role === 'company';
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookmarking, setBookmarking] = useState(null);
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS, skill: searchParams.get('skill') || '' }));
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' — display only, no data/logic change
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [categoryGroups, setCategoryGroups] = useState(
    Object.entries(LEGACY_TYPE_SKILLS).map(([name, skills]) => ({ name, skills }))
  );

  // Admin-managed "Developer Type" list — includes the original built-in
  // types plus any the admin has added since. New ones (not in
  // LEGACY_TYPE_SKILLS) filter by exact developerType match instead of skills.
  useEffect(() => {
    taxonomyService.getDeveloperTypes()
      .then((res) => {
        setCategoryGroups(res.data.developerTypes.map((d) => ({
          name: d.name,
          skills: LEGACY_TYPE_SKILLS[d.name] || [],
        })));
      })
      .catch(() => { });
  }, []);

  const debouncedQuery = useDebounce(filters.q, 400);
  const debouncedName = useDebounce(filters.name, 400);
  const debouncedCity = useDebounce(filters.city, 400);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        developerType: filters.category,
        q: debouncedQuery,
        name: debouncedName,
        city: debouncedCity,
        sort,
        page,
        limit: 16,
      };
      Object.keys(params).forEach((k) => {
        if (params[k] === '' || (Array.isArray(params[k]) && params[k].length === 0)) delete params[k];
      });

      const res = await candidateService.search(params);
      setCandidates(res.data.candidates);
      setPagination(res.data.pagination);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery, debouncedName, debouncedCity, sort, page,
    filters.skill, filters.category,
    filters.minRate, filters.maxRate, filters.minExperience, filters.maxExperience,
    filters.minRating, filters.availability, filters.remote,
  ]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const gridRef = useRef(null);

  // Every time a new page of results lands, animate the cards in with a
  // staggered fade + rise — makes each search/filter/page change feel
  // responsive rather than an abrupt content swap.
  useEffect(() => {
    if (prefersReducedMotion() || !gridRef.current || candidates.length === 0) return;
    const cards = gridRef.current.querySelectorAll('.candidate-card-link');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out', stagger: 0.06 }
    );
  }, [candidates]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  // Optimistic toggle: flips the card's bookmark state immediately, then
  // reconciles with the server; reverts on failure so the UI never lies
  // about what's actually saved.
  const toggleBookmark = async (e, candidateId, currentlyBookmarked) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarking(candidateId);
    setCandidates((prev) => prev.map((c) => (c._id === candidateId ? { ...c, isBookmarked: !currentlyBookmarked } : c)));
    try {
      if (currentlyBookmarked) {
        await companyService.removeBookmark(candidateId);
      } else {
        await companyService.bookmarkCandidate(candidateId);
      }
    } catch {
      setCandidates((prev) => prev.map((c) => (c._id === candidateId ? { ...c, isBookmarked: currentlyBookmarked } : c)));
    } finally {
      setBookmarking(null);
    }
  };

  const rateSummary = filters.minRate || filters.maxRate
    ? `₹${filters.minRate || '0'}–${filters.maxRate || '∞'}`
    : '';
  const experienceSummary = filters.minExperience || filters.maxExperience
    ? `${filters.minExperience || '0'}–${filters.maxExperience || '∞'} yrs`
    : '';
  const ratingSummary = filters.minRating ? `${filters.minRating}+ ★` : '';
  const categoryLabel = categoryGroups.find((g) => g.name === filters.category)?.name || '';
  const availabilityLabel = AVAILABILITY_OPTIONS.find((o) => o.value === filters.availability)?.label || '';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || '';
  const isRemoteOnly = filters.remote === 'true';

  return (
    <div className="browse-page">

      {/* Everything below — name search, filters, sort, results, cards —
          lives inside one unified panel so it reads as a single surface. */}
      <div className="browse-panel">
        <div className="container-section-browse-page-inner">

          <div className="browse-search-card">
            <div className="browse-filterbar">
              <div className="filter-search-inline browse-name-search">
                <FiSearch />
                <input
                  placeholder="Search by name, skill, or keyword…"
                  value={filters.name}
                  onChange={(e) => updateFilter('name', e.target.value)}
                />
              </div>

              <FilterDropdown
                label="Developer Type"
                summary={categoryLabel}
                active={!!filters.category}
                onClear={() => setFilters((f) => ({ ...f, category: '', skill: '' }))}
              >
                <div className="filter-option-list">
                  {categoryGroups.map((g) => (
                    <button
                      type="button"
                      key={g.name}
                      className={`filter-option ${filters.category === g.name ? 'is-selected' : ''}`}
                      onClick={() => {
                        setPage(1);
                        setFilters((f) => ({ ...f, category: g.name, skill: g.skills }));
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

            <div className="browse-filterbar-actions">
              <FilterDropdown
                label="Filters"
                modal
                summary={(() => {
                  const count = [rateSummary, experienceSummary, ratingSummary, availabilityLabel, filters.city, filters.name, isRemoteOnly ? 'Remote' : ''].filter(Boolean).length;
                  return count ? `${count} active` : '';
                })()}
                active={!!(rateSummary || experienceSummary || ratingSummary || availabilityLabel || filters.city || filters.name || isRemoteOnly)}
                onClear={() => setFilters((f) => ({ ...INITIAL_FILTERS, q: f.q, category: f.category, skill: f.skill }))}
              >
                <div className="filters-popup">
                  <div className="sidebar-filter-group">
                    <label>Charges per hour (₹)</label>
                    <div className="filter-range">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minRate}
                        onChange={(e) => updateFilter('minRate', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxRate}
                        onChange={(e) => updateFilter('maxRate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sidebar-filter-group">
                    <label>Years of experience</label>
                    <div className="filter-range">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minExperience}
                        onChange={(e) => updateFilter('minExperience', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxExperience}
                        onChange={(e) => updateFilter('maxExperience', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sidebar-filter-group">
                    <label>Rating</label>
                    <div className="filter-option-list sidebar-option-list filter-option-row">
                      {RATING_OPTIONS.map((r) => (
                        <button
                          type="button"
                          key={r}
                          className={`filter-option ${filters.minRating === String(r) ? 'is-selected' : ''}`}
                          onClick={() => updateFilter('minRating', filters.minRating === String(r) ? '' : String(r))}
                        >
                          {r}★ &amp; up
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sidebar-filter-group">
                    <label>Availability</label>
                    <div className="filter-option-list sidebar-option-list filter-option-row">
                      {AVAILABILITY_OPTIONS.map((o) => (
                        <button
                          type="button"
                          key={o.value}
                          className={`filter-option ${filters.availability === o.value ? 'is-selected' : ''}`}
                          onClick={() => updateFilter('availability', filters.availability === o.value ? '' : o.value)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sidebar-filter-group">
                    <label>City</label>
                    <CitySearchInput
                      value={filters.city}
                      onChange={(city) => updateFilter('city', city)}
                      placeholder="e.g. Bengaluru"
                    />
                  </div>

                  <div className="sidebar-filter-group">
                    <button
                      type="button"
                      className={`filter-pill filter-toggle-pill sidebar-remote-toggle ${isRemoteOnly ? 'is-active' : ''}`}
                      onClick={() => updateFilter('remote', isRemoteOnly ? '' : 'true')}
                    >
                      Remote only
                    </button>
                  </div>
                </div>
              </FilterDropdown>

              <FilterDropdown label="Sort by" summary={sortLabel} active={sort !== 'name'} onClear={() => setSort('name')}>
                <div className="filter-option-list">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      type="button"
                      key={o.value}
                      className={`filter-option ${sort === o.value ? 'is-selected' : ''}`}
                      onClick={() => setSort(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </FilterDropdown>

                <button type="button" className="browse-search-btn" onClick={() => setPage(1)}>
                  <FiSearch size={16} /> Search
                </button>
              </div>
            </div>

            <div className="popular-skills-row">
              <span className="popular-skills-row-label">Popular Skills:</span>
              <div className="popular-skills-row-chips">
                {POPULAR_SKILLS_QUICK.map(({ name, Icon, color }) => (
                  <button
                    type="button"
                    key={name}
                    className={`popular-skill-chip ${filters.skill === name ? 'is-selected' : ''}`}
                    style={{ '--tech-color': color }}
                    onClick={() => updateFilter('skill', filters.skill === name ? '' : name)}
                  >
                    <Icon size={14} /> {name}
                  </button>
                ))}
                <button
                  type="button"
                  className="popular-skill-chip popular-skill-chip-viewall"
                  onClick={() => updateFilter('skill', '')}
                >
                  View All <FiArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ---------- Hero banner (below the search card) ---------- */}
          <section className="browse-hero">
            <div className="browse-hero-decor" aria-hidden="true">
              <span className="browse-hero-particle bhp1" />
              <span className="browse-hero-particle bhp2" />
            </div>
            <div className="browse-hero-inner">
              <div className="browse-hero-content">
                <span className="browse-hero-badge">🚀 Trusted by 800+ companies worldwide</span>
                <h1 className="browse-hero-title">
                  Browse Talented <span className="browse-hero-title-accent">Engineers</span>
                </h1>
                <p className="browse-hero-subtitle">
                  Find, connect, and hire the best engineers for your next big idea.
                </p>

                <div className="browse-hero-chips">
                  <div className="browse-hero-chip">
                    <span className="browse-hero-chip-icon browse-hero-chip-icon--green"><FiCheckCircle size={18} /></span>
                    <span className="browse-hero-chip-copy"><strong>Verified Talent</strong><small>Quality Assured</small></span>
                  </div>
                  <div className="browse-hero-chip">
                    <span className="browse-hero-chip-icon browse-hero-chip-icon--purple"><FiZap size={18} /></span>
                    <span className="browse-hero-chip-copy"><strong>Flexible Hiring</strong><small>On-Demand</small></span>
                  </div>
                  <div className="browse-hero-chip">
                    <span className="browse-hero-chip-icon browse-hero-chip-icon--orange"><FiLockIcon size={18} /></span>
                    <span className="browse-hero-chip-copy"><strong>Secure Payments</strong><small>Safe &amp; Reliable</small></span>
                  </div>
                </div>
              </div>

              <div className="browse-hero-visual" aria-hidden="true">
                <span className="browse-hero-doodle browse-hero-doodle-left">
                  Great<br />Engineers<br />Build<br />Great Products
                </span>
                <div className="browse-hero-avatar">
                  <FiUsers size={40} />
                </div>
                <div className="browse-hero-cta">
                  <FiZap size={16} /> Hire Smarter, Build Faster <FiArrowRight size={16} />
                </div>
                <div className="browse-hero-stat-card">
                  <div className="browse-hero-stat-avatars">
                    <span className="browse-hero-stat-avatar" style={{ background: '#fbbf24' }} />
                    <span className="browse-hero-stat-avatar" style={{ background: '#60a5fa' }} />
                    <span className="browse-hero-stat-avatar" style={{ background: '#34d399' }} />
                    <span className="browse-hero-stat-avatar browse-hero-stat-avatar-more">+</span>
                  </div>
                  <span className="browse-hero-stat-copy"><strong>5000+</strong><small>Skilled Engineers</small></span>
                </div>
              </div>
            </div>
          </section>

          {filters.category && (
            <div className="active-skill-chip">
              Developer Type: <strong>{filters.category}</strong>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, category: '', skill: '' }))}
                aria-label="Clear developer type filter"
              >
                <FiX size={13} />
              </button>
            </div>
          )}

          {/* Results count */}
          <div className="browse-shell">
            <div className="browse-toolbar">
              <div className="browse-toolbar-left">
                <span className="browse-results-count">
                  {loading ? 'Searching…' : `${pagination.total ?? candidates.length} engineer${(pagination.total ?? candidates.length) === 1 ? '' : 's'} found`}
                </span>
                <span className="browse-results-tagline">Real Talent. Real Opportunities.</span>
              </div>

              <div className="browse-view-toggle" role="group" aria-label="Result view">
                <button
                  type="button"
                  className={`browse-view-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <FiGrid size={15} /> Grid View
                </button>
                <button
                  type="button"
                  className={`browse-view-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <FiList size={15} /> List View
                </button>
              </div>
            </div>

            <div className="browse-card-scroll">
              {loading ? (
                <Loader label="Finding engineers…" />
              ) : candidates.length === 0 ? (
                <EmptyState title="No engineers match your filters" description="Try widening your search criteria." />
              ) : (
                <div className={`candidate-grid ${viewMode === 'list' ? 'candidate-grid-list' : ''}`} ref={gridRef}>
                  {candidates.map((c) => (
                    <CandidateCard
                      key={c._id}
                      candidate={c}
                      isCompany={isCompany}
                      bookmarking={bookmarking}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              )}
            </div>

            {!loading && candidates.length > 0 && (
              <div className="browse-pagination-row">
                <div className="browse-trust-strip-inline">
                  {TRUST_STRIP_ITEMS.slice(0, 2).map(({ icon: Icon, tone, title, sub }) => (
                    <div className={`browse-trust-item browse-trust-item--${tone}`} key={title}>
                      <span className="browse-trust-icon"><Icon size={18} /></span>
                      <span className="browse-trust-copy"><strong>{title}</strong><small>{sub}</small></span>
                    </div>
                  ))}
                </div>

                <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />

                <div className="browse-trust-strip-inline">
                  {TRUST_STRIP_ITEMS.slice(2, 4).map(({ icon: Icon, tone, title, sub }) => (
                    <div className={`browse-trust-item browse-trust-item--${tone}`} key={title}>
                      <span className="browse-trust-icon"><Icon size={18} /></span>
                      <span className="browse-trust-copy"><strong>{title}</strong><small>{sub}</small></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}