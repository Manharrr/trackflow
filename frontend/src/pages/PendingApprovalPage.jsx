import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-bg-tint flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-[2rem] p-8 sm:p-12 w-full max-w-md shadow-xl border border-border-light relative overflow-hidden text-center hover:border-primary/10 transition-all duration-300">
        
        {/* Decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl opacity-40 -mr-5 -mt-5" />

        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary-dark shadow-sm">
          <Clock className="h-7 w-7 animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold text-dark-text tracking-tight mb-3">
          Registration Submitted
        </h1>

        <p className="text-muted-gray text-sm sm:text-base mt-2 leading-relaxed">
          Your company registration request has been submitted successfully.
        </p>

        <p className="text-muted-gray text-sm sm:text-base mt-2 leading-relaxed font-semibold">
          Please wait while the Super Admin reviews and approves your workspace.
        </p>

        <Link
          to="/login"
          className="w-full inline-block mt-8 bg-gradient-to-r from-primary to-primary-dark hover:opacity-95 text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/15 transition-all duration-200 flex items-center justify-center cursor-pointer text-sm"
        >
          Back To Login
        </Link>
      </div>
    </div>
  )
}