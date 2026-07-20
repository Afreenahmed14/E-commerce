import './Card.css';

export default function Card({ children, className = '', hoverable = false, ...rest }) {
  return (
    <div className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
