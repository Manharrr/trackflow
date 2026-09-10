import { Link } from 'react-router-dom'
import { Package, Users, Coins, BarChart3, ArrowUpRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 overflow-hidden bg-gradient-to-b from-white via-bg-tint/30 to-white">
      {/* Decorative Background Blobs */}
      <div className="absolute top-40 left-1/4 -translate-x-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-20 right-1/4 translate-x-1/2 w-[350px] h-[350px] bg-primary-dark/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full grid lg:grid-cols-2 gap-16 lg:gap-12 py-16 relative z-10">
        
        {/* Left content */}
        <div className="flex flex-col justify-center text-left">
          
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary-dark border border-primary/20 px-4 py-1.5 rounded-full w-fit mb-6 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-bold tracking-wide uppercase font-sans">
              AI Powered Logistics Platform
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-dark-text leading-[1.1] tracking-tight">
            Modern Logistics <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-dark">
              Operations Platform
            </span>
          </h1>

          <p className="text-muted-gray text-lg sm:text-xl mt-6 max-w-xl leading-relaxed">
            Manage orders, employees, deliveries, and AI insights from one beautiful, high-performance secure workspace.
          </p>

          <div className="flex flex-wrap gap-4 mt-10">
            <Link
              to="/register"
              className="bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 group"
            >
              Start Free
              <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>

            <Link
              to="/login"
              className="border border-border-light text-muted-gray hover:text-dark-text hover:bg-white px-8 py-4 rounded-xl font-semibold shadow-sm transition-all duration-200"
            >
              Login to Workspace
            </Link>
          </div>

        </div>

        {/* Right content: Stats Grid Card */}
        <div className="flex items-center justify-center lg:justify-end">
          
          <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-10 border border-border-light shadow-xl shadow-primary/5 w-full max-w-lg relative group transition-all duration-300 hover:border-primary/20">
            
            <div className="absolute -top-3 -right-3 w-16 h-16 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-xl -z-10 group-hover:scale-125 transition-transform duration-500"></div>

            <div className="grid grid-cols-2 gap-5 sm:gap-6">
              
              {/* Stat Card 1 */}
              <div className="bg-white p-6 rounded-2xl border border-border-light/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary-dark mb-4">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-3xl font-black text-dark-text">
                  245
                </h3>
                <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider mt-1.5">
                  Orders
                </p>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white p-6 rounded-2xl border border-border-light/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/10">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-3xl font-black text-dark-text">
                  32
                </h3>
                <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider mt-1.5">
                  Employees
                </p>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-white p-6 rounded-2xl border border-border-light/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/10">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
                  <Coins className="w-5 h-5" />
                </div>
                <h3 className="text-3xl font-black text-dark-text">
                  ₹2.4L
                </h3>
                <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider mt-1.5">
                  Revenue
                </p>
              </div>

              {/* Stat Card 4 */}
              <div className="bg-white p-6 rounded-2xl border border-border-light/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/10">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 mb-4">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-3xl font-black text-dark-text">
                  98%
                </h3>
                <p className="text-xs font-semibold text-muted-gray uppercase tracking-wider mt-1.5">
                  Performance
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  )
}