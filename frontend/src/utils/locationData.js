// country-state-city bundles a full worldwide country/city dataset (several
// MB). It's only needed on the two profile-edit forms, so it's loaded lazily
// via dynamic import — keeping it out of the main app bundle that every
// visitor downloads on first load.
let modPromise = null;
const loadMod = () => {
  if (!modPromise) modPromise = import('country-state-city');
  return modPromise;
};

/** All countries as { value: isoCode, label: name } for a <select>. */
export const getCountryOptions = async () => {
  const { Country } = await loadMod();
  return Country.getAllCountries().map((c) => ({ value: c.isoCode, label: c.name }));
};

/**
 * All states/provinces for a given country ISO code, as
 * { value: stateIsoCode, label: name }. Resolves to an empty list for
 * countries the dataset doesn't subdivide (city selection then falls back
 * to the whole country instead of a state).
 */
export const getStateOptions = async (countryIsoCode) => {
  if (!countryIsoCode) return [];
  const { State } = await loadMod();
  return State.getStatesOfCountry(countryIsoCode).map((s) => ({ value: s.isoCode, label: s.name }));
};

/**
 * Cities for a given country (and, where available, state) ISO code, as
 * { value: name, label: name }. Falls back to every city in the country
 * when no state is given/available, so countries without state-level data
 * still get a usable city list.
 */
export const getCityOptions = async (countryIsoCode, stateIsoCode) => {
  if (!countryIsoCode) return [];
  const { City } = await loadMod();
  const cities = stateIsoCode
    ? City.getCitiesOfState(countryIsoCode, stateIsoCode)
    : City.getCitiesOfCountry(countryIsoCode);
  return (cities || []).map((c) => ({ value: c.name, label: c.name }));
};

/** Looks up a state's ISO code from its stored display name (for editing existing profiles). */
export const findStateIsoByName = async (countryIsoCode, name) => {
  if (!countryIsoCode || !name) return '';
  const { State } = await loadMod();
  const match = State.getStatesOfCountry(countryIsoCode).find((s) => s.name === name);
  return match?.isoCode || '';
};

/** Looks up a country's ISO code from its stored display name (for editing existing profiles). */
export const findCountryIsoByName = async (name) => {
  if (!name) return '';
  const { Country } = await loadMod();
  const match = Country.getAllCountries().find((c) => c.name === name);
  return match?.isoCode || '';
};

// The worldwide city list (~150k entries) is only ever needed for the
// "search by city" typeahead on the Browse Engineers page, so it's built
// lazily on first use and cached — every keystroke after that just filters
// the already-resolved in-memory array instead of re-loading anything.
let allCitiesPromise = null;
const loadAllCities = () => {
  if (!allCitiesPromise) {
    allCitiesPromise = loadMod().then(({ City, Country }) => {
      const countryNameByIso = new Map(Country.getAllCountries().map((c) => [c.isoCode, c.name]));
      return City.getAllCities().map((c) => ({
        city: c.name,
        country: countryNameByIso.get(c.countryCode) || c.countryCode,
      }));
    });
  }
  return allCitiesPromise;
};

/** Kicks off (and caches) the worldwide city load without waiting on it — call on mount so it's ready before the first keystroke needs it. */
export const preloadCities = () => { loadAllCities(); };

/**
 * Searches the full worldwide city list for a typeahead. Matches cities
 * whose name starts with the query first, then falls back to "contains",
 * de-duplicates same city/country pairs, and caps the result count so the
 * dropdown stays short and fast to render.
 */
export const searchCities = async (query, limit = 8) => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const cities = await loadAllCities();

  const seen = new Set();
  const starts = [];
  const contains = [];
  for (const entry of cities) {
    const name = entry.city.toLowerCase();
    const key = `${entry.city}|${entry.country}`;
    if (seen.has(key)) continue;
    if (name.startsWith(q)) {
      seen.add(key);
      starts.push(entry);
    } else if (name.includes(q)) {
      seen.add(key);
      contains.push(entry);
    }
    if (starts.length >= limit) break;
  }

  return [...starts, ...contains].slice(0, limit);
};
