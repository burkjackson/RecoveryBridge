import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

// SEO landing page for the "alternative to AA / non-12-step / recovery without
// AA" query cluster. RecoveryBridge is path-agnostic peer support, which is the
// honest differentiator here — but the tone stays inclusive rather than
// anti-AA, since many people value the 12 steps. The page positions RB as
// support for any path, including alongside AA.

const CANONICAL = 'https://recoverybridge.app/support/recovery-support-without-aa'

export const metadata: Metadata = {
  title: 'Recovery Support Without AA — or Alongside It',
  description:
    'You do not have to work the 12 steps or believe in a higher power to get support. RecoveryBridge is free, anonymous peer support for any path to recovery — with or without AA.',
  keywords: [
    'recovery support without AA',
    'alternative to AA',
    'non 12 step recovery support',
    'recovery without a higher power',
    'secular recovery support',
    'peer support any path',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Recovery Support Without AA — or Alongside It',
    description:
      'Free, anonymous peer support for any path to recovery — 12-step, secular, medication-assisted, moderation, or your own way.',
    url: CANONICAL,
    type: 'article',
  },
}

const pageFaqs = [
  {
    q: 'Do I have to work the 12 steps to use RecoveryBridge?',
    a: 'No. There are no steps, no sponsor requirement, and no program to follow. RecoveryBridge is peer support — a real person to talk to, whenever you need one — not a method you have to adopt.',
  },
  {
    q: 'Do I need to believe in a higher power or God?',
    a: 'No. RecoveryBridge is fully secular and welcomes people of every belief and none. Your recovery does not have to look spiritual to be real, and it does not have to look any particular way to belong here.',
  },
  {
    q: 'Is RecoveryBridge anti-AA?',
    a: 'Not at all. Many people find life in the rooms of AA or NA, and if that is your path, we are for you too. RecoveryBridge simply does not require it. Plenty of members use us alongside a 12-step program — for the moments between meetings.',
  },
  {
    q: 'What if I am on medication-assisted treatment (MAT) or practicing moderation?',
    a: 'You are welcome. Whether you use methadone or buprenorphine, are cutting back rather than quitting entirely, or follow SMART, LifeRing, or your own plan — this is judgment-free peer support for wherever you actually are.',
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
    { '@type': 'ListItem', position: 2, name: 'Recovery Support Without AA', item: CANONICAL },
  ],
}

const paths = [
  ['12-step (AA / NA)', 'If the rooms are your home, we are here for the moments between meetings.'],
  ['Secular & evidence-based', 'SMART Recovery, LifeRing, CBT-based tools — recovery grounded in science, not a higher power.'],
  ['Medication-assisted (MAT)', 'Methadone, buprenorphine, naltrexone — medication is a valid, respected path.'],
  ['Moderation', 'Cutting back rather than quitting outright is still worth support.'],
  ['Faith-based', 'If your faith carries your recovery, that is welcome here too.'],
  ['Your own blend', 'Most people mix approaches. Yours does not have to fit a label.'],
]

export default function WithoutAaPage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-rb-gray dark:text-gray-400">
          <Link href="/" className="hover:text-rb-blue underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-rb-dark dark:text-gray-200">Recovery Support Without AA</span>
        </nav>

        <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-4">
          Recovery Support Without AA — or Alongside It
        </h1>

        <p className="text-lg text-rb-gray dark:text-gray-300 leading-relaxed mb-6">
          The 12 steps help a lot of people — and they are not the only way. If meetings,
          sponsors, or the idea of a higher power have never quite fit, that does not mean you
          are out of options. RecoveryBridge is <strong>free, anonymous peer support for any
          path to recovery</strong> — no steps to work, no program to join, no belief required.
          Just a real person who gets it, whenever you need one.
        </p>

        <div className="mb-10">
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Find support your way — it&apos;s free
          </Link>
        </div>

        {/* Light safety note — less acute than the craving page, but present */}
        <aside
          role="note"
          className="mb-10 rounded-xl border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-900 dark:text-red-200"
        >
          RecoveryBridge is peer support, not treatment or emergency care. In a crisis, call or
          text <a href="sms:988" className="underline font-semibold">988</a>, text{' '}
          <strong>HOME</strong> to <a href="sms:741741" className="underline font-semibold">741741</a>,
          or call <a href="tel:911" className="underline font-semibold">911</a>.
        </aside>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          You do not have to work the steps to belong here
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          Some people thrive with the structure of a 12-step program. Others bounce off the
          language of powerlessness, the higher-power framing, or the meeting format — and then
          feel like there is nowhere left to turn. There is. Research has found that secular and
          alternative approaches can be just as effective as AA for the people they fit. What
          matters is that you are connected to someone who understands — not which method you
          picked.
        </p>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-4">
          Whatever path you are on, you are welcome
        </h2>
        <div className="mb-10 grid sm:grid-cols-2 gap-3">
          {paths.map(([title, desc]) => (
            <div key={title} className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-1">{title}</h3>
              <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          Support between the meetings
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          A program meets on a schedule. Cravings, spirals, and 2 a.m. loneliness do not.
          RecoveryBridge fills the gap that any structured program leaves: one-on-one peer
          support in real time, whenever you reach for it — with or without a program in your
          life. Use it on its own, or use it alongside AA, SMART, therapy, or MAT. There is no
          wrong way to reach out.
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
          <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">Recovery on your terms</h2>
          <p className="text-base text-rb-gray dark:text-gray-300 mb-5 max-w-xl mx-auto leading-relaxed">
            Free, anonymous peer support that meets you where you actually are — no steps, no dogma, no judgment.
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
          <Link href="/support/what-to-do-when-you-want-to-use" className="underline hover:text-rb-blue">When you want to use again</Link>
          {' · '}
          <Link href="/safety" className="underline hover:text-rb-blue">How we keep support safe</Link>
        </p>
      </article>

      <Footer />
    </main>
  )
}
