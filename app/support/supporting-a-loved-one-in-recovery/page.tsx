import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

// SEO landing page for the "how to help a loved one in recovery / support
// without enabling" query cluster. Different audience from the rest of the
// cluster — family and friends, not the person in recovery. Two CTAs: point
// your loved one to free peer support, and get support for yourself (allies are
// welcome on RecoveryBridge). Tone is compassionate and non-judgmental toward
// both the reader and the person they love.

const CANONICAL = 'https://recoverybridge.app/support/supporting-a-loved-one-in-recovery'

export const metadata: Metadata = {
  title: 'How to Support a Loved One in Recovery',
  description:
    'How to help someone in addiction recovery without enabling — setting boundaries, caring for yourself, and what actually helps. Plus a free, anonymous place to point them to.',
  keywords: [
    'how to help a loved one in recovery',
    'support someone in recovery without enabling',
    'help family member addiction',
    'supporting a loved one addiction',
    'how to help an addict without enabling',
    'family addiction support',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'How to Support a Loved One in Recovery',
    description:
      'How to help without enabling — boundaries, self-care, and what actually helps — plus a free, anonymous place to point them to.',
    url: CANONICAL,
    type: 'article',
  },
}

const pageFaqs = [
  {
    q: 'What is the difference between supporting and enabling?',
    a: 'Support means offering compassion, encouragement, and honest boundaries. Enabling means shielding someone from the natural consequences of their use — covering for them, funding it, or repeatedly rescuing them. Support helps a person own their recovery; enabling quietly removes their reasons to change.',
  },
  {
    q: 'Should I bring up their substance use?',
    a: 'You can, from a place of care rather than control. Speak to what you see and how you feel ("I love you and I am worried") instead of accusing or ultimatum-ing. You cannot force someone into recovery — but you can stay honest, present, and connected, which keeps the door open.',
  },
  {
    q: 'How do I take care of myself?',
    a: 'Loving someone through addiction is exhausting, and you cannot pour from an empty cup. Set boundaries that protect your own health, and get your own support — groups like Al-Anon and Nar-Anon exist specifically for families and friends. Detaching with love is not giving up; it is staying sane enough to keep showing up.',
  },
  {
    q: 'Can I use RecoveryBridge as a supporter?',
    a: 'Yes. RecoveryBridge welcomes allies — people supporting someone they love — not only people in recovery themselves. You can also simply share it with your loved one as a free, anonymous place to talk to a peer whenever they need one.',
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
    { '@type': 'ListItem', position: 2, name: 'Supporting a Loved One in Recovery', item: CANONICAL },
  ],
}

const dos = [
  ['Listen more than you fix', 'You do not have to solve it. Being heard by someone who is not panicking or lecturing is its own kind of help.'],
  ['Set boundaries, kindly', 'Decide what you will and will not do — and hold it with love, not punishment. Boundaries protect the relationship, not just you.'],
  ['Let them own their recovery', 'You cannot do the work for them. Stepping back so they become the stakeholder in their own recovery is support, not abandonment.'],
  ['Encourage connection', 'Isolation feeds addiction. Gently encourage the people, meetings, or peers that keep them connected — including a free peer to talk to any time.'],
  ['Take care of yourself', 'Your wellbeing matters too. Your own support (like Al-Anon or Nar-Anon) is not a luxury — it is what lets you keep showing up.'],
]

export default function SupportingLovedOnePage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-rb-gray dark:text-gray-400">
          <Link href="/" className="hover:text-rb-blue underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-rb-dark dark:text-gray-200">Supporting a Loved One</span>
        </nav>

        <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-4">
          How to Support a Loved One in Recovery
        </h1>

        <p className="text-lg text-rb-gray dark:text-gray-300 leading-relaxed mb-6">
          Loving someone through addiction is one of the hardest things a person can do. You
          want to help — but the line between helping and enabling can be painfully hard to see,
          and you cannot do the recovery for them. What you <em>can</em> do is stay honest,
          connected, and steady, while protecting your own wellbeing. That balance is the whole
          work, and it is worth learning.
        </p>

        {/* Light safety note */}
        <aside
          role="note"
          className="mb-10 rounded-xl border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-900 dark:text-red-200"
        >
          If your loved one is in immediate danger or at risk of overdose, call{' '}
          <a href="tel:911" className="underline font-semibold">911</a>. For 24/7 support, <a href="sms:988" className="underline font-semibold">text</a> or <a href="tel:988" className="underline font-semibold">call</a> 988. RecoveryBridge
          is peer support, not emergency or medical care.
        </aside>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          Support vs. enabling
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          Support offers compassion, encouragement, and honest boundaries. Enabling shields your
          loved one from the consequences of their use — covering for them, funding it, or
          rescuing them again and again. The difference is not about how much you love them; it
          is about whether your help leaves them room to take ownership of their own recovery.
          Enabling comes from love too — which is exactly why it is so easy to slip into.
        </p>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-4">
          What actually helps
        </h2>
        <div className="mb-10 space-y-3">
          {dos.map(([title, desc]) => (
            <div key={title} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-1">{title}</h3>
              <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Dual CTA — share it with them, and support for the reader */}
        <div className="mb-10 rounded-2xl bg-rb-blue/10 dark:bg-gray-800 border border-rb-blue-light dark:border-gray-700 p-6 sm:p-8 text-center">
          <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">Give them a place to turn</h2>
          <p className="text-base text-rb-gray dark:text-gray-300 mb-5 max-w-xl mx-auto leading-relaxed">
            Sometimes the most powerful thing you can offer is a door. RecoveryBridge is a free,
            anonymous place for your loved one to talk to a peer who has been there — and allies
            like you are welcome here too.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get started — it&apos;s free
          </Link>
        </div>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          Do not forget yourself
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          You cannot pour from an empty cup. The people who support a loved one best are the ones
          who also protect their own health — through boundaries, rest, and their own support
          network. Groups like Al-Anon and Nar-Anon exist specifically for families and friends,
          and there is no shame in needing them. Detaching with love is not giving up on someone;
          it is staying whole enough to keep loving them well.
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

        <p className="text-sm text-rb-gray dark:text-gray-400">
          Related:{' '}
          <Link href="/support/talk-to-someone-in-recovery" className="underline hover:text-rb-blue">Talk to someone in recovery</Link>
          {' · '}
          <Link href="/support/what-is-peer-support" className="underline hover:text-rb-blue">What is peer support</Link>
          {' · '}
          <Link href="/safety" className="underline hover:text-rb-blue">How we keep support safe</Link>
        </p>
      </article>

      <Footer />
    </main>
  )
}
