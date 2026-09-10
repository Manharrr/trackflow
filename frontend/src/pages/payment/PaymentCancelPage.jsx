import { Link } from 'react-router-dom'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function PaymentCancelPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 sm:p-12 w-full max-w-lg shadow-xl border border-border-light text-center relative overflow-hidden">
        {/* Top Decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl opacity-50 -mr-8 -mt-8" />

        <div className="w-18 h-18 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6 text-amber-600 shadow-sm border border-amber-200">
          <XCircle className="h-9 w-9" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-text tracking-tight mb-2">
          Payment Cancelled
        </h1>

        <p className="text-sm font-semibold text-amber-800 mb-2">
          Your subscription is still pending.
        </p>

        <p className="text-xs text-muted-gray leading-relaxed max-w-sm mx-auto mb-8">
          The Stripe checkout session was cancelled before completion. No charges were made to your account. You can complete the subscription whenever you are ready.
        </p>

        <div className="space-y-3">
          <Link
            to="/payment"
            className="w-full bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </Link>

          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-gray hover:text-dark-text font-medium py-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
