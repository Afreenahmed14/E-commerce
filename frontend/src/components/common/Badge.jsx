import './Badge.css';

export default function Badge({ children, variant = 'default', ...rest }) {
  return <span className={`badge badge-${variant}`} {...rest}>{children}</span>;
}
