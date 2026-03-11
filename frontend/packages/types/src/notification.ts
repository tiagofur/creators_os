export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  actionUrl?: string
  createdAt: string
}
