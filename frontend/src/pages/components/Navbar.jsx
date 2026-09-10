import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-lg border-b border-border-light/50 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">

        <Link
          to="/"
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
            T
          </div>
          <span className="text-2xl font-black text-dark-text tracking-tight font-sans transition-colors duration-300 group-hover:text-primary-dark">
            TrackFlow<span className="text-primary">.</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-gray">
          <a href="#features" className="hover:text-primary transition-colors duration-200">Features</a>
          <a href="#modules" className="hover:text-primary transition-colors duration-200">Modules</a>
          <a href="#pricing" className="hover:text-primary transition-colors duration-200">Pricing</a>
          <a href="#faq" className="hover:text-primary transition-colors duration-200">FAQ</a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-semibold text-muted-gray hover:text-primary transition-colors duration-200 px-4 py-2 rounded-xl"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark font-semibold text-sm shadow-lg shadow-primary/15 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>

      </div>
    </nav>
  )
}