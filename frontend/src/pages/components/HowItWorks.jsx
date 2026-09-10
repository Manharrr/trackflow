import { UserPlus, ShieldAlert, Globe, Activity } from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Register',
    description: 'Create an administrator account and register your enterprise profile.',
    icon: UserPlus,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-100/50'
  },
  {
    number: '02',
    title: 'Verify Phone',
    description: 'Verify your phone number with a secure SMS OTP code.',
    icon: ShieldAlert,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-100/50'
  },
  {
    number: '03',
    title: 'Create Workspace',
    description: 'Initialize a custom sub-domain workspace tailored to your agency layout.',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-100/50'
  },
  {
    number: '04',
    title: 'Manage Operations',
    description: 'Track flows, monitor active employees, and access AI-driven logistics tools.',
    icon: Activity,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-100/50'
  }
]

export default function HowItWorks() {
  return (
    <section className="py-32 bg-bg-tint relative overflow-hidden">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 relative z-10">

        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full">
            The Flow
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-dark-text mt-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-muted-gray text-base sm:text-lg mt-4">
            Follow a simple, unified onboarding path to get your logistics dashboard running in minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className="bg-white rounded-3xl p-8 border border-border-light/60 shadow-sm relative transition-all duration-300 hover:-translate-y-1 hover:shadow-md group text-left"
              >
                {/* Horizontal link lines (only on large screens) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-full h-[2px] bg-gradient-to-r from-border-light to-transparent z-0 transform -translate-x-12"></div>
                )}
                
                <div className="flex items-center justify-between relative z-10 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${step.bgColor} ${step.color} transition-transform duration-300 group-hover:scale-105`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-5xl font-black text-slate-100 font-sans group-hover:text-primary/10 transition-colors duration-300">
                    {step.number}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-dark-text tracking-tight relative z-10">
                  {step.title}
                </h3>
                <p className="text-muted-gray text-sm mt-3 leading-relaxed relative z-10">
                  {step.description}
                </p>
              </div>
            )
          })}

        </div>

      </div>

    </section>
  )
}