'use client'

import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'

export default function Home() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-gradient-to-br from-rb-blue-light via-rb-purple-light to-rb-blue-light animate-gradient">
        {/* Hero Section */}
        <div className="flex-1 flex items-start justify-center pt-2 p-4 sm:p-6">
          <div className="max-w-4xl w-full text-center">
            {/* Logo/Title */}
            <div className="mb-6 sm:mb-8">
              <img
                src="/logo-with-text.png"
                alt="RecoveryBridge Logo"
                className="mx-auto mb-6"
                style={{ width: '500px', maxWidth: '90%' }}
              />
              <p className="text-xl sm:text-2xl text-rb-gray italic mb-3">
                "Connection is the antidote to addiction"
              </p>
            </div>

            {/* What is RecoveryBridge */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-gradient-to-br from-white to-rb-blue-light rounded-2xl p-8 shadow-lg border-2 border-rb-blue-light">
                <h2 className="text-2xl sm:text-3xl font-bold text-rb-dark mb-4 text-center">
                  What is RecoveryBridge?
                </h2>
                <p className="text-base sm:text-lg text-rb-gray text-center mb-6 leading-relaxed">
                  Recovery is hard. Some days are harder than others. RecoveryBridge is a <strong>peer-to-peer support platform</strong> built for the moments when you need to talk to someone who truly gets it—not a hotline, not a therapist, but a real person who has walked a similar road in their own recovery and is ready to listen.
                </p>
                <p className="text-base text-rb-gray text-center leading-relaxed">
                  Through <strong>private, one-on-one chat-based conversations</strong>, you can speak freely—about the struggles, the setbacks, the small victories, and everything in between. No judgment. No pressure. Just genuine human connection in a space designed to hold your story with care.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex justify-center gap-4 mb-12">
              <button
                onClick={() => router.push('/signup')}
                className="w-36 py-5 rounded-xl text-center transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 bg-white border-2 border-rb-blue shadow-md hover:shadow-xl"
              >
                <div className="font-bold text-rb-blue text-base">Get Started</div>
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-36 py-5 rounded-xl text-center transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 bg-white border-2 border-rb-purple shadow-md hover:shadow-xl"
              >
                <div className="font-bold text-rb-purple text-base">Log In</div>
              </button>
            </div>

            {/* Mission Statement Card */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-gradient-to-r from-rb-blue-light to-rb-purple-light rounded-2xl p-8 shadow-lg border-2 border-rb-blue-light">
                <h2 className="text-2xl sm:text-3xl font-bold text-rb-dark mb-6 text-center">
                  Our Mission
                </h2>
                <p className="text-base text-rb-gray text-center mb-4 leading-relaxed">
                  We believe that <strong>connection is the antidote to addiction</strong> and that we do not heal in isolation.
                  RecoveryBridge exists to create a space where your story matters, your struggles are valid, and your
                  progress—no matter how small—deserves celebration.
                </p>
                <p className="text-base text-rb-gray text-center mb-4 leading-relaxed">
                  Every conversation here is built on empathy, respect, and the shared understanding that healing takes courage.
                  We're here to remind you that <strong>you are worth saving</strong>, that recovery is stronger together,
                  and that showing up—even on the hardest days—is an act of bravery.
                </p>
                <p className="text-base text-rb-gray text-center leading-relaxed">
                  This is not just an app. It's a community of people who understand that recovery isn't linear,
                  that every journey looks different, and that sometimes the most powerful thing we can do is simply listen
                  with compassion and be present for one another.
                </p>
              </div>
            </div>

            {/* How It Works */}
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-rb-dark mb-8 text-center">
                How It Works
              </h2>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-rb-blue-light hover:shadow-2xl hover:border-rb-blue transition-all duration-300 transform hover:-translate-y-2">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    1
                  </div>
                  <h3 className="font-bold text-rb-dark mb-2 text-lg">Create Your Profile</h3>
                  <p className="text-sm text-rb-gray leading-relaxed">
                    Sign up and share what feels comfortable. Choose your role: seeking support or offering it.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-rb-blue-light hover:shadow-2xl hover:border-rb-blue transition-all duration-300 transform hover:-translate-y-2">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    2
                  </div>
                  <h3 className="font-bold text-rb-dark mb-2 text-lg">Connect Safely</h3>
                  <p className="text-sm text-rb-gray leading-relaxed">
                    Match with others in recovery. All conversations are private, encrypted, and confidential.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-rb-blue-light hover:shadow-2xl hover:border-rb-blue transition-all duration-300 transform hover:-translate-y-2">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    3
                  </div>
                  <h3 className="font-bold text-rb-dark mb-2 text-lg">Build Community</h3>
                  <p className="text-sm text-rb-gray leading-relaxed">
                    Share your journey, listen to others, and find the connection that supports your recovery.
                  </p>
                </div>
              </div>
            </div>

            {/* Value Propositions */}
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-rb-blue-light hover:shadow-xl hover:border-rb-blue transition-all transform hover:scale-105">
                <div className="text-5xl mb-4" role="img" aria-label="Handshake">🤝</div>
                <h3 className="font-bold text-rb-dark mb-2 text-lg">Peer Support</h3>
                <p className="text-sm text-rb-gray leading-relaxed">
                  Connect with others who understand your journey
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-rb-blue-light hover:shadow-xl hover:border-rb-blue transition-all transform hover:scale-105">
                <div className="text-5xl mb-4" role="img" aria-label="Lock">🔒</div>
                <h3 className="font-bold text-rb-dark mb-2 text-lg">Private & Safe</h3>
                <p className="text-sm text-rb-gray leading-relaxed">
                  Encrypted conversations in a confidential space
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-rb-blue-light hover:shadow-xl hover:border-rb-blue transition-all transform hover:scale-105">
                <div className="text-5xl mb-4" role="img" aria-label="Green heart">💚</div>
                <h3 className="font-bold text-rb-dark mb-2 text-lg">Always Available</h3>
                <p className="text-sm text-rb-gray leading-relaxed">
                  Find support when you need it, day or night
                </p>
              </div>
            </div>

            {/* Who We Serve */}
            <div className="max-w-3xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-rb-dark mb-6 text-center">
                Who RecoveryBridge Serves
              </h2>
              <div className="bg-gradient-to-br from-white to-rb-blue-light rounded-2xl p-8 shadow-lg border-2 border-rb-blue-light">
                <ul className="space-y-8">
                  <li className="flex flex-col items-center text-center">
                    <span className="text-5xl mb-3" role="img" aria-label="Star">🌟</span>
                    <strong className="text-rb-dark mb-2 text-lg">Person in Recovery</strong>
                    <p className="text-sm text-rb-gray leading-relaxed">From substance abuse, behavioral addictions, or any form of recovery journey</p>
                  </li>
                  <div className="border-t border-rb-blue-light"></div>
                  <li className="flex flex-col items-center text-center">
                    <span className="text-5xl mb-3" role="img" aria-label="Handshake">🤝</span>
                    <strong className="text-rb-dark mb-2 text-lg">Allies in Long-Term Recovery</strong>
                    <p className="text-sm text-rb-gray leading-relaxed">Professional advocates giving back by offering support to others on their journey</p>
                  </li>
                </ul>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="inline-flex flex-wrap items-center justify-center gap-4 text-sm text-rb-gray mb-8 bg-white rounded-full px-6 py-3 shadow-md border border-rb-blue-light">
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label="Lock">🔒</span>
                <span className="font-semibold">End-to-end encrypted</span>
              </div>
              <span className="hidden sm:inline text-rb-gray">•</span>
              <div className="flex items-center gap-2">
                <span className="text-base" role="img" aria-label="Checkmark">✓</span>
                <span className="font-semibold">Always confidential</span>
              </div>
            </div>

            {/* Important Notice */}
            {/* Stories Section */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-gradient-to-br from-[#E8EEF2] to-white rounded-2xl p-8 border border-[#C8D8E4] shadow-lg text-center">
                <div className="text-5xl mb-4">📖</div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#2D3436] mb-2">Stories from the Community</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-md mx-auto">
                  Read stories of hope, resilience, and recovery written by people in our community.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="https://stories.recoverybridge.app"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5A7A8C] text-white font-semibold rounded-full hover:bg-[#4A6A7C] transition shadow-md text-sm"
                  >
                    Read Stories →
                  </a>
                  <a
                    href="https://stories.recoverybridge.app/new"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#5A7A8C] text-[#5A7A8C] font-semibold rounded-full hover:bg-[#5A7A8C]/5 transition text-sm"
                  >
                    ✍️ Share Your Story
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-2 border-orange-300 rounded-2xl p-6 max-w-2xl mx-auto shadow-md">
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                <strong className="text-slate-600 text-base">Important:</strong> RecoveryBridge provides peer support, not professional therapy or crisis intervention.
              </p>
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-slate-600 leading-relaxed">
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
