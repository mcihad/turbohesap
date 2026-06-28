import type { AxiosInstance } from 'axios'

import type {
  NotificationDto,
  NotificationListQuery,
  UnreadCountDto,
} from './notification.dto'
import type { INotificationsService } from './notifications.service'

const base = '/contacts/notifications'

export class NotificationsApiClient implements INotificationsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: NotificationListQuery): Promise<NotificationDto[]> {
    return (await this.http.get<NotificationDto[]>(base, { params: query })).data
  }
  async unreadCount(): Promise<UnreadCountDto> {
    return (await this.http.get<UnreadCountDto>(`${base}/unread-count`)).data
  }
  async markRead(id: string): Promise<NotificationDto> {
    return (await this.http.patch<NotificationDto>(`${base}/${id}/read`, {})).data
  }
  async markAllRead(): Promise<void> {
    await this.http.post(`${base}/read-all`, {})
  }
}
