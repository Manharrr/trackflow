import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

const features = [
  'Multi-Tenant Custom Subdomains',
  'Role-Based Authorization System',
  'Secure Microsoft Authenticator MFA',
  'Unlimited Orders & Courier Records',
  'Advanced AI Assistant Insights',
  '24/7 Priority Email & Chat Support'
]

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="py-32 bg-bg-tint/50 relative overflow-hidden"
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-6 sm:px-8">

        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full">
            Pricing Plans
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-dark-text mt-4 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-gray text-base sm:text-lg mt-4">
            Get complete access to all TrackFlow AI features without any hidden fees.
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-border-light shadow-xl shadow-primary/5 p-10 sm:p-16 relative overflow-hidden text-left group hover:border-primary/20 transition-all duration-300">
          {/* Badge */}
          <div className="absolute top-6 right-6 bg-primary text-white text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full shadow-md shadow-primary/10">
            Most Popular
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left pricing Details */}
            <div>
              <h3 className="text-2xl font-extrabold text-dark-text">
                Enterprise Plan
              </h3>
              <p className="text-muted-gray text-sm mt-2 leading-relaxed">
                A complete workspace matching all company management operations and logistics integrations.
              </p>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-black text-dark-text tracking-tight">
                  ₹1000
                </span>
                <span className="text-base font-semibold text-muted-gray">
                  / month
                </span>
              </div>

              <div className="mt-8">
                <Link
                  to="/register"
                  className="w-full text-center inline-block bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Get Started Now
                </Link>
              </div>
            </div>

            {/* Right Features Checklist */}
            <div className="border-t md:border-t-0 md:border-l border-border-light pt-8 md:pt-0 md:pl-12">
              <span className="block text-xs font-bold text-dark-text uppercase tracking-wider mb-6">
                What's Included:
              </span>
              <ul className="space-y-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-dark mt-0.5 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium text-muted-gray">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

        </div>

      </div>
    </section>
  )
}