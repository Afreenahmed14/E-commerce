import './Loader.css';

export default function Loader({ label = 'Loading…', fullPage = false }) {
  return (
    <div className={fullPage ? 'loader-fullpage' : 'loader-inline'}>
      <span className="loader-spinner" aria-hidden="true" />
      <span className="text-muted">{label}</span>
    </div>
  );
}
