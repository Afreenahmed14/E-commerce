import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { notificationService } from '../services/notificationService';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext(null);

/**
 * Holds unread notification count + list for the bell icon in the navbar.
 * Polls periodically rather than using websockets, keeping V1 infra simple.
 */
export function NotificationProvider({ children }) {
  const { isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getMy({ limit: 10 });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silently ignore — notifications are non-critical to core flows.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    if (!isAuthenticated) return undefined;
    const interval = setInterval(fetchNotifications, 60000); // poll every 60s
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  const markAsRead = async (id) => {
    await notificationService.markAsRead(id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
