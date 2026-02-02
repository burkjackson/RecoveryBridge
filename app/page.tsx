'use client'

import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'

export default function Home() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-4xl w-full text-center">
          {/* Logo/Title */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D3436] mb-4">
              RecoveryBridge
            </h1>
            <p className="text-lg sm:text-xl text-rb-gray mb-6">
              Your recovery support community
            </p>
          </div>

          {/* What is RecoveryBridge */}
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2D3436] mb-4 text-center">
              What is RecoveryBridge?
            </h2>
            <p className="text-base sm:text-lg text-rb-gray text-center mb-6">
              RecoveryBridge is a <strong>safe space for people in addiction recovery</strong> to find and build meaningful connections. Whether you're recovering from substance abuse, behavioral addictions, or supporting someone in their journey, you're not alone.
            </p>
            <p className="text-base text-rb-gray text-center">
              We provide a judgment-free platform where you can share your experiences, offer support, and connect with others who truly understand what recovery means.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => router.push('/signup')}
              className="min-h-[44px] px-8 py-3 bg-rb-blue text-white rounded-full font-semibold hover:bg-rb-blue-hover transition text-base sm:text-lg"
            >
              Get Started
            </button>
            <button
              onClick={() => router.push('/login')}
              className="min-h-[44px] px-8 py-3 border-2 border-rb-blue text-rb-blue rounded-full font-semibold hover:bg-rb-blue hover:text-white transition text-base sm:text-lg"
            >
              Log In
            </button>
          </div>

          {/* How It Works */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2D3436] mb-8 text-center">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-rb-blue text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <h3 className="font-semibold text-[#2D3436] mb-2">Create Your Profile</h3>
                <p className="text-sm text-rb-gray">
                  Sign up and share what feels comfortable. Choose your role: seeking support or offering it.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-rb-blue text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <h3 className="font-semibold text-[#2D3436] mb-2">Connect Safely</h3>
                <p className="text-sm text-rb-gray">
                  Match with others in recovery. All conversations are private, encrypted, and confidential.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-rb-blue text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <h3 className="font-semibold text-[#2D3436] mb-2">Build Community</h3>
                <p className="text-sm text-rb-gray">
                  Share your journey, listen to others, and find the connection that supports your recovery.
                </p>
              </div>
            </div>
          </div>

          {/* Value Propositions */}
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-semibold text-[#2D3436] mb-2">Peer Support</h3>
              <p className="text-sm text-rb-gray">
                Connect with others who understand your journey
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="font-semibold text-[#2D3436] mb-2">Private & Safe</h3>
              <p className="text-sm text-rb-gray">
                Encrypted conversations in a confidential space
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-4xl mb-3">💚</div>
              <h3 className="font-semibold text-[#2D3436] mb-2">Always Available</h3>
              <p className="text-sm text-rb-gray">
                Find support when you need it, day or night
              </p>
            </div>
          </div>

          {/* Who We Serve */}
          <div className="max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2D3436] mb-6 text-center">
              Who RecoveryBridge Serves
            </h2>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <ul className="space-y-6">
                <li className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-2">🌟</span>
                  <strong className="text-[#2D3436] mb-1">People in Recovery</strong>
                  <p className="text-sm text-rb-gray">From substance abuse, behavioral addictions, or any form of recovery journey</p>
                </li>
                <li className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-2">🤝</span>
                  <strong className="text-[#2D3436] mb-1">Allies in Long-Term Recovery</strong>
                  <p className="text-sm text-rb-gray">Giving back by offering support to others on their journey</p>
                </li>
                <li className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-2">🛡️</span>
                  <strong className="text-[#2D3436] mb-1">Recovery Support</strong>
                  <p className="text-sm text-rb-gray">Supporting the recovery community with empathy and understanding</p>
                </li>
              </ul>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 text-sm text-rb-gray mb-6">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span>End-to-end encrypted</span>
            </div>
            <span className="hidden sm:inline text-gray-300">•</span>
            <div className="flex items-center gap-2">
              <span className="text-base">✓</span>
              <span>Always confidential</span>
            </div>
            <span className="hidden sm:inline text-gray-300">•</span>
            <div className="flex items-center gap-2">
              <span className="text-base">🆓</span>
              <span>Free to use</span>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-rb-gray mb-2">
              <strong className="text-[#2D3436]">Important:</strong> RecoveryBridge provides peer support, not professional therapy or crisis intervention.
            </p>
            <p className="text-sm text-rb-gray">
              If you're in crisis: <strong>Call 988</strong> (Suicide & Crisis Lifeline) or <strong>Text HOME to 741741</strong> (Crisis Text Line)
            </p>
          </div>
        </div>
      </div>

      {/* Footer with all links */}
      <Footer />
    </main>
  )
}
