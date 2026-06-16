'use client'

import { useState } from 'react'

const faqs = [
  {
    q: "What if I'm in crisis?",
    a: "RecoveryBridge is peer support — not emergency services or crisis intervention. If you're in immediate danger, please reach out: call or text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911. These resources are always one tap away inside the app.",
  },
  {
    q: 'Is it anonymous?',
    a: "You choose a display name — no real name, phone number, or identifying info required. Your conversations are private, encrypted, and visible only to you and the person you're speaking with. We never sell your data or share it with advertisers.",
  },
  {
    q: 'Is it really free?',
    a: 'Yes — completely. No subscriptions, no premium tiers, no ads. RecoveryBridge is supported by donations from people who believe peer support should be accessible to everyone, regardless of their situation.',
  },
  {
    q: 'Who are the listeners?',
    a: "Real people with lived experience in recovery — not therapists, counselors, or paid staff. Peers who've walked a similar path and want to offer the kind of understanding that only comes from having been there. Every listener completes a safety and guidelines orientation before connecting with anyone.",
  },
  {
    q: 'What can I talk about?',
    a: "Anything on your mind in recovery. Early sobriety, relapse fears, family tension, grief, anxiety, trauma — there's no set agenda. Listeners have specialty tags so you can find someone with relevant experience, whether that's alcohol, parenting in recovery, relationships, or something else entirely.",
  },
  {
    q: 'Does it work on my phone?',
    a: "Yes. RecoveryBridge is a Progressive Web App — add it to your home screen on iPhone or Android and it works like a native app, with push notifications so a seeker can find you even when you close the browser.",
  },
  {
    q: 'Can I be both a seeker and a listener?',
    a: "Yes. Many people do both — seeking support on hard days, offering it when they're in a stronger place. You can switch roles anytime from your dashboard.",
  },
]

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="max-w-2xl mx-auto mb-12">
      <h2 className="text-heading-2 text-rb-dark dark:text-gray-100 mb-6 text-center">
        Common Questions
      </h2>
      <div className="rounded-2xl border border-rb-blue-light dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden divide-y divide-rb-blue-light dark:divide-gray-700">
        {faqs.map((faq, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
              className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 hover:bg-rb-blue-light/40 dark:hover:bg-gray-700/40 transition-colors"
            >
              <span className="text-sm font-semibold text-rb-dark dark:text-gray-100">
                {faq.q}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`w-4 h-4 text-rb-blue dark:text-blue-300 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
              </svg>
            </button>

            {/* Grid-rows trick: animates from 0fr → 1fr for smooth height transition */}
            <div
              className={`grid transition-all duration-200 ease-in-out ${
                open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 pt-1 text-sm text-rb-gray dark:text-gray-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
