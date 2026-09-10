import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#061a15] text-[#dce3df] py-20 relative overflow-hidden border-t border-primary/10">
      
      {/* Decorative vector overlays */}
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        <div className="grid md:grid-cols-4 gap-12 md:gap-8 pb-12 border-b border-white/10 text-left">
          
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-6 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-dark flex items-center justify-center text-white font-extrabold text-lg shadow-md transition-transform duration-300 group-hover:scale-105">
                T
              </div>
              <span className="text-xl font-extrabold text-white tracking-tight font-sans">
                TrackFlow<span className="text-primary">.ai</span>
              </span>
            </Link>
            
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              AI-powered multi-tenant logistics operations platform. Streamlining deliveries, staff permissions, and workspace setups.
            </p>
          </div>
          
          <div>
            <span className="block text-xs font-bold text-white uppercase tracking-wider mb-4">
              Resources
            </span>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#modules" className="hover:text-primary transition-colors">Modules</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
            </ul>
          </div>
          
          <div>
            <span className="block text-xs font-bold text-white uppercase tracking-wider mb-4">
              Legal & Security
            </span>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Security Audit</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">MFA Protocol</a></li>
            </ul>
          </div>
          
        </div>
        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            &copy; {currentYear} TrackFlow AI. All rights reserved.
          </p>
          <p className="flex gap-4">
            <span>Designed By Manhar.</span>
          </p>
        </div>
        
      </div>
    </footer>
  )
}