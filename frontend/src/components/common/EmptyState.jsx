import './EmptyState.css';

export default function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p className="text-muted">{description}</p>}
      {action}
    </div>
  );
}
