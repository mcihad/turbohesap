import type {
  NotificationDto,
  NotificationListQuery,
  UnreadCountDto,
} from './notification.dto'

export interface INotificationsService {
  list(query?: NotificationListQuery): Promise<NotificationDto[]>
  unreadCount(): Promise<UnreadCountDto>
  markRead(id: string): Promise<NotificationDto>
  markAllRead(): Promise<void>
}
