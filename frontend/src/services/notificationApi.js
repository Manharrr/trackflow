import axiosInstance from '../api/axios';

/**
 * Fetch all notifications for the current authenticated user.
 * Returns count, unread_count, and results list.
 */
export const getNotifications = async () => {
  const response = await axiosInstance.get('/notifications/');
  return response.data;
};

/**
 * Mark a single notification as read by ID.
 */
export const markNotificationAsRead = async (id) => {
  const response = await axiosInstance.patch(`/notifications/${id}/read/`);
  return response.data;
};

/**
 * Mark all unread notifications of the current user as read.
 */
export const markAllNotificationsAsRead = async () => {
  const response = await axiosInstance.patch('/notifications/read-all/');
  return response.data;
};
