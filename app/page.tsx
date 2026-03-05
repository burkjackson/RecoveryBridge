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
                  Recovery is hard. Some days are harder than others. RecoveryBridge is a <strong>peer-to-peer support platform</strong> built for the moments when you need to connect to someone who truly gets it—not a hotline, not a therapist, but a real person who has walked a similar road in their own recovery and is ready to listen.
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
              <h2 className="text-2xl sm:text-3xl font-bold text-rb-dark mb-3 text-center">
                How It Works
              </h2>
              <p className="text-base text-rb-gray text-center mb-8 max-w-2xl mx-auto leading-relaxed">
                RecoveryBridge connects people who need support with volunteer listeners—in real time, through private one-on-one chat. No appointments. No waiting rooms. Just a real person, ready to listen.
              </p>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-rb-blue-light hover:shadow-2xl hover:border-rb-blue transition-all duration-300 transform hover:-translate-y-2">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    1
                  </div>
                  <h3 className="font-bold text-rb-dark mb-2 text-lg">Ask for Support</h3>
                  <p className="text-sm text-rb-gray leading-relaxed">
                    When you need to connect, tap "I Need Support." Available listeners are notified instantly—no waiting, no scheduling.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-rb-blue-light hover:shadow-2xl hover:border-rb-blue transition-all duration-300 transform hover:-translate-y-2">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    2
                  </div>
                  <h3 className="font-bold text-rb-dark mb-2 text-lg">A Listener Shows Up</h3>
                  <p className="text-sm text-rb-gray leading-relaxed">
                    A volunteer listener accepts and a private, one-on-one chat begins. No audience. No records shared. Just the two of you.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-rb-blue-light hover:shadow-2xl hover:border-rb-blue transition-all duration-300 transform hover:-translate-y-2">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                    3
                  </div>
                  <h3 className="font-bold text-rb-dark mb-2 text-lg">Talk Freely</h3>
                  <p className="text-sm text-rb-gray leading-relaxed">
                    Share what's on your mind—no judgment, no pressure. Your listener is here because they've been there too.
                  </p>
                </div>
              </div>
            </div>

            {/* Become a Listener CTA */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-gradient-to-br from-rb-blue to-rb-blue-dark rounded-2xl p-8 shadow-xl text-center">
                <div className="text-5xl mb-4">🎧</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Are You in Long-Term Recovery?
                </h2>
                <p className="text-base text-white/90 leading-relaxed mb-3 max-w-xl mx-auto">
                  We're looking for volunteers who want to give back. As a listener, you show up for people in their hardest moments—not as a counselor, but as someone who genuinely understands.
                </p>
                <p className="text-sm text-white/75 leading-relaxed mb-6 max-w-xl mx-auto">
                  You choose when you're available. You decide when to step away. And the impact you make is real.
                </p>
                <button
                  onClick={() => router.push('/signup')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-rb-blue font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 text-base"
                >
                  Become a Listener →
                </button>
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

            {/* Social */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <a
                href="https://www.facebook.com/ARecoveryBridge/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow RecoveryBridge on Facebook"
                className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md border border-rb-blue-light hover:shadow-lg hover:border-rb-blue transition-all duration-200 text-rb-gray hover:text-rb-blue"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#1877F2]" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="font-semibold text-sm">Facebook</span>
              </a>
              <a
                href="https://www.instagram.com/recoverybridge.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow RecoveryBridge on Instagram"
                className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md border border-rb-blue-light hover:shadow-lg hover:border-rb-blue transition-all duration-200 text-rb-gray hover:text-rb-blue"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E1306C]" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="font-semibold text-sm">Instagram</span>
              </a>
              <a
                href="https://www.threads.com/@recoverybridge.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow RecoveryBridge on Threads"
                className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full shadow-md border border-rb-blue-light hover:shadow-lg hover:border-rb-blue transition-all duration-200 text-rb-gray hover:text-rb-blue"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="currentColor" className="w-5 h-5 text-rb-dark" aria-hidden="true">
                  <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.898-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.643 32.788 28.094 19.882 44.634 13.224 67.399 13.001 95.932v.136c.223 28.533 6.88 51.299 19.787 67.839 14.504 18.451 36.094 27.899 64.199 28.094h.113c24.94-.169 42.503-6.715 57.013-21.208 18.963-18.944 18.392-42.631 12.157-57.157-4.531-10.556-13.228-19.079-24.733-24.708z"/>
                  <path d="M96.764 122.16c-10.964 0-19.578-2.886-25.095-8.35-4.179-4.136-6.298-9.614-6.124-15.802.365-12.809 10.265-21.638 25.57-22.499 8.923-.514 16.954.228 24.006 2.202a84.45 84.45 0 0 1 2.64.822c-.69 8.166-2.817 14.455-6.33 18.755-4.424 5.395-10.898 8.12-19.667 8.872z"/>
                </svg>
                <span className="font-semibold text-sm">Threads</span>
              </a>
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
