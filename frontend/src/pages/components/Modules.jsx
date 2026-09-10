import { ClipboardList, Users, Milestone, PieChart, FileSpreadsheet, Cpu } from 'lucide-react'

const modules = [
  {
    title: 'Orders Management',
    description: 'Dispatch, allocate, assign couriers, and track package completion statuses.',
    icon: ClipboardList,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-100/50'
  },
  {
    title: 'Employees Portal',
    description: 'Structure worker records, setup hierarchies, and configure authentication profiles.',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-100/50'
  },
  {
    title: 'Courier Integration',
    description: 'Assign orders to shipping agents and track real-time fulfillment pipelines.',
    icon: Milestone,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-100/50'
  },
  {
    title: 'Visual Analytics',
    description: 'Visualize order status distributions, employee workloads, and revenue figures.',
    icon: PieChart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-100/50'
  },
  {
    title: 'Automated Reports',
    description: 'Generate real-time logs, request approvals, and print delivery spreadsheets.',
    icon: FileSpreadsheet,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-100/50'
  },
  {
    title: 'AI Smart Assistant',
    description: 'Leverage built-in LLM modules to prompt insights, metrics, and operation updates.',
    icon: Cpu,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-100/50'
  }
]

export default function Modules() {
  return (
    <section
      id="modules"
      className="py-32 bg-white relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8">

        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full">
            The Platform
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-dark-text mt-4 tracking-tight">
            Integrated Modules
          </h2>
          <p className="text-muted-gray text-base sm:text-lg mt-4">
            A comprehensive suite of logical dashboards designed to manage every facet of logistics.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

          {modules.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="p-8 rounded-3xl border border-border-light/60 bg-white hover:border-primary/20 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group text-left"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.bgColor} ${item.color} mb-6 transition-transform duration-300 group-hover:scale-105`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-dark-text tracking-tight group-hover:text-primary-dark transition-colors duration-200">
                  {item.title}
                </h3>
                <p className="text-muted-gray text-sm mt-3 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}
          )}

        </div>

      </div>
    </section>
  )
}