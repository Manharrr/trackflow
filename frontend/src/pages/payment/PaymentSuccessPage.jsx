import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getSubscriptionStatus } from '../../services/paymentService'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

export default function PaymentSuccessPage() {
  const { refreshSubscription } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'active' | 'pending' | 'error'
  const [subscriptionData, setSubscriptionData] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [pollCount, setPollCount] = useState(0)
  const maxPolls = 5
  const pollTimerRef = useRef(null)

  const verifyPayment = async () => {
    setStatus('verifying')
    setErrorMessage(null)

    try {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get('session_id')
      const response = await getSubscriptionStatus(sessionId ? { session_id: sessionId } : {})
      const data = response.data
      setSubscriptionData(data)

      if (data?.subscription_status === 'active') {
        setStatus('active')
        // Sync context state
        refreshSubscription().catch(() => { })
        // Smooth auto-redirect to dashboard after brief display
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 1000)
        return
      }

      // If still pending, schedule retry up to maxPolls (webhooks can take 1-3 seconds)
      setStatus('pending')
    } catch (err) {
      console.error('Verification check error:', err)
      setStatus('error')
      setErrorMessage(
        err.response?.data?.message ||
        'Could not verify subscription status. Please click retry.'
      )
    }
  }

  useEffect(() => {
    verifyPayment()

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  // Auto-polling when status is pending (up to 5 times)
  useEffect(() => {
    if (status === 'pending' && pollCount < maxPolls) {
      pollTimerRef.current = setTimeout(() => {
        setPollCount((prev) => prev + 1)
        verifyPayment()
      }, 3000)
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [status, pollCount])

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 sm:p-12 w-full max-w-lg shadow-xl border border-border-light text-center relative overflow-hidden">
        {/* Top Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl opacity-50 -mr-8 -mt-8" />

        {/* State 1: Verifying */}
        {status === 'verifying' && (
          <div>
            <div className="w-18 h-18 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-text tracking-tight mb-2">
              Verifying your payment...
            </h1>
            <p className="text-sm text-muted-gray leading-relaxed max-w-sm mx-auto">
              Please wait while we confirm your transaction with Stripe and activate your workspace.
            </p>
          </div>
        )}

        {/* State 2: Active (Success verified by backend webhook) */}
        {status === 'active' && (
          <div className="animate-fade-in">
            <div className="w-18 h-18 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-sm border border-emerald-200">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-text tracking-tight mb-2">
              Payment Successful
            </h1>
            <p className="text-sm font-semibold text-emerald-700 mb-1">
              Your TrackFlow subscription is active.
            </p>
            <p className="text-xs text-muted-gray leading-relaxed max-w-sm mx-auto mb-8">
              Your monthly subscription of {subscriptionData?.amount ? `₹${parseInt(subscriptionData.amount)}` : '₹1,000'} has been confirmed. You now have full access to all TrackFlow AI features.
            </p>

            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* State 3: Still Pending (Webhook processing) */}
        {status === 'pending' && (
          <div className="animate-fade-in">
            <div className="w-18 h-18 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6 text-amber-700 shadow-sm border border-amber-200">
              <Clock className="h-9 w-9 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-text tracking-tight mb-2">
              Payment Processing
            </h1>
            <p className="text-sm text-amber-800 font-medium mb-2">
              Payment is being processed. Please wait a moment and try again.
            </p>
            <p className="text-xs text-muted-gray leading-relaxed max-w-sm mx-auto mb-8">
              Stripe is finalizing your transaction webhook. This usually takes just a few seconds.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={verifyPayment}
                className="w-full bg-primary hover:bg-primary-dark text-white h-12 rounded-xl font-bold shadow-md shadow-primary/15 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Check Status Again</span>
              </button>

              <Link
                to="/payment"
                className="w-full inline-block text-xs text-muted-gray hover:text-dark-text font-medium py-2 transition-colors"
              >
                Return to Subscription Page
              </Link>
            </div>
          </div>
        )}

        {/* State 4: Error */}
        {status === 'error' && (
          <div className="animate-fade-in">
            <div className="w-18 h-18 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-sm border border-rose-200">
              <AlertCircle className="h-9 w-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-text tracking-tight mb-2">
              Verification Failed
            </h1>
            <p className="text-sm text-rose-700 mb-6">
              {errorMessage || 'Unable to verify payment status with backend.'}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={verifyPayment}
                className="w-full bg-primary hover:bg-primary-dark text-white h-12 rounded-xl font-bold shadow-md shadow-primary/15 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Verification</span>
              </button>

              <Link
                to="/payment"
                className="w-full inline-block text-xs text-muted-gray hover:text-dark-text font-medium py-2 transition-colors"
              >
                Back to Subscription Page
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
