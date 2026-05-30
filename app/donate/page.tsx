'use client'

import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'

const DONATE_URL = 'https://donate.mazloweb.com/donate/recoverybridge-primary-campaign'

export default function DonatePage() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-purple-50 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex-1 flex items-start justify-center pt-8 p-4 sm:p-6">
        <div className="max-w-2xl w-full">

          {/* Back button */}
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300 hover:text-rb-blue font-semibold mb-8 transition"
          >
            ← Back to RecoveryBridge
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4" role="img" aria-label="Heart">💙</div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-700 dark:text-gray-100 mb-3">
              Support Our Mission
            </h1>
            <p className="text-lg text-slate-600 dark:text-gray-400 italic">
              "We do not heal in isolation."
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6 border-2 border-slate-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-slate-700 dark:text-gray-100 mb-4 text-center">
              RecoveryBridge is free — and always will be.
            </h2>
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed mb-4 text-center">
              We believe that access to peer support in recovery should never come with a price tag.
              No paywalls. No premium tiers. No subscriptions. Every person who needs connection
              should be able to find it here, regardless of their circumstances.
            </p>
            <p className="text-slate-600 dark:text-gray-300 leading-relaxed text-center mb-4">
              But keeping the lights on does cost money — servers, infrastructure, and the time
              it takes to build and maintain a platform worthy of the people who trust it.
              If RecoveryBridge has meant something to you, and you're in a position to help,
              even a small contribution goes a long way toward keeping this community alive.
            </p>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed">
                <strong>Your gift is tax-deductible.</strong> RecoveryBridge is a fiscally sponsored
                project of <strong>Fiscal Sponsorship Allies</strong>, a registered 501(c)(3) nonprofit.
                Donations are tax-deductible to the fullest extent allowed by law, and you'll receive
                a receipt for your records.
              </p>
            </div>
          </div>

          {/* What your support covers */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-6 mb-6 border-2 border-blue-200 dark:border-gray-600">
            <h3 className="font-bold text-slate-700 dark:text-gray-100 mb-4 text-center">What your support covers</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl mb-2" role="img" aria-label="Server">🖥️</div>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-100">Hosting & Infrastructure</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Keeping the platform fast, reliable, and secure</p>
              </div>
              <div>
                <div className="text-3xl mb-2" role="img" aria-label="Lock">🔒</div>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-100">Privacy & Security</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Protecting every conversation and every user</p>
              </div>
              <div>
                <div className="text-3xl mb-2" role="img" aria-label="Wrench">🛠️</div>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-100">Development</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Building new features that serve the community better</p>
              </div>
            </div>
          </div>

          {/* Donate CTA */}
          <div className="text-center mb-6">
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-10 py-4 bg-rb-blue hover:bg-rb-blue-hover text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <span className="text-2xl" role="img" aria-label="Heart">💙</span>
              Donate Now
            </a>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-3">
              One-time or monthly — whatever feels right. Every bit helps.
            </p>
          </div>

          {/* No pressure note */}
          <div className="bg-amber-50 dark:bg-orange-900/20 rounded-xl p-5 border border-amber-200 dark:border-orange-700 text-center">
            <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
              <strong>No pressure, ever.</strong> If you're here because you need support,
              please use this platform freely — that's exactly what it's here for.
              Donations are only for those who are able and want to give back.
            </p>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  )
}
