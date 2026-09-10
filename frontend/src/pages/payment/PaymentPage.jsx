import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { createCheckoutSession } from '../../services/paymentService'
import {
  CreditCard,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react'

export default function PaymentPage() {
  const { user, subscription, refreshSubscription } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Refresh subscription status on mount to ensure fresh state
    refreshSubscription().catch(() => {})
  }, [])

  const handlePay = async () => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await createCheckoutSession()
      const checkoutUrl = response.data?.checkout_url

      if (!checkoutUrl) {
        throw new Error('Checkout URL was not returned by the server.')
      }

      // Redirect browser directly to Stripe Checkout
      window.location.href = checkoutUrl
    } catch (err) {
      console.error('Checkout error:', err)
      setLoading(false)

      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.')
      } else if (err.response?.status === 403) {
        setError(
          err.response?.data?.message ||
          'Your company is not approved or you do not have permission to pay.'
        )
      } else if (err.response?.status === 400) {
        setError(
          err.response?.data?.message ||
          'Subscription is already active or payment cannot be initiated.'
        )
      } else if (err.response?.status === 500) {
        setError(
          err.response?.data?.message ||
          'Payment service is temporarily unavailable. Please try again later.'
        )
      } else if (!navigator.onLine) {
        setError('Network error: please check your internet connection and try again.')
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          'An unexpected error occurred while initiating checkout. Please try again.'
        )
      }
    }
  }

  const amountDisplay = subscription?.amount ? `₹${parseInt(subscription.amount).toLocaleString('en-IN')}` : '₹1,000'
  const billingCycleDisplay = subscription?.billing_cycle
    ? subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)
    : 'Monthly'
  const statusDisplay = subscription?.subscription_status === 'active'
    ? 'Active'
    : subscription?.subscription_status === 'cancelled'
    ? 'Cancelled'
    : subscription?.subscription_status === 'expired'
    ? 'Expired'
    : 'Payment Pending'

  const isPending = subscription?.subscription_status !== 'active'

  const features = [
    'Complete AI-Powered Order Extraction & Management',
    'Automated Shipment Dispatching & Real-time Tracking',
    'Dedicated Multi-tenant Workspace & Role-based Access',
    'Real-time Chat & WebSocket Order Notifications',
    'Comprehensive Operations Analytics & KPI Dashboards',
    'Unlimited Employee & Driver Accounts',
  ]

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Header Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary-dark font-semibold text-xs uppercase tracking-wider mb-4 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          Workspace Subscription
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-dark-text tracking-tight">
          TrackFlow AI Subscription
        </h1>
        <p className="mt-3 text-base text-muted-gray max-w-xl mx-auto">
          Activate your workspace subscription to unlock intelligent logistics dispatch,
          order orchestration, and team analytics.
        </p>
      </div>

      {/* Error Message Banner */}
      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-semibold text-rose-900">Unable to Proceed</p>
            <p className="mt-0.5 text-rose-700">{error}</p>
          </div>
        </div>
      )}

      {/* Pricing Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-border-light overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="grid md:grid-cols-12">
          {/* Left Column - Plan Details */}
          <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border-light">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-gray">
                  Professional Plan
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                    isPending
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {statusDisplay}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl sm:text-5xl font-extrabold text-dark-text">
                  {amountDisplay}
                </span>
                <span className="text-muted-gray font-medium text-lg">
                  / month
                </span>
              </div>

              <div className="border-t border-border-light/60 pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-dark-text mb-4">
                  What's included in your workspace:
                </h3>
                <ul className="space-y-3">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-muted-gray">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-light/60 flex items-center gap-2 text-xs text-muted-gray">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secure recurring payment managed by Stripe. Cancel anytime.</span>
            </div>
          </div>

          {/* Right Column - Action & Checkout Summary */}
          <div className="md:col-span-5 p-8 sm:p-10 bg-bg-tint/40 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-dark-text mb-2">
                Subscription Summary
              </h3>
              <p className="text-xs text-muted-gray mb-6 leading-relaxed">
                Review your billing details before proceeding to the secure Stripe Checkout gateway.
              </p>

              <div className="space-y-3 bg-white p-5 rounded-2xl border border-border-light text-sm mb-6">
                <div className="flex justify-between text-muted-gray">
                  <span>Workspace</span>
                  <span className="font-semibold text-dark-text">
                    {user?.tenant?.name || 'Your Company'}
                  </span>
                </div>
                <div className="flex justify-between text-muted-gray">
                  <span>Billing Cycle</span>
                  <span className="font-semibold text-dark-text">
                    {billingCycleDisplay}
                  </span>
                </div>
                <div className="flex justify-between text-muted-gray">
                  <span>Status</span>
                  <span className={`font-semibold ${isPending ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {statusDisplay}
                  </span>
                </div>
                <div className="border-t border-border-light pt-3 flex justify-between font-bold text-dark-text text-base">
                  <span>Total Due Today</span>
                  <span className="text-primary-dark">{amountDisplay}</span>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handlePay}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white h-13 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-base group"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting to Stripe...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span>Pay {amountDisplay} / Month</span>
                  </>
                )}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-gray">
                <Lock className="w-3.5 h-3.5" />
                <span>256-Bit SSL Encrypted Payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
