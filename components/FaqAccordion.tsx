'use client'

import { useState } from 'react'
import { faqs } from '@/lib/faqs'

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
                <p className="px-5 pb-4 pt-1 text-sm text-rb-gray dark:text-gray-300 leading-relaxed">
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
