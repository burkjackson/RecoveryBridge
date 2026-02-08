'use client'

import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'

export default function Home() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-4xl w-full text-center">
            {/* Logo/Title */}
            <div className="mb-8 sm:mb-10">
              <img
                src="/logo-with-text.png"
                alt="RecoveryBridge Logo"
                className="mx-auto mb-6"
                style={{ width: '500px', maxWidth: '90%' }}
              />
              <p className="text-xl sm:text-2xl text-slate-400 italic mb-3">
                "Connection is the antidote to addiction"
              </p>
              <p className="text-lg sm:text-xl text-slate-400 font-semibold">
                Your recovery support community
              </p>
            </div>

            {/* What is RecoveryBridge */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 shadow-lg border-2 border-slate-200">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-600 mb-4 text-center">
                  What is RecoveryBridge?
                </h2>
                <p className="text-base sm:text-lg text-slate-400 text-center mb-6 leading-relaxed">
                  RecoveryBridge is a <strong>safe space for people in addiction recovery</strong> to find and build meaningful connections. Whether you're recovering from substance abuse, behavioral addictions, or supporting someone in their journey, you're not alone.
                </p>
                <p className="text-base text-slate-400 text-center leading-relaxed">
                  We provide a judgment-free platform where you can share your experiences, offer support, and connect with others who truly understand what recovery means.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button
                onClick={() => router.push('/signup')}
                className="min-h-[44px] px-10 py-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full font-semibold hover:shadow-xl transition-all transform hover:scale-105 text-base sm:text-lg shadow-md"
              >
                Get Started
              </button>
              <button
                onClick={() => router.push('/login')}
                className="min-h-[44px] px-10 py-4 border-2 border-slate-400 text-slate-600 rounded-full font-semibold hover:bg-slate-500 hover:text-white transition-all transform hover:scale-105 text-base sm:text-lg bg-white shadow-md hover:shadow-xl"
              >
                Log In
              </button>
            </div>

            {/* How It Works */}
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-600 mb-8 text-center">
                How It Works
              </h2>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    1
                  </div>
                  <h3 className="font-bold text-slate-600 mb-2 text-lg">Create Your Profile</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Sign up and share what feels comfortable. Choose your role: seeking support or offering it.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    2
                  </div>
                  <h3 className="font-bold text-slate-600 mb-2 text-lg">Connect Safely</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Match with others in recovery. All conversations are private, encrypted, and confidential.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    3
                  </div>
                  <h3 className="font-bold text-slate-600 mb-2 text-lg">Build Community</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Share your journey, listen to others, and find the connection that supports your recovery.
                  </p>
                </div>
              </div>
            </div>

            {/* Value Propositions */}
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all transform hover:scale-105">
                <div className="text-5xl mb-4" role="img" aria-label="Handshake">🤝</div>
                <h3 className="font-bold text-slate-600 mb-2 text-lg">Peer Support</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Connect with others who understand your journey
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all transform hover:scale-105">
                <div className="text-5xl mb-4" role="img" aria-label="Lock">🔒</div>
                <h3 className="font-bold text-slate-600 mb-2 text-lg">Private & Safe</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Encrypted conversations in a confidential space
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all transform hover:scale-105">
                <div className="text-5xl mb-4" role="img" aria-label="Green heart">💚</div>
                <h3 className="font-bold text-slate-600 mb-2 text-lg">Always Available</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Find support when you need it, day or night
                </p>
              </div>
            </div>

            {/* Who We Serve */}
            <div className="max-w-3xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-600 mb-6 text-center">
                Who RecoveryBridge Serves
              </h2>
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl p-8 shadow-lg border-2 border-slate-200">
                <ul className="space-y-8">
                  <li className="flex flex-col items-center text-center">
                    <span className="text-5xl mb-3" role="img" aria-label="Star">🌟</span>
                    <strong className="text-slate-600 mb-2 text-lg">Person in Recovery</strong>
                    <p className="text-sm text-slate-400 leading-relaxed">From substance abuse, behavioral addictions, or any form of recovery journey</p>
                  </li>
                  <div className="border-t border-slate-200"></div>
                  <li className="flex flex-col items-center text-center">
                    <span className="text-5xl mb-3" role="img" aria-label="Handshake">🤝</span>
                    <strong className="text-slate-600 mb-2 text-lg">Allies for Long-Term Recovery</strong>
                    <p className="text-sm text-slate-400 leading-relaxed">Giving back by offering support to others on their journey</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Mission Statement Card */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl p-8 shadow-lg border-2 border-slate-200">
                <p className="text-lg sm:text-xl text-slate-600 font-semibold text-center mb-4 italic">
                  "We do not heal in isolation"
                </p>
                <p className="text-base text-slate-400 text-center leading-relaxed">
                  RecoveryBridge is a safe, supportive space where people in recovery can connect with listeners who understand the journey. Whether you're here to offer support or seek it, you're part of a compassionate community working to make the world a better place in recovery.
                </p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="inline-flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400 mb-8 bg-white rounded-full px-6 py-3 shadow-md border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label="Lock">🔒</span>
                <span className="font-semibold">End-to-end encrypted</span>
              </div>
              <span className="hidden sm:inline text-slate-400">•</span>
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label="Checkmark">✓</span>
                <span className="font-semibold">Always confidential</span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-300 rounded-2xl p-6 max-w-2xl mx-auto shadow-md">
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                <strong className="text-slate-600 text-base">Important:</strong> RecoveryBridge provides peer support, not professional therapy or crisis intervention.
              </p>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-slate-400 leading-relaxed">
                  If you're in crisis: <strong className="text-slate-600">Call 988</strong> (Suicide & Crisis Lifeline) or <strong className="text-slate-600">Text HOME to 741741</strong> (Crisis Text Line)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with all links */}
        <Footer />
      </main>
  )
}
