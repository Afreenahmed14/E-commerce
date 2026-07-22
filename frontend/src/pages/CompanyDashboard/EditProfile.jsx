import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiUpload } from 'react-icons/fi';
import { companyService } from '../../services/companyService';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import CityAutocomplete from '../../components/common/CityAutocomplete';
import PhoneOtpInput from '../../components/common/PhoneOtpInput';
import SubscriptionModal from '../../components/common/SubscriptionModal';
import { INDUSTRY_OPTIONS } from '../../utils/constants';
import { getCountryOptions, getStateOptions, getCityOptions, findCountryIsoByName, findStateIsoByName } from '../../utils/locationData';

export default function CompanyEditProfile() {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { showError, showSuccess } = useAlert();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [countryIso, setCountryIso] = useState('');
  const [countryOptions, setCountryOptions] = useState([]);
  const [stateIso, setStateIso] = useState('');
  const [stateOptions, setStateOptions] = useState([]);
  const [stateOptionsLoading, setStateOptionsLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

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
    const res = await companyService.getMyProfile();
    setCompany(res.data.company);
    setPhone(res.data.company.phone || '');
    setPhoneVerified(Boolean(res.data.company.phoneVerified));
    const resolvedCountryIso = await findCountryIsoByName(res.data.company.location?.country);
    setCountryIso(resolvedCountryIso);
    setStateIso(await findStateIsoByName(resolvedCountryIso, res.data.company.location?.state));
    reset({
      companyName: res.data.company.companyName,
      website: res.data.company.website,
      industry: res.data.company.industry,
      description: res.data.company.description,
      gstNumber: res.data.company.gstNumber,
      contactPersonName: res.data.company.contactPerson?.name,
      contactPersonDesignation: res.data.company.contactPerson?.designation,
      contactPersonPhone: res.data.company.contactPerson?.phone,
      city: res.data.company.location?.city,
      state: res.data.company.location?.state,
      country: res.data.company.location?.country,
    });
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCountryChange = (e) => {
    const iso = e.target.value;
    setCountryIso(iso);
    setStateIso('');
    const countryName = countryOptions.find((o) => o.value === iso)?.label || '';
    setValue('country', countryName, { shouldDirty: true });
    setValue('state', '', { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
  };

  const handleStateChange = (e) => {
    const iso = e.target.value;
    setStateIso(iso);
    const stateName = stateOptions.find((o) => o.value === iso)?.label || '';
    setValue('state', stateName, { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      await companyService.updateMyProfile({
        companyName: values.companyName,
        website: values.website,
        industry: values.industry,
        description: values.description,
        gstNumber: values.gstNumber,
        contactPerson: {
          name: values.contactPersonName,
          designation: values.contactPersonDesignation,
          phone: values.contactPersonPhone,
        },
        location: { city: values.city, state: values.state, country: values.country },
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await companyService.uploadLogo(file);
      await loadProfile();
    } catch (err) {
      showError(err.response?.data?.message || 'Could not upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) return <Loader label="Loading profile…" />;

  return (
    <div>
      <div className="dashboard-header"><h1>Company Profile</h1></div>

      <Card style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>Logo</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <img
            src={company?.logo || 'https://api.dicebear.com/7.x/initials/svg?seed=' + (company?.companyName || 'C')}
            alt=""
            style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', objectFit: 'cover', background: 'var(--color-surface)' }}
          />
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <FiUpload /> {uploadingLogo ? 'Uploading…' : 'Change Logo'}
            <input type="file" accept="image/*" hidden onChange={handleLogoUpload} disabled={uploadingLogo} />
          </label>
        </div>
      </Card>

      <Card style={{ padding: 'var(--space-5)' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input label="Company Name" register={register('companyName', { required: 'Required' })} error={errors.companyName?.message} />
          <Input label="Website" register={register('website')} placeholder="https://…" />

          <div className="form-field">
            <label className="form-label">Industry</label>
            <select className="form-select" {...register('industry')}>
              <option value="">Select an industry…</option>
              {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={4} {...register('description')} />
          </div>

          <Input label="GST Number" register={register('gstNumber')} />

          <div className="form-grid" style={{ marginBottom: 'var(--space-4)' }}>
            <Input label="Contact Person Name" register={register('contactPersonName')} />
            <Input label="Designation" register={register('contactPersonDesignation')} />
          </div>
          <Input label="Contact Phone" register={register('contactPersonPhone')} />

          <PhoneOtpInput
            label="Company Phone Number"
            value={phone}
            onChange={setPhone}
            verified={phoneVerified}
            onVerified={() => setPhoneVerified(true)}
          />

          <div className="location-fields">
            <div className="form-field">
              <label className="form-label">Country</label>
              <select className="form-select" value={countryIso} onChange={handleCountryChange}>
                <option value="">Select a country…</option>
                {countryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {countryIso && stateOptionsLoading && (
              <div className="form-field">
                <label className="form-label">State</label>
                <div className="form-select-loading text-muted">Loading states…</div>
              </div>
            )}

            {countryIso && !stateOptionsLoading && stateOptions.length > 0 && (
              <div className="form-field">
                <label className="form-label">State</label>
                <select className="form-select" value={stateIso} onChange={handleStateChange}>
                  <option value="">Select a state…</option>
                  {stateOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {countryIso && !stateOptionsLoading && (stateOptions.length === 0 || stateIso) && (
              <div className="form-field">
                <label className="form-label">City</label>
                <CityAutocomplete
                  options={cityOptions}
                  value={watch('city')}
                  onChange={(city) => setValue('city', city, { shouldDirty: true })}
                />
              </div>
            )}
          </div>

          <Button type="submit" loading={saving} disabled={!isDirty}>Save Changes</Button>
        </form>
      </Card>
      <SubscriptionModal open={subscriptionModalOpen} onClose={() => setSubscriptionModalOpen(false)} />
    </div>
  );
}
