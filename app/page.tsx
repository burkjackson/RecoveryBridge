import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Footer from '@/components/Footer'
import ProductPreview from '@/components/ProductPreview'
import FaqAccordion from '@/components/FaqAccordion'

export const metadata: Metadata = {
  title: 'RecoveryBridge — Free Peer Support for Addiction Recovery',
  description: 'Connect anonymously with volunteer listeners who truly understand recovery. Free, private, peer-to-peer chat support available 24/7. No appointments. No waiting rooms.',
  keywords: ['addiction recovery support', 'peer support app', 'online recovery support', 'substance abuse support', 'free recovery chat', 'anonymous recovery support', 'peer-to-peer support', 'recovery community'],
  alternates: {
    canonical: 'https://recoverybridge.app',
  },
  openGraph: {
    title: 'RecoveryBridge — Free Peer Support for Addiction Recovery',
    description: 'Connect anonymously with volunteer listeners who truly understand recovery. Free, private, peer-to-peer support available 24/7.',
    url: 'https://recoverybridge.app',
    siteName: 'RecoveryBridge',
    images: [
      {
        url: 'https://recoverybridge.app/logo-with-text.png',
        width: 1280,
        height: 609,
        alt: 'RecoveryBridge — Free Peer Support for Addiction Recovery',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RecoveryBridge — Free Peer Support for Addiction Recovery',
    description: 'Connect anonymously with volunteer listeners who truly understand recovery. Free, private, peer-to-peer support available 24/7.',
    images: ['https://recoverybridge.app/logo-with-text.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'RecoveryBridge',
  url: 'https://recoverybridge.app',
  description: 'Free peer-to-peer support platform for people in addiction recovery. Connect anonymously with volunteer listeners 24/7.',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web, iOS, Android',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  provider: {
    '@type': 'Organization',
    name: 'RecoveryBridge LLC',
    url: 'https://recoverybridge.app',
    sameAs: [
      'https://www.facebook.com/ARecoveryBridge/',
      'https://www.instagram.com/recoverybridge.app',
      'https://www.threads.com/@recoverybridge.app',
    ],
  },
  featureList: [
    'Anonymous peer-to-peer chat',
    'Real-time listener matching',
    'Push notifications',
    'No appointments required',
    'Available 24/7',
    'Free to use',
  ],
}

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-gradient-to-br from-rb-blue-light via-rb-purple-light to-rb-blue-light dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 animate-gradient">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top bar */}
      <header className="w-full flex justify-end px-4 sm:px-6 pt-4">
        <Link
          href="/donate"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-bold text-rb-blue border-2 border-rb-blue/40 bg-white/70 dark:bg-gray-800/70 dark:text-blue-300 dark:border-blue-400/40 hover:bg-rb-blue hover:text-white hover:border-rb-blue dark:hover:bg-rb-blue dark:hover:text-white transition-all shadow-sm"
        >
          <span role="img" aria-label="Heart">💙</span>
          Donate
        </Link>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex items-start justify-center pt-10 sm:pt-14 p-4 sm:p-6">
        <div className="max-w-4xl w-full text-center">
          {/* Logo/Title */}
          <div className="mb-8 sm:mb-10">
            <Image
              src="/logo-with-text.png"
              alt="RecoveryBridge"
              width={500}
              height={238}
              priority
              className="mx-auto mb-5 max-w-[90%] h-auto dark:brightness-0 dark:invert"
            />
            <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-2">
              Free Peer Support for Addiction Recovery
            </h1>
            <p className="text-xl sm:text-2xl text-rb-gray dark:text-gray-300 italic mb-4">
              &ldquo;Connection is the antidote to addiction&rdquo;
            </p>
            <p className="text-base sm:text-lg text-rb-gray dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
              Connect with someone who truly gets it — not a hotline, not a therapist, but a real person who has walked a similar road. <strong>Private. Free. Available now.</strong>
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-5">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 text-center"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-white dark:bg-gray-800 border-2 border-rb-gray/30 dark:border-gray-600 text-rb-gray dark:text-gray-300 font-semibold text-base hover:border-rb-blue hover:text-rb-blue dark:hover:text-rb-blue transition-all duration-200 text-center"
            >
              Log In
            </Link>
          </div>

          {/* See the product without bloating the page — opens a popup mock */}
          <ProductPreview />

          {/* Trust strip — above-the-fold promises, right at the decision point */}
          <ul
            aria-label="Our promises to you"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-12"
          >
            <li className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm border border-rb-blue-light dark:border-gray-700 shadow-sm text-sm font-semibold text-rb-dark dark:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-rb-blue dark:text-blue-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              100% free
            </li>
            <li className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm border border-rb-blue-light dark:border-gray-700 shadow-sm text-sm font-semibold text-rb-dark dark:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-rb-blue dark:text-blue-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              No ads
            </li>
            <li className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm border border-rb-blue-light dark:border-gray-700 shadow-sm text-sm font-semibold text-rb-dark dark:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5 text-rb-blue dark:text-blue-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Never sold
            </li>
          </ul>

          {/* How It Works */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-heading-2 text-rb-dark dark:text-gray-100 mb-3 text-center">
              How It Works
            </h2>
            <p className="text-base text-rb-gray dark:text-gray-300 text-center mb-8 max-w-2xl mx-auto leading-relaxed">
              RecoveryBridge connects people who need support with volunteer listeners—in real time, through private one-on-one chat. No appointments. No waiting rooms. Just a real person, ready to listen.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                  1
                </div>
                <h3 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">Ask for Support</h3>
                <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">
                  When you need to connect, tap &ldquo;I Need Support.&rdquo; Available listeners are notified instantly—no waiting, no scheduling.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                  2
                </div>
                <h3 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">A Listener Shows Up</h3>
                <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">
                  A volunteer listener accepts and a private, one-on-one chat begins. No audience. No records shared. Just the two of you.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-rb-blue to-rb-blue-dark text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-md">
                  3
                </div>
                <h3 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">Talk Freely</h3>
                <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">
                  Share what&apos;s on your mind—no judgment, no pressure. Your listener is here because they&apos;ve been there too.
                </p>
              </div>
            </div>
          </div>

          {/* Mission Statement — quiet band, no heavy card */}
          <div className="max-w-2xl mx-auto mb-12 text-center">
            <p className="text-lg sm:text-xl text-rb-dark dark:text-gray-100 leading-relaxed">
              We don&apos;t heal in isolation. RecoveryBridge is a community built on the
              belief that <strong>you are worth saving</strong>—that recovery is stronger
              together, and showing up on the hardest days is an act of bravery.
            </p>
          </div>

          {/* FAQ Accordion */}
          <FaqAccordion />

          {/* Stories Section */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-[#E8EEF2] to-white dark:from-gray-800 dark:to-gray-800 rounded-2xl p-8 border border-[#C8D8E4] dark:border-gray-700 shadow-lg text-center">
              <div className="text-5xl mb-4">📖</div>
              <h2 className="text-heading-2 text-[#2D3436] dark:text-gray-100 mb-2">Stories from the Community</h2>
              <p className="text-sm text-slate-500 dark:text-gray-300 leading-relaxed mb-6 max-w-md mx-auto">
                Read stories of hope, resilience, and recovery written by people in our community.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://blog.recoverybridge.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#5A7A8C] text-white font-semibold rounded-full hover:bg-[#4A6A7C] transition shadow-md text-sm"
                >
                  Read Stories →
                </a>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-heading-2 text-rb-dark dark:text-gray-100 mb-3 text-center">
              Built for Real Life
            </h2>
            <p className="text-base text-rb-gray dark:text-gray-300 text-center mb-8 max-w-2xl mx-auto leading-relaxed">
              RecoveryBridge is designed around the realities of recovery—the unexpected hard moments, the need for privacy, and the power of being truly heard.
            </p>
            <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 text-left flex gap-4 items-start">
                <span className="text-3xl flex-shrink-0" role="img" aria-label="Magnifying glass">🔍</span>
                <div>
                  <h3 className="text-heading-4 text-rb-dark dark:text-gray-100 mb-1">Find the Right Listener</h3>
                  <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">Browse a directory of listeners by specialty—early recovery, relapse prevention, grief, trauma, veterans support, and more. Read their bios and choose someone who resonates with your journey before you even connect.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 text-left flex gap-4 items-start">
                <span className="text-3xl flex-shrink-0" role="img" aria-label="Bell">🔔</span>
                <div>
                  <h3 className="text-heading-4 text-rb-dark dark:text-gray-100 mb-1">Instant Listener Alerts</h3>
                  <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">The moment you ask for support, available listeners are notified in real time—on their phone or computer. If no one connects right away, we keep notifying listeners every couple of minutes until someone shows up.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 text-left flex gap-4 items-start">
                <span className="text-3xl flex-shrink-0" role="img" aria-label="Speech bubble">💬</span>
                <div>
                  <h3 className="text-heading-4 text-rb-dark dark:text-gray-100 mb-1">Real-Time Private Chat</h3>
                  <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">Once connected, you&apos;re in a live one-on-one conversation. Messages appear instantly, just like texting a friend—but with someone who truly understands.</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-rb-blue-light dark:border-gray-700 text-left flex gap-4 items-start">
                <span className="text-3xl flex-shrink-0" role="img" aria-label="Shield">🛡️</span>
                <div>
                  <h3 className="text-heading-4 text-rb-dark dark:text-gray-100 mb-1">Safe &amp; Moderated</h3>
                  <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">Community safety guidelines, user reporting, and an active moderation team keep RecoveryBridge a respectful and supportive space for everyone.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Become a Listener CTA */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-rb-blue to-rb-blue-dark rounded-2xl p-8 shadow-xl text-center">
              <div className="text-5xl mb-4">🎧</div>
              <h2 className="text-heading-2 text-white mb-3">
                Are You in Long-Term Recovery?
              </h2>
              <p className="text-base text-white/90 leading-relaxed mb-3 max-w-xl mx-auto">
                We&apos;re looking for volunteers who want to give back. As a listener, you show up for people in their hardest moments—not as a counselor, but as someone who genuinely understands.
              </p>
              <p className="text-sm text-white/75 leading-relaxed mb-6 max-w-xl mx-auto">
                You choose when you&apos;re available. You decide when to step away. And the impact you make is real.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-rb-blue font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-1 text-base"
              >
                Become a Listener →
              </Link>
            </div>
          </div>

          {/* Repeat primary CTA — closing prompt before social/footer */}
          <div className="flex flex-col items-center gap-3 mb-12">
            <p className="text-lg font-semibold text-rb-dark dark:text-gray-100">Ready when you are.</p>
            <Link
              href="/signup"
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 text-center"
            >
              Get Started — It&apos;s Free
            </Link>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 border-2 border-orange-300 dark:border-orange-700 rounded-2xl p-6 max-w-2xl mx-auto shadow-md">
            <p className="text-sm text-slate-600 dark:text-gray-300 mb-3 leading-relaxed">
              <strong className="text-slate-600 dark:text-gray-300 text-base">Important:</strong> RecoveryBridge provides peer support, not professional therapy or crisis intervention.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">
                If you&apos;re in crisis: <strong className="text-slate-600 dark:text-gray-300">Call 988</strong> (Suicide &amp; Crisis Lifeline) or <strong className="text-slate-600 dark:text-gray-300">Text HOME to 741741</strong> (Crisis Text Line)
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
