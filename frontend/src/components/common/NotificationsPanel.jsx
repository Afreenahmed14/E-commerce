import { FiBell, FiCheck, FiTrash2 } from 'react-icons/fi';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationService } from '../../services/notificationService';
import Card from './Card';
import Button from './Button';
import EmptyState from './EmptyState';
import { formatRelativeTime } from '../../utils/formatters';
import './NotificationsPanel.css';

/**
 * Full notifications list for a dashboard's "Notifications" tab.
 * Reads live unread state from NotificationContext but fetches its own
 * fuller list (the navbar bell only keeps the latest 10 in context).
 */
export default function NotificationsPanel() {
  const { notifications, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();

  const handleDelete = async (id) => {
    await notificationService.remove(id);
    fetchNotifications();
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1>Notifications</h1>
        {notifications.length > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllAsRead}>Mark all as read</Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="You'll see updates about unlocks, reviews, and account changes here."
        />
      ) : (
        <div className="notification-list">
          {notifications.map((n) => (
            <Card key={n._id} className={`notification-item ${n.isRead ? '' : 'notification-unread'}`}>
              <div className="notification-icon"><FiBell /></div>
              <div className="notification-body">
                <p className="notification-title">{n.title}</p>
                <p className="text-muted">{n.message}</p>
                <span className="text-muted notification-time">{formatRelativeTime(n.createdAt)}</span>
              </div>
              <div className="notification-actions">
                {!n.isRead && (
                  <button aria-label="Mark as read" onClick={() => markAsRead(n._id)}><FiCheck /></button>
                )}
                <button aria-label="Delete" onClick={() => handleDelete(n._id)}><FiTrash2 /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
