import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const faqs = [
  {
    question: 'Is TrackFlow AI a multi-tenant platform?',
    answer: 'Yes. TrackFlow AI is built as a highly secure multi-tenant application. Each company receives its own isolated database instance and sub-domain workspace, guaranteeing absolute separation of tenant data.'
  },
  {
    question: 'Does it support Multi-Factor Authentication (MFA)?',
    answer: 'Absolutely. Security is central to our design. We support standard Microsoft Authenticator MFA. Admins can enforce MFA sign-in and workers can register MFA tokens using standard QR code setups.'
  },
  {
    question: 'Can I manage employees and granular roles?',
    answer: 'Yes. TrackFlow AI provides extensive role-based access control (RBAC). You can configure super admins, company admins, operations managers, and courier employees, with customized access limits for each.'
  },
  {
    question: 'How are orders allocated and tracked?',
    answer: 'Orders can be loaded, dispatched, and assigned to operations personnel or courier drivers. The dashboard features real-time state transitions and status updates for fulfillment tracking.'
  }
]

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState(null)

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <section
      id="faq"
      className="py-32 bg-white relative overflow-hidden text-left"
    >
      <div className="max-w-4xl mx-auto px-6 sm:px-8">

        <div className="text-center mb-20">
          <span className="text-xs font-bold tracking-wider uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full">
            Help Center
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-dark-text mt-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-gray text-base sm:text-lg mt-4">
            Find answers to common questions about security, deployment, roles, and logistics management.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeIndex === index
            return (
              <div
                key={index}
                className={`border rounded-2xl transition-all duration-300 ${
                  isOpen 
                    ? 'border-primary bg-bg-tint/30 shadow-md shadow-primary/5' 
                    : 'border-border-light/70 bg-white hover:border-primary/20'
                }`}
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-6 font-bold text-dark-text text-base sm:text-lg text-left"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className={`w-5 h-5 shrink-0 ${isOpen ? 'text-primary' : 'text-muted-gray'}`} />
                    <span>{faq.question}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-gray shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
                </button>
                
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-40 border-t border-border-light/50 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="p-6 text-sm sm:text-base text-muted-gray leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}