import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

// Hub page for the /support content cluster. Ties the five spoke pages together
// into a recognized topic cluster (a ranking signal), gives each spoke an
// inbound link from a single indexable page, and is itself linked sitewide from
// the footer.

const CANONICAL = 'https://recoverybridge.app/support'

export const metadata: Metadata = {
  title: 'Get Support — Free, Anonymous Help for Addiction Recovery',
  description:
    'Free, anonymous peer support for addiction recovery. Talk to someone who has been there, get through a craving, find help for any path, or support a loved one.',
  keywords: [
    'addiction recovery support',
    'free recovery support',
    'peer support addiction',
    'online addiction help',
    'anonymous recovery support',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Get Support — Free, Anonymous Help for Addiction Recovery',
    description:
      'Talk to someone who has been there, get through a craving, find help for any path, or support a loved one — free and anonymous.',
    url: CANONICAL,
    type: 'website',
  },
}

const spokes = [
  {
    href: '/support/talk-to-someone-in-recovery',
    title: 'Talk to someone in recovery',
    blurb: 'Connect free and anonymously with a real person who has walked a similar road — no cost, no appointment, no sales pitch.',
  },
  {
    href: '/support/recovery-chat',
    title: 'Free recovery chat',
    blurb: 'A private, one-on-one recovery chat with a real peer — free and anonymous, any time, no bots and no sales line.',
  },
  {
    href: '/support/what-to-do-when-you-want-to-use',
    title: 'When you want to use again',
    blurb: 'A craving is not failure — and it will pass. Simple, proven ways to get through the urge right now, with someone beside you.',
  },
  {
    href: '/support/recovery-support-without-aa',
    title: 'Recovery support without AA',
    blurb: 'No steps to work, no higher power required. Free peer support for any path — 12-step, secular, medication-assisted, or your own.',
  },
  {
    href: '/support/what-is-peer-support',
    title: 'What is peer support?',
    blurb: 'People with lived experience of recovery helping one another. What it is, why it works, and how to try it for yourself.',
  },
  {
    href: '/support/supporting-a-loved-one-in-recovery',
    title: 'Supporting a loved one',
    blurb: 'How to help someone in recovery without enabling — boundaries, self-care, and a free place to point them to.',
  },
]

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://recoverybridge.app' },
    { '@type': 'ListItem', position: 2, name: 'Get Support', item: CANONICAL },
  ],
}

// ItemList ties the spokes together as a curated collection for search engines.
const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: spokes.map((s, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: s.title,
    url: `https://recoverybridge.app${s.href}`,
  })),
}

export default function SupportHubPage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-rb-gray dark:text-gray-400">
          <Link href="/" className="hover:text-rb-blue underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-rb-dark dark:text-gray-200">Get Support</span>
        </nav>

        <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-4">
          Get Support
        </h1>

        <p className="text-lg text-rb-gray dark:text-gray-300 leading-relaxed mb-8 max-w-2xl">
          Wherever you are with recovery, you do not have to face it alone. RecoveryBridge is
          <strong> free, anonymous peer support</strong> — a real person who has been there,
          ready to listen. Start with whatever fits your moment.
        </p>

        <div className="mb-10">
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Connect with a listener — it&apos;s free
          </Link>
        </div>

        {/* Crisis note */}
        <aside
          role="note"
          className="mb-10 rounded-xl border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-900 dark:text-red-200"
        >
          RecoveryBridge is peer support, not emergency or medical care. In a crisis, call or
          text <a href="tel:988" className="underline font-semibold">988</a>, text{' '}
          <strong>HOME</strong> to <a href="sms:741741" className="underline font-semibold">741741</a>,
          or call <a href="tel:911" className="underline font-semibold">911</a>.
        </aside>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-4">Explore support</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {spokes.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="block rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-rb-blue transition-all"
            >
              <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-1">{s.title} →</h3>
              <p className="text-sm text-rb-gray dark:text-gray-300 leading-relaxed">{s.blurb}</p>
            </Link>
          ))}
        </div>

        <p className="text-sm text-rb-gray dark:text-gray-400">
          New here?{' '}
          <Link href="/" className="underline hover:text-rb-blue">Learn how RecoveryBridge works</Link>
          {' · '}
          <Link href="/safety" className="underline hover:text-rb-blue">How we keep support safe</Link>
        </p>
      </div>

      <Footer />
    </main>
  )
}
