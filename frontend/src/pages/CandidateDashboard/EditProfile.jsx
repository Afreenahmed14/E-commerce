import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiUpload, FiFileText, FiCamera } from 'react-icons/fi';
import { candidateService } from '../../services/candidateService';
import { taxonomyService } from '../../services/taxonomyService';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import MultiSelectDropdown from '../../components/common/MultiSelectDropdown';
import PhotoCapture from '../../components/common/PhotoCapture';
import CityAutocomplete from '../../components/common/CityAutocomplete';
import SubscriptionModal from '../../components/common/SubscriptionModal';
import { AVAILABILITY_OPTIONS, LANGUAGE_OPTIONS, DEVELOPER_TYPE_OPTIONS } from '../../utils/constants';
import { getCountryOptions, getStateOptions, getCityOptions, findCountryIsoByName, findStateIsoByName } from '../../utils/locationData';
import { asDownloadUrl } from '../../utils/fileUrl';

const toCsv = (arr) => (arr || []).join(', ');
const fromCsv = (str) => (str || '').split(',').map((s) => s.trim()).filter(Boolean);

export default function CandidateEditProfile() {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showError, showSuccess } = useAlert();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [skillOptions, setSkillOptions] = useState([]);
  const [developerTypeOptions, setDeveloperTypeOptions] = useState(DEVELOPER_TYPE_OPTIONS);
  const [primarySkills, setPrimarySkills] = useState([]);
  const [secondarySkills, setSecondarySkills] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [countryIso, setCountryIso] = useState('');
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateIso, setStateIso] = useState('');
  const [stateOptions, setStateOptions] = useState([]);
  const [stateOptionsLoading, setStateOptionsLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [touchedLocation, setTouchedLocation] = useState(false);

  useEffect(() => {
    getCountryOptions().then(setCountryOptions);
  }, []);

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

  const loadProfile = async () => {
    const [profileRes, skillsRes, devTypesRes] = await Promise.all([
      candidateService.getMyProfile(),
      taxonomyService.getSkills().catch(() => ({ data: { skills: [] } })),
      taxonomyService.getDeveloperTypes().catch(() => null),
    ]);
    const c = profileRes.data.candidate;
    setCandidate(c);
    setSkillOptions(skillsRes.data.skills.map((s) => s.name));
    if (devTypesRes) setDeveloperTypeOptions(devTypesRes.data.developerTypes.map((d) => d.name));
    setPrimarySkills(c.primarySkills || []);
    setSecondarySkills(c.secondarySkills || []);
    setLanguages(c.languages || []);
    const resolvedCountryIso = await findCountryIsoByName(c.location?.country);
    setCountryIso(resolvedCountryIso);
    setStateIso(await findStateIsoByName(resolvedCountryIso, c.location?.state));

    reset({
      name: c.name,
      headline: c.headline,
      about: c.about,
      experience: c.experience,
      experienceMonths: c.experienceMonths ?? 0,
      hourlyRate: c.hourlyRate,
      availability: c.availability,
      developerType: c.developerType || '',
      portfolioLinks: toCsv(c.portfolioLinks),
      github: c.github,
      linkedin: c.linkedin,
      visibility: c.visibility,
      city: c.location?.city || '',
      state: c.location?.state || '',
      country: c.location?.country || '',
      remote: c.location?.remote,
    });
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Whenever the country changes, the previously-selected state/city are
  // very likely no longer valid for it — clear both so the person re-picks
  // from the new country's lists rather than silently keeping mismatched
  // values.
  const handleCountryChange = (e) => {
    const iso = e.target.value;
    setCountryIso(iso);
    setStateIso('');
    const countryName = countryOptions.find((o) => o.value === iso)?.label || '';
    setValue('country', countryName, { shouldDirty: true });
    setValue('state', '', { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
    setTouchedLocation(true);
  };

  // Same idea one level down: a new state invalidates whichever city was
  // picked under the old one.
  const handleStateChange = (e) => {
    const iso = e.target.value;
    setStateIso(iso);
    const stateName = stateOptions.find((o) => o.value === iso)?.label || '';
    setValue('state', stateName, { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
    setTouchedLocation(true);
  };

  const skillsError = primarySkills.length === 0 ? 'Pick at least one primary skill' : '';
  const secondarySkillsError = secondarySkills.length === 0 ? 'Pick at least one secondary skill' : '';
  const languagesError = languages.length === 0 ? 'Pick at least one language' : '';
  const cityValue = watch('city');
  const stateValue = watch('state');
  const countryValue = watch('country');

  const onSubmit = async (values) => {
    setTouchedLocation(true);

    const stateMissing = stateOptions.length > 0 && !stateValue;
    if (primarySkills.length === 0 || secondarySkills.length === 0 || languages.length === 0 || !countryValue || stateMissing || !cityValue) {
      showError('Please fill in every field, including skills, languages, city, and country, before saving.');
      return;
    }
    if (!candidate?.profileImage) {
      showError('Please add a profile photo (upload or take one) before saving.');
      return;
    }
    if (!candidate?.resume) {
      showError('Please upload your resume before saving.');
      return;
    }

    setSaving(true);
    try {
      await candidateService.updateMyProfile({
        name: values.name,
        headline: values.headline,
        about: values.about,
        experience: Number(values.experience) || 0,
        experienceMonths: Math.min(11, Math.max(0, Number(values.experienceMonths) || 0)),
        hourlyRate: Number(values.hourlyRate) || 0,
        availability: values.availability,
        developerType: values.developerType,
        primarySkills,
        secondarySkills,
        languages,
        portfolioLinks: fromCsv(values.portfolioLinks),
        github: values.github,
        linkedin: values.linkedin,
        visibility: values.visibility,
        location: {
          city: values.city,
          state: values.state,
          country: values.country,
          remote: Boolean(values.remote),
        },
      });
      showSuccess('Profile updated successfully.');
      await loadProfile();
    } catch (err) {
      if (err.response?.status === 402) {
        showError(err.response?.data?.message || 'Free plan edit limit reached. Upgrade to keep editing.');
        setSubscriptionModalOpen(true);
      } else {
        showError(err.response?.data?.message || 'Could not save profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingResume(true);
    try {
      await candidateService.uploadResume(file);
      await loadProfile();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not upload resume.');
    } finally {
      setUploadingResume(false);
    }
  };

  const uploadPhotoFile = async (file) => {
    setUploadingImage(true);
    try {
      await candidateService.uploadImage(file);
      await loadProfile();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not upload photo.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadPhotoFile(file);
  };

  if (loading) return <Loader label="Loading profile…" />;

  return (
    <div>
      <div className="dashboard-header">
        <h1>My Profile</h1>
      </div>

      <p className="text-muted" style={{ marginBottom: 'var(--space-4)' }}>
        Every field on this page is required — a complete profile is shown higher in search and gets more hires.
      </p>

      <Card style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Photo &amp; Resume</h3>
        <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <img
              src={candidate?.profileImage || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
              alt=""
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: 'var(--color-surface)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                <FiUpload /> {uploadingImage ? 'Uploading…' : 'Change Photo'}
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={() => setCameraOpen(true)} disabled={uploadingImage}>
                <FiCamera /> Take Photo
              </Button>
            </div>
            {!candidate?.profileImage && <span className="form-error">Required</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {candidate?.resume ? (
              <a
                href={asDownloadUrl(candidate.resume, `${candidate.name || 'my'}-resume.pdf`)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                <FiFileText /> View Resume
              </a>
            ) : (
              <span className="text-muted">No resume uploaded</span>
            )}
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <FiUpload /> {uploadingResume ? 'Uploading…' : 'Upload Resume'}
              <input type="file" accept=".pdf" hidden onChange={handleResumeUpload} disabled={uploadingResume} />
            </label>
            {!candidate?.resume && <span className="form-error">Required</span>}
          </div>
        </div>
      </Card>

      <PhotoCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={uploadPhotoFile} />

      <Card style={{ padding: 'var(--space-5)' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Name *"
            register={register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
            error={errors.name?.message}
            placeholder="e.g. Priya Sharma"
          />

          <Input
            label="Headline *"
            register={register('headline', { required: 'Headline is required' })}
            error={errors.headline?.message}
            placeholder="e.g. Full-Stack MERN Developer"
          />

          <div className="form-field">
            <label className="form-label">About *</label>
            <textarea
              className={`form-textarea ${errors.about ? 'form-input-error' : ''}`}
              rows={4}
              {...register('about', { required: 'About is required' })}
            />
            {errors.about && <span className="form-error">{errors.about.message}</span>}
          </div>

          <div className="form-grid">
            <Input
              label="your charge per hour (₹) "
              type="number"
              register={register('hourlyRate', { required: 'your charges per hour is required', min: { value: 1, message: 'Must be greater than 0' } })}
              error={errors.hourlyRate?.message}
            />
            <Input
              label="Experience (years) *"
              type="number"
              register={register('experience', { required: 'Experience is required', min: 0 })}
              error={errors.experience?.message}
            />
            <Input
              label="Experience (months)"
              type="number"
              min={0}
              max={11}
              register={register('experienceMonths', { min: 0, max: 11 })}
              error={errors.experienceMonths?.message}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Availability *</label>
            <select className="form-select" {...register('availability', { required: true })}>
              {AVAILABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Developer Type *</label>
            <select className="form-select" {...register('developerType', { required: 'Please select a developer type' })}>
              <option value="">Select a developer type…</option>
              {developerTypeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            {errors.developerType && <span className="form-error">{errors.developerType.message}</span>}
          </div>

          <MultiSelectDropdown
            label="Primary Skills"
            required
            options={skillOptions}
            value={primarySkills}
            onChange={setPrimarySkills}
            placeholder="Search skills, or type to add your own…"
            error={skillsError}
            emptyMessage="No skills match — type to add your own"
            allowCustom
          />

          <MultiSelectDropdown
            label="Secondary Skills"
            required
            options={skillOptions}
            value={secondarySkills}
            onChange={setSecondarySkills}
            placeholder="Search skills, or type to add your own…"
            error={secondarySkillsError}
            emptyMessage="No skills match — type to add your own"
            allowCustom
          />

          <MultiSelectDropdown
            label="Speaking Languages"
            required
            options={LANGUAGE_OPTIONS}
            value={languages}
            onChange={setLanguages}
            placeholder="Search languages…"
            error={languagesError}
          />

          <Input
            label="Portfolio Links (comma-separated) *"
            register={register('portfolioLinks', { required: 'At least one portfolio link is required' })}
            error={errors.portfolioLinks?.message}
          />
          <Input
            label="GitHub URL *"
            register={register('github', { required: 'GitHub URL is required' })}
            error={errors.github?.message}
          />
          <Input
            label="LinkedIn URL *"
            register={register('linkedin', { required: 'LinkedIn URL is required' })}
            error={errors.linkedin?.message}
          />

          <div className="location-fields">
            <div className="form-field">
              <label className="form-label">Country *</label>
              <select className="form-select" value={countryIso} onChange={handleCountryChange}>
                <option value="">Select a country…</option>
                {countryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!countryValue && touchedLocation && <span className="form-error">Country is required</span>}
            </div>

            {countryIso && stateOptionsLoading && (
              <div className="form-field">
                <label className="form-label">State *</label>
                <div className="form-select-loading text-muted">Loading states…</div>
              </div>
            )}

            {countryIso && !stateOptionsLoading && stateOptions.length > 0 && (
              <div className="form-field">
                <label className="form-label">State *</label>
                <select className="form-select" value={stateIso} onChange={handleStateChange}>
                  <option value="">Select a state…</option>
                  {stateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {!stateValue && touchedLocation && <span className="form-error">State is required</span>}
              </div>
            )}

            {countryIso && !stateOptionsLoading && (stateOptions.length === 0 || stateIso) && (
              <div className="form-field">
                <label className="form-label">City *</label>
                <CityAutocomplete
                  options={cityOptions}
                  value={cityValue}
                  onChange={(city) => setValue('city', city, { shouldDirty: true })}
                  onBlur={() => setTouchedLocation(true)}
                  error={!cityValue && touchedLocation}
                />
                {!cityValue && touchedLocation && <span className="form-error">City is required</span>}
              </div>
            )}
          </div>
          {!countryIso && touchedLocation && (
            <p className="text-muted location-hint">Select a country to choose a state and city.</p>
          )}

          <div className="form-field">
            <label className="form-label">
              <input type="checkbox" {...register('remote')} /> Available for remote work
            </label>
          </div>

          <div className="form-field">
            <label className="form-label">Profile Visibility *</label>
            <select className="form-select" {...register('visibility', { required: true })}>
              <option value="public">Public — visible in search</option>
              <option value="private">Private — hidden from search</option>
            </select>
          </div>

          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      </Card>
      <SubscriptionModal open={subscriptionModalOpen} onClose={() => setSubscriptionModalOpen(false)} />
    </div>
  );
}
