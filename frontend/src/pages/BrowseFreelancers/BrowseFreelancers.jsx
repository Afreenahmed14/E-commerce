import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiX } from 'react-icons/fi';
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
      .catch(() => {});
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
        limit: 12,
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
      <div className="container section browse-page-inner">
      <h1>Browse Engineers</h1>
      <p className="text-muted browse-subtitle">
        Find skilled engineers by filtering expertise, hourly rate, availability, and location. Browse verified profiles and hire the right talent with confidence.
      </p>

      {/* Row 1: main search bar + Developer Type, outside the results panel */}
      <div className="browse-quickbar">
        <div className="filter-search-inline browse-main-search">
          <FiSearch />
          <input
            placeholder="Search by skill, headline, or keyword…"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
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
      </div>

      {/* Everything below — name search, filters, sort, results, cards —
          lives inside one unified panel so it reads as a single surface. */}
      <div className="browse-panel">
      <div className="browse-filterbar">
        <div className="filter-search-inline browse-name-search">
          <FiSearch />
          <input
            placeholder="Search by name…"
            value={filters.name}
            onChange={(e) => updateFilter('name', e.target.value)}
          />
        </div>

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
        </div>
      </div>

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
          <span className="browse-results-count">
            {loading ? 'Searching…' : `${pagination.total ?? candidates.length} engineer${(pagination.total ?? candidates.length) === 1 ? '' : 's'} found`}
          </span>
        </div>

        <div className="browse-card-scroll">
          {loading ? (
            <Loader label="Finding engineers…" />
          ) : candidates.length === 0 ? (
            <EmptyState title="No engineers match your filters" description="Try widening your search criteria." />
          ) : (
            <div className="candidate-grid" ref={gridRef}>
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
          <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
