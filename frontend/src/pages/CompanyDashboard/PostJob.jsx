import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { jobService } from '../../services/jobService';
import { taxonomyService } from '../../services/taxonomyService';
import { useAlert } from '../../context/AlertContext';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import LocationFields from '../../components/common/LocationFields';
import './PostJob.css';

const JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];

const PAY_TYPES = [
  { value: 'yearly', label: 'Yearly (₹/year)' },
  { value: 'monthly', label: 'Monthly (₹/month)' },
  { value: 'weekly', label: 'Weekly (₹/week)' },
  { value: 'hourly', label: 'Hourly (₹/hour)' },
];

export default function PostJob() {
  const { id } = useParams(); // present when editing an existing job
  const isEditing = !!id;
  const navigate = useNavigate();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: { payType: 'yearly' } });
  const payType = watch('payType');
  const payTypeLabel = PAY_TYPES.find((p) => p.value === payType)?.label.match(/\(([^)]+)\)/)?.[1] || '₹/year';
  const [developerTypes, setDeveloperTypes] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState({ city: '', state: '', country: '' });
  const [locationTouched, setLocationTouched] = useState(false);
  const { showError, showSuccess } = useAlert();

  useEffect(() => {
    taxonomyService.getDeveloperTypes().then((res) => setDeveloperTypes(res.data.developerTypes)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    jobService.getById(id).then((res) => {
      const job = res.data.job;
      reset({
        title: job.title,
        description: job.description,
        jobType: job.jobType,
        developerType: job.developerType,
        skills: (job.skills || []).join(', '),
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        payType: job.payType || 'yearly',
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        remote: job.location?.remote,
        openings: job.openings,
      });
      setLocation({ city: job.location?.city || '', state: job.location?.state || '', country: job.location?.country || '' });
    }).finally(() => setLoading(false));
  }, [id, isEditing, reset]);

  const onSubmit = async (data) => {
    if (!location.country || !location.city) {
      setLocationTouched(true);
      showError('Please select a country and city for this job.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        jobType: data.jobType,
        developerType: data.developerType,
        skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        experienceMin: data.experienceMin ? Number(data.experienceMin) : 0,
        experienceMax: data.experienceMax ? Number(data.experienceMax) : null,
        payType: data.payType || 'yearly',
        salaryMin: data.salaryMin ? Number(data.salaryMin) : null,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : null,
        location: { ...location, remote: !!data.remote },
        openings: data.openings ? Number(data.openings) : 1,
      };

      if (isEditing) {
        await jobService.update(id, payload);
      } else {
        await jobService.create(payload);
      }
      showSuccess(isEditing ? 'Job posting updated.' : 'Job posted successfully.');
      navigate('/company/dashboard/jobs');
    } catch (err) {
      showError(err.response?.data?.message || 'Could not save this job posting.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading job…" />;

  return (
    <div className="post-job-page">
      <div className="post-job-hero">
        <span className="post-job-eyebrow">{isEditing ? 'Edit posting' : 'New job posting'}</span>
        <h1>{isEditing ? 'Edit Job Posting' : 'Post a New Job'}</h1>
        <p className="text-muted">
          {isEditing
            ? 'Update the details below — candidates will see your changes right away.'
            : 'Fill in the details below to get this role in front of qualified candidates.'}
        </p>
      </div>

      <Card className="post-job-card">
        <form onSubmit={handleSubmit(onSubmit)} className="post-job-form">
          <section className="post-job-section">
            <h2 className="post-job-section-title">Role basics</h2>
            <Input
              label="Job title"
              register={register('title', { required: 'Title is required', maxLength: 150 })}
              error={errors.title?.message}
              placeholder="e.g. Senior Frontend Engineer"
            />

            <div className="form-field">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea
                id="description"
                rows={8}
                className="form-input"
                placeholder="Describe the role, responsibilities, and what makes this opportunity a great fit…"
                {...register('description', { required: 'Description is required' })}
              />
              {errors.description && <span className="form-error">{errors.description.message}</span>}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="jobType">Job type</label>
                <select id="jobType" className="form-input form-select" {...register('jobType')}>
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="developerType">Developer type</label>
                <select id="developerType" className="form-input form-select" {...register('developerType')}>
                  <option value="">Select…</option>
                  {developerTypes.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <Input label="Skills (comma-separated)" register={register('skills')} placeholder="React, Node.js, MongoDB" />

            <div className="form-grid">
              <Input label="Min experience (years)" type="number" register={register('experienceMin')} />
              <Input label="Max experience (years)" type="number" register={register('experienceMax')} />
            </div>
          </section>

          <section className="post-job-section">
            <h2 className="post-job-section-title">Compensation</h2>
            <div className="form-field">
              <label className="form-label" htmlFor="payType">Pay basis</label>
              <select id="payType" className="form-input form-select" {...register('payType')}>
                {PAY_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="form-grid">
              <Input label={`Min pay (${payTypeLabel})`} type="number" register={register('salaryMin')} />
              <Input label={`Max pay (${payTypeLabel})`} type="number" register={register('salaryMax')} />
            </div>
          </section>

          <section className="post-job-section">
            <h2 className="post-job-section-title">Location</h2>
            <LocationFields
              value={location}
              onChange={setLocation}
              required
              touched={locationTouched}
              onTouched={() => setLocationTouched(true)}
            />

            <label className="post-job-checkbox">
              <input type="checkbox" {...register('remote')} /> Remote friendly
            </label>
          </section>

          <section className="post-job-section">
            <h2 className="post-job-section-title">Openings</h2>
            <Input label="Number of openings" type="number" register={register('openings', { min: 1 })} defaultValue={1} />
          </section>

          <div className="post-job-submit-bar">
            <Button type="submit" loading={saving} fullWidth>
              {isEditing ? 'Save Changes' : 'Post Job'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
