// src/components/ui/NotificationItem.tsx
import React from 'react';
import type { Notification } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  const { strings, language } = useLanguage();
  const locale = language === 'es' ? es : enUS;

  const getMessage = () => {
    const typeStrings = strings.notifications.types;
    const { data } = notification;

    switch (notification.type) {
      case 'booking_request':
        return typeStrings.booking_request(data?.userName || 'Usuario');
      case 'booking_approved':
        return typeStrings.booking_approved;
      case 'booking_cancelled':
        return typeStrings.booking_cancelled;
      case 'new_expense':
        return typeStrings.new_expense(data?.userName || 'Nuevo Gasto');
      case 'added_to_property':
        return typeStrings.added_to_property(data?.propertyName || 'Propiedad');
      default:
        return 'Notificación';
    }
  };

  const getTimeAgo = () => {
    if (!notification.createdAt) return '';
    const date = notification.createdAt.toDate();
    return formatDistanceToNow(date, { addSuffix: true, locale });
  };

  return (
    <div
      className={`p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
      onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
    >
      <div className="flex justify-between items-start gap-2">
        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
          {getMessage()}
        </p>
        {!notification.isRead && (
          <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1 uppercase font-medium tracking-wider">
        {getTimeAgo()}
      </p>
    </div>
  );
};

export default NotificationItem;
