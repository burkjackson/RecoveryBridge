import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

// SEO landing page for the in-the-moment craving / relapse-urge query cluster
// ("what to do when you want to use", "urge to relapse", "how to get through a
// craving"). This is the most safety-sensitive page on the site: someone may
// land here in an acute moment, so crisis resources lead, the coping guidance
// is evidence-based and non-shaming, and the page is explicit that this is peer
// support — not medical care, treatment, or emergency services.

const CANONICAL = 'https://recoverybridge.app/support/what-to-do-when-you-want-to-use'

export const metadata: Metadata = {
  title: 'What to Do When You Want to Use Again',
  description:
    'A craving is not failure — and it will pass. Simple, proven ways to get through the urge to use right now, plus a free, anonymous peer who has been there to talk you through it.',
  keywords: [
    'what to do when you want to use',
    'urge to relapse',
    'how to get through a craving',
    'craving relapse help',
    'want to use again',
    'relapse prevention peer support',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'What to Do When You Want to Use Again',
    description:
      'A craving is not failure — and it will pass. Proven ways to get through the urge right now, plus a peer who has been there.',
    url: CANONICAL,
    type: 'article',
  },
}

const pageFaqs = [
  {
    q: 'How long does a craving usually last?',
    a: 'Cravings tend to peak and then fade, often within about 20 to 30 minutes, even though they can feel like they will last forever. Your goal is not to fight the urge down — it is simply to get through the next block of time until the wave passes.',
  },
  {
    q: 'Does wanting to use mean I am failing at recovery?',
    a: 'No. Cravings are a normal, expected part of recovery, not a sign that you are doing it wrong or that you have already lost. What matters is what you do next — and reaching out for support in this moment is exactly the right move.',
  },
  {
    q: 'What if I already used?',
    a: 'A return to use does not erase your progress or your worth, and it is not the end of your recovery. Be honest with yourself, get somewhere safe, and reach out to someone rather than facing it alone. If you are in physical danger, call 911. If you may be at risk of overdose, do not use alone.',
  },
  {
    q: 'Can talking to a peer really help in the moment?',
    a: 'Often, yes. Riding out a craving is far easier when you are not doing it alone. A peer who has felt the same pull can help you stay in the moment, talk it through, and let the wave pass — no judgment, no lecture.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: pageFaqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://recoverybridge.app' },
    { '@type': 'ListItem', position: 2, name: 'What to Do When You Want to Use', item: CANONICAL },
  ],
}

const steps = [
  {
    h: 'Reach out — do not ride it out alone',
    p: 'The single most protective thing you can do is not be alone with the urge. Message a peer here, call your sponsor or a trusted friend, or text a support line. Saying it out loud to someone takes away a lot of its power.',
  },
  {
    h: 'Surf the urge instead of fighting it',
    p: 'Picture the craving as a wave: it rises, crests, and falls. You do not have to make it stop — just notice it, breathe, and let it move through you. It will crest and come down, usually within 20 to 30 minutes.',
  },
  {
    h: 'Ground yourself: 5-4-3-2-1',
    p: 'Name 5 things you can see, 4 you can hear, 3 you can touch, 2 you can smell, and 1 you can taste. This pulls your mind out of the craving and back into the present moment.',
  },
  {
    h: 'Play the tape all the way through',
    p: 'Do not stop at the first drink or first use. Follow it forward — an hour later, tomorrow morning, the fallout. Cravings sell you the first five minutes and hide the rest. Watch the whole tape.',
  },
  {
    h: 'Check your HALT',
    p: 'Are you Hungry, Angry, Lonely, or Tired? Cravings get loud when a basic need is unmet. Eat something, step outside, message someone, or rest — treat the real need underneath the urge.',
  },
  {
    h: 'Change your surroundings',
    p: 'Leave the room, go for a walk, put physical distance between you and whatever is fueling the urge. A change of environment can break the moment’s grip.',
  },
]

export default function WhatToDoPage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-rb-gray dark:text-gray-400">
          <Link href="/" className="hover:text-rb-blue underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-rb-dark dark:text-gray-200">What to Do When You Want to Use</span>
        </nav>

        <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-4">
          What to Do When You Want to Use Again
        </h1>

        <p className="text-lg text-rb-gray dark:text-gray-300 leading-relaxed mb-6">
          If the urge is loud right now, start here: <strong>a craving is not failure, and it
          will pass.</strong> It feels permanent, but it is a wave — it rises, crests, and comes
          back down, usually within about 20 to 30 minutes. You do not have to win a fight with
          it. You just have to get through the next little while, and you do not have to do that
          alone.
        </p>

        {/* Emergency callout — first thing, given the acute moment */}
        <aside
          role="note"
          className="mb-10 rounded-xl border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-900 dark:text-red-200"
        >
          <strong className="font-semibold">If you are in danger right now:</strong> call{' '}
          <a href="tel:911" className="underline font-semibold">911</a>. To reach a trained
          counselor 24/7,{' '}
          <a href="sms:988" className="underline font-semibold">text</a> or <a href="tel:988" className="underline font-semibold">call</a> 988 (Suicide &amp; Crisis
          Lifeline) or text <strong>HOME</strong> to{' '}
          <a href="sms:741741?&body=HOME" className="underline font-semibold">741741</a>. If you may be at
          risk of overdose, please do not use alone. RecoveryBridge is peer support, not
          emergency or medical care.
        </aside>

        {/* Immediate CTA — the fastest path to a person */}
        <div className="mb-10 rounded-2xl bg-rb-blue/10 dark:bg-gray-800 border border-rb-blue-light dark:border-gray-700 p-6 text-center">
          <p className="text-base text-rb-dark dark:text-gray-100 font-semibold mb-4">
            You do not have to get through this next hour by yourself.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Talk to someone who’s been there — free
          </Link>
        </div>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-4">
          Six things to try right now
        </h2>
        <div className="mb-10 space-y-4">
          {steps.map((s, i) => (
            <div key={s.h} className="flex gap-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-rb-blue text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
              <div>
                <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-1">{s.h}</h3>
                <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">{s.p}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          A craving is information, not a verdict
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          Wanting to use does not mean you are weak or that your recovery is broken. Cravings
          are your brain and body reacting to stress, a memory, a place, a feeling — old wiring
          doing what it learned to do. Noticing the urge and reaching out instead of acting on
          it is not the moment you failed. It is recovery, happening in real time.
        </p>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          If you already used
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          A return to use does not erase the work you have done, and it does not make you a lost
          cause. Get somewhere safe, be honest with yourself, and tell someone rather than
          disappearing into shame — shame is what keeps a slip from becoming a spiral. You can
          start again from right now. Reaching out is the first step back, and there is someone
          here ready to take it with you.
        </p>

        {/* FAQ */}
        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-4">Common questions</h2>
        <div className="mb-10 divide-y divide-gray-200 dark:divide-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {pageFaqs.map((f) => (
            <div key={f.q} className="px-5 py-4">
              <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-1">{f.q}</h3>
              <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        {/* Closing CTA */}
        <div className="rounded-2xl bg-rb-blue/10 dark:bg-gray-800 border border-rb-blue-light dark:border-gray-700 p-6 sm:p-8 text-center mb-8">
          <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">Ride the wave with someone beside you</h2>
          <p className="text-base text-rb-gray dark:text-gray-300 mb-5 max-w-xl mx-auto leading-relaxed">
            Free, anonymous, and available now — a real person in recovery who understands exactly what this moment feels like.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get started — it&apos;s free
          </Link>
        </div>

        <p className="text-sm text-rb-gray dark:text-gray-400">
          Related:{' '}
          <Link href="/support/talk-to-someone-in-recovery" className="underline hover:text-rb-blue">Talk to someone in recovery</Link>
          {' · '}
          <Link href="/support/recovery-support-without-aa" className="underline hover:text-rb-blue">Recovery support without AA</Link>
          {' · '}
          <Link href="/safety" className="underline hover:text-rb-blue">How we keep support safe</Link>
        </p>
      </article>

      <Footer />
    </main>
  )
}
