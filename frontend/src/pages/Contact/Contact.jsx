import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import './Contact.css';

export default function Contact() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [submitted, setSubmitted] = useState(false);

  // Note: no backend endpoint is specified for contact-form submissions in
  // scope. This captures the form client-side and can be wired to a
  // `/api/v1/contact` route or email service later without changing the UI.
  const onSubmit = () => {
    setSubmitted(true);
    reset();
  };

  return (
    <div className="container section contact-page">
      <div className="contact-grid">
        <div>
          <h1>Get in Touch</h1>
          <p className="text-muted">
            Questions about HourlyRecruit, partnerships, or need help with your
            account? Send us a message and our team will get back to you.
          </p>
          <div className="contact-info">
            <p><strong>Email:</strong> support@hourlyrecruit.com</p>
            <p><strong>Hours:</strong> Mon–Fri, 9am–6pm IST</p>
          </div>
        </div>

        <Card className="contact-form-card">
          {submitted ? (
            <div className="contact-success">
              <h3>Message sent!</h3>
              <p className="text-muted">We'll get back to you within 1–2 business days.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Name"
                error={errors.name?.message}
                register={register('name', { required: 'Name is required' })}
              />
              <Input
                label="Email"
                type="email"
                error={errors.email?.message}
                register={register('email', { required: 'Email is required' })}
              />
              <div className="form-field">
                <label className="form-label" htmlFor="message">Message</label>
                <textarea
                  id="message"
                  className="form-textarea"
                  rows={5}
                  {...register('message', { required: 'Message is required' })}
                />
                {errors.message && <span className="form-error">{errors.message.message}</span>}
              </div>
              <Button type="submit" fullWidth>Send Message</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
