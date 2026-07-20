import { useEffect, useState } from 'react';
import CityAutocomplete from './CityAutocomplete';
import { getCountryOptions, getStateOptions, getCityOptions, findCountryIsoByName, findStateIsoByName } from '../../utils/locationData';

/**
 * Shared Country → State → City cascading dropdown group.
 *
 * Wraps the country-state-city dataset lookups used across the app's
 * profile-edit and job-posting forms so every "where is this based" field
 * behaves the same way: pick a country, its states load, pick a state (if
 * the country has any), then its cities load into an autocomplete.
 *
 * Controlled from outside via `value` ({ city, state, country }) and
 * `onChange` (receives the same shape). `required` controls whether the
 * asterisk/inline validation messages are shown.
 */
export default function LocationFields({ value, onChange, required = false, touched = false, onTouched }) {
  const { city = '', state = '', country = '' } = value || {};

  const [countryIso, setCountryIso] = useState('');
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateIso, setStateIso] = useState('');
  const [stateOptions, setStateOptions] = useState([]);
  const [stateOptionsLoading, setStateOptionsLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    getCountryOptions().then(setCountryOptions);
  }, []);

  // Resolve the stored display names (e.g. "India") back to ISO codes once,
  // so editing a job/profile that already has a location pre-selects the
  // right dropdown options instead of showing them blank.
  useEffect(() => {
    if (resolved || countryOptions.length === 0) return;
    (async () => {
      const iso = await findCountryIsoByName(country);
      setCountryIso(iso);
      if (iso && state) setStateIso(await findStateIsoByName(iso, state));
      setResolved(true);
    })();
  }, [countryOptions, country, state, resolved]);

  useEffect(() => {
    if (!countryIso) {
      setStateOptions([]);
      return;
    }
    setStateOptionsLoading(true);
    getStateOptions(countryIso).then((opts) => {
      setStateOptions(opts);
      setStateOptionsLoading(false);
    });
  }, [countryIso]);

  useEffect(() => {
    getCityOptions(countryIso, stateIso).then(setCityOptions);
  }, [countryIso, stateIso]);

  const handleCountryChange = (e) => {
    const iso = e.target.value;
    setCountryIso(iso);
    setStateIso('');
    const countryName = countryOptions.find((o) => o.value === iso)?.label || '';
    onChange({ city: '', state: '', country: countryName });
  };

  const handleStateChange = (e) => {
    const iso = e.target.value;
    setStateIso(iso);
    const stateName = stateOptions.find((o) => o.value === iso)?.label || '';
    onChange({ city: '', state: stateName, country });
  };

  const handleCityChange = (cityName) => {
    onChange({ city: cityName, state, country });
  };

  const mark = required ? ' *' : '';

  return (
    <div className="location-fields">
      <div className="form-field">
        <label className="form-label">Country{mark}</label>
        <select className="form-select" value={countryIso} onChange={handleCountryChange}>
          <option value="">Select a country…</option>
          {countryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {required && !country && touched && <span className="form-error">Country is required</span>}
      </div>

      {countryIso && stateOptionsLoading && (
        <div className="form-field">
          <label className="form-label">State{mark}</label>
          <div className="form-select-loading text-muted">Loading states…</div>
        </div>
      )}

      {countryIso && !stateOptionsLoading && stateOptions.length > 0 && (
        <div className="form-field">
          <label className="form-label">State{mark}</label>
          <select className="form-select" value={stateIso} onChange={handleStateChange}>
            <option value="">Select a state…</option>
            {stateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {required && !state && touched && <span className="form-error">State is required</span>}
        </div>
      )}

      {countryIso && !stateOptionsLoading && (stateOptions.length === 0 || stateIso) && (
        <div className="form-field">
          <label className="form-label">City{mark}</label>
          <CityAutocomplete
            options={cityOptions}
            value={city}
            onChange={handleCityChange}
            onBlur={() => onTouched?.()}
            error={required && !city && touched}
          />
          {required && !city && touched && <span className="form-error">City is required</span>}
        </div>
      )}

      {!countryIso && touched && (
        <p className="text-muted location-hint">Select a country to choose a state and city.</p>
      )}
    </div>
  );
}
