import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="container section text-center" style={{ padding: 'var(--space-10) 0' }}>
      <h1 style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-3)' }}>404</h1>
      <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/"><Button>Back to Home</Button></Link>
    </div>
  );
}
