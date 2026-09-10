import axiosInstance from '../api/axios'

/**
 * Get current subscription status for the authenticated Company Admin
 * GET /api/super-admin/payments/subscription-status/
 */
export const getSubscriptionStatus = (params = {}) => {
  return axiosInstance.get('/super-admin/payments/subscription-status/', { params })
}

/**
 * Create Stripe Checkout Session in subscription mode
 * POST /api/super-admin/payments/create-checkout/
 * Note: backend resolves company from authenticated user's UserTenant mapping
 */
export const createCheckoutSession = () => {
  return axiosInstance.post('/super-admin/payments/create-checkout/')
}
