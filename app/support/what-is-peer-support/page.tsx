import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

// SEO landing page for the "what is peer support / peer recovery support" query
// cluster. The ranking pages here are institutional (SAMHSA, academic, health
// systems); the wedge is a warm, consumer-facing explainer that answers the
// question AND gives the reader a way to actually talk to a peer right now.
// Efficacy claims are phrased modestly ("research has found") to stay accurate.

const CANONICAL = 'https://recoverybridge.app/support/what-is-peer-support'

export const metadata: Metadata = {
  title: 'What Is Peer Support in Addiction Recovery?',
  description:
    'Peer support is people with lived experience of recovery helping one another. Learn what it is, why it works, and how to talk to a peer for free on RecoveryBridge.',
  keywords: [
    'what is peer support',
    'peer recovery support',
    'peer support addiction',
    'peer support specialist',
    'lived experience recovery support',
    'peer support vs therapy',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'What Is Peer Support in Addiction Recovery?',
    description:
      'People with lived experience of recovery helping one another. What peer support is, why it works, and how to talk to a peer for free.',
    url: CANONICAL,
    type: 'article',
  },
}

const pageFaqs = [
  {
    q: 'What is peer support?',
    a: 'Peer support is the process of people with similar lived experience sharing understanding and encouragement with one another. In recovery, that means connecting with someone who has faced addiction themselves — not to treat or advise you clinically, but to walk alongside you as an equal who genuinely gets it.',
  },
  {
    q: 'How is peer support different from therapy?',
    a: 'A therapist is a licensed clinician who provides professional treatment. A peer is not a clinician — they offer support grounded in shared experience rather than clinical training. The two can complement each other: many people use peer support alongside therapy, a program, or medication.',
  },
  {
    q: 'Does peer support actually work?',
    a: 'Research has found that peer recovery support is associated with greater engagement in recovery, reduced relapse, and fewer hospitalizations for many people. Being understood by someone who has been there can reduce isolation and shame — two of the biggest drivers of relapse.',
  },
  {
    q: 'How do I talk to a peer on RecoveryBridge?',
    a: 'Create a free, anonymous account and ask for support. A volunteer listener with lived experience in recovery connects with you in a private one-on-one chat — no cost, no appointment, no sales pitch.',
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
    { '@type': 'ListItem', position: 2, name: 'What Is Peer Support', item: CANONICAL },
  ],
}

export default function WhatIsPeerSupportPage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-rb-gray dark:text-gray-400">
          <Link href="/" className="hover:text-rb-blue underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-rb-dark dark:text-gray-200">What Is Peer Support</span>
        </nav>

        <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-4">
          What Is Peer Support in Addiction Recovery?
        </h1>

        <p className="text-lg text-rb-gray dark:text-gray-300 leading-relaxed mb-6">
          Peer support is simple at its heart: <strong>people with lived experience of recovery
          helping one another.</strong> It is not therapy, not a lecture, and not a sales call.
          It is being met by someone who has faced addiction themselves and can say, honestly,
          &ldquo;I have been there too&rdquo; — and mean it.
        </p>

        <div className="mb-10">
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Talk to a peer now — it&apos;s free
          </Link>
        </div>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          What peer support is — and isn&apos;t
        </h2>
        <div className="mb-8 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-2">It is</h3>
            <ul className="space-y-1.5 text-sm text-rb-gray dark:text-gray-300">
              <li>Connection with someone who has recovered or is recovering</li>
              <li>Mutual, judgment-free, and based on shared experience</li>
              <li>A way to feel understood and less alone</li>
              <li>Something you can lean on alongside other support</li>
            </ul>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-base font-semibold text-rb-dark dark:text-gray-100 mb-2">It is not</h3>
            <ul className="space-y-1.5 text-sm text-rb-gray dark:text-gray-300">
              <li>Professional therapy or medical treatment</li>
              <li>Crisis or emergency services</li>
              <li>A program you have to join or steps you must work</li>
              <li>Advice from someone who has never been there</li>
            </ul>
          </div>
        </div>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          Why peer support works
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-4">
          Addiction thrives in isolation and shame. Peer support works because it targets both.
          When the person listening has felt the same cravings, the same 2 a.m. loneliness, the
          same relapse-and-restart, their understanding is not theoretical — and that changes
          what you are willing to say out loud.
        </p>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          Research has found that peer recovery support is associated with greater engagement in
          recovery, reduced relapse, and fewer hospitalizations for many people. It does not
          replace therapy or treatment — it strengthens whatever path you are on by making sure
          you are not walking it alone.
        </p>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          Peer support on RecoveryBridge
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          RecoveryBridge makes peer support immediate and anonymous. Ask for support and a
          volunteer listener with lived experience connects with you in a private one-on-one
          chat — free, any time, no appointment. Every listener completes a safety and
          guidelines orientation first, so you are always talking to someone who chose to show
          up and knows how to hold space for a hard moment.
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
          <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">Experience it for yourself</h2>
          <p className="text-base text-rb-gray dark:text-gray-300 mb-5 max-w-xl mx-auto leading-relaxed">
            The fastest way to understand peer support is to feel it. A listener who gets it is a moment away.
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
          <Link href="/support/supporting-a-loved-one-in-recovery" className="underline hover:text-rb-blue">Supporting a loved one</Link>
        </p>
      </article>

      <Footer />
    </main>
  )
}
