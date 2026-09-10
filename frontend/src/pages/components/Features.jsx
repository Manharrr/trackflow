import { Layers, ShieldCheck, Fingerprint, Users, Truck, Sparkles } from 'lucide-react'

const features = [
  {
    title: 'Multi-Tenant Workspaces',
    description: 'Completely isolated, secure virtual environments for every organization and business unit.',
    icon: Layers,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-100/50'
  },
  {
    title: 'Role-Based Access Control',
    description: 'Fine-grained permissions for Super Admins, Company Admins, Operations, and Employees.',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-100/50'
  },
  {
    title: 'Secure Multi-Factor MFA',
    description: 'Built-in Microsoft Authenticator support to guarantee identity verification and secure sign-ins.',
    icon: Fingerprint,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-100/50'
  },
  {
    title: 'Employee Management',
    description: 'Easily onboard, organize, track permissions, and manage workflows for all staff members.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-100/50'
  },
  {
    title: 'Courier Integration',
    description: 'Streamlined third-party courier dispatching, package status updates, and tracking.',
    icon: Truck,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-100/50'
  },
  {
    title: 'AI Analytics & Insights',
    description: 'Get automated reports, platform health indicators, order velocity metrics, and anomalies.',
    icon: Sparkles,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-100/50'
  }
]

export default function Features() {
  return (
    <section
      id="features"
      className="py-32 bg-white relative overflow-hidden"
    >
      {/* Decorative backdrop spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8">

        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full">
            Core Features
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-dark-text mt-4 tracking-tight">
            Features Built for Scale
          </h2>
          <p className="text-muted-gray text-base sm:text-lg mt-4">
            TrackFlow AI comes packed with all the tools necessary to manage high-volume logistics and operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {features.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="bg-white rounded-3xl p-8 border border-border-light/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20 group text-left"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.bgColor} ${item.color} mb-6 transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-dark-text tracking-tight group-hover:text-primary-dark transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-muted-gray text-sm mt-3 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}

        </div>

      </div>
    </section>
  )
}