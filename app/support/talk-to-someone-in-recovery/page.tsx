import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

// SEO landing page (server component so the content ships in the initial HTML).
// Targets the high-intent "free / someone to talk to about addiction" query
// cluster, where the SERPs are dominated by rehab-admission funnels — the wedge
// is that RecoveryBridge is genuinely free, anonymous, peer-run, and not a sales
// line to treatment. YMYL-safe: crisis resources sit near the top and the page
// is explicit that this is peer support, not medical or emergency care.

const CANONICAL = 'https://recoverybridge.app/support/talk-to-someone-in-recovery'

export const metadata: Metadata = {
  title: 'Talk to Someone in Recovery — Free, Anonymous Peer Support',
  description:
    'Need someone to talk to about addiction? Connect free and anonymously with a real person in recovery who has been there — no cost, no appointment, no sales pitch. Available 24/7.',
  keywords: [
    'someone to talk to about addiction',
    'free addiction recovery chat',
    'talk to someone in recovery',
    'anonymous addiction support',
    'free peer support addiction',
    'online recovery support',
  ],
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Talk to Someone in Recovery — Free, Anonymous Peer Support',
    description:
      'Connect free and anonymously with a real person in recovery who gets it — no cost, no appointment, no sales pitch. Available 24/7.',
    url: CANONICAL,
    type: 'article',
  },
}

// Page-specific FAQ — drives the FAQPage rich result and answers the exact
// objections people carry into these searches ("is it really free?", "is this
// a rehab ad?").
const pageFaqs = [
  {
    q: 'Is it really free to talk to someone?',
    a: 'Yes — completely. RecoveryBridge is free, ad-free, and donation-supported. There is no cost, no subscription, and no upsell to paid treatment. Many "free addiction chat" services are actually run by rehab centers to book admissions; this is not that.',
  },
  {
    q: 'Who will I be talking to?',
    a: 'A trained peer — a real person with lived experience in recovery, not a therapist, salesperson, or bot. Every listener completes a safety and guidelines orientation before connecting with anyone.',
  },
  {
    q: 'Is it anonymous?',
    a: 'Yes. You choose a display name — no real name, phone number, or identifying information required. Your conversation is private and visible only to you and the person you are speaking with. We never sell your data.',
  },
  {
    q: 'Do I need to be sober or in a program to use it?',
    a: 'No. You do not need to be sober, "doing it right," or part of any 12-step or treatment program. Whether you are questioning your use, newly sober, years in, or in a hard moment right now — you are welcome exactly as you are.',
  },
  {
    q: 'Is this the same as crisis or emergency help?',
    a: 'No. RecoveryBridge is peer support, not emergency services, therapy, or crisis intervention. If you are in immediate danger or thinking about harming yourself, text or call 988 (Suicide & Crisis Lifeline), text HOME to 741741, or call 911.',
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
    { '@type': 'ListItem', position: 2, name: 'Talk to Someone in Recovery', item: CANONICAL },
  ],
}

export default function TalkToSomeonePage() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <article className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-rb-gray dark:text-gray-400">
          <Link href="/" className="hover:text-rb-blue underline">Home</Link>
          <span className="mx-2" aria-hidden="true">/</span>
          <span className="text-rb-dark dark:text-gray-200">Talk to Someone in Recovery</span>
        </nav>

        <h1 className="text-heading-2 sm:text-heading-1 text-rb-dark dark:text-gray-100 mb-4">
          Talk to Someone in Recovery — Free and Anonymous
        </h1>

        <p className="text-lg text-rb-gray dark:text-gray-300 leading-relaxed mb-6">
          Sometimes you just need to talk to someone who <em>gets it</em> — not a hotline
          script, not a salesperson, not a therapist billing by the hour. RecoveryBridge
          connects you, free and anonymously, with a real person who has walked a similar
          road in addiction recovery. No cost. No appointment. No pressure. Available now.
        </p>

        {/* CTA */}
        <div className="mb-10">
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Connect with a listener — it&apos;s free
          </Link>
        </div>

        {/* Crisis safety callout — near the top for YMYL safety */}
        <aside
          role="note"
          className="mb-10 rounded-xl border-l-4 border-red-400 bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm text-red-900 dark:text-red-200"
        >
          <strong className="font-semibold">If this is an emergency:</strong> RecoveryBridge
          is peer support, not a crisis or emergency service. If you are in immediate danger
          or thinking about harming yourself,{' '}
          <a href="sms:988" className="underline font-semibold">text</a> or <a href="tel:988" className="underline font-semibold">call</a> 988 (Suicide &amp; Crisis
          Lifeline), text <strong>HOME</strong> to{' '}
          <a href="sms:741741?&body=HOME" className="underline font-semibold">741741</a>, or call{' '}
          <a href="tel:911" className="underline font-semibold">911</a>.
        </aside>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          Why RecoveryBridge is different
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-4">
          Search for &ldquo;free addiction chat&rdquo; and most of what you find is run by
          treatment centers — the &ldquo;chat&rdquo; is really a doorway to booking a paid
          admission. That is not what this is. RecoveryBridge exists for one reason: so that
          no one has to sit alone with what they are carrying.
        </p>
        <ul className="mb-8 space-y-2 text-base text-rb-gray dark:text-gray-300">
          <li className="flex gap-2"><span aria-hidden="true">•</span><span><strong className="text-rb-dark dark:text-gray-100">Genuinely free</strong> — no cost, no ads, no upsell to rehab.</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span><strong className="text-rb-dark dark:text-gray-100">Anonymous</strong> — pick a display name; share nothing you do not want to.</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span><strong className="text-rb-dark dark:text-gray-100">Real peers</strong> — people with lived experience, not paid staff or bots.</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span><strong className="text-rb-dark dark:text-gray-100">Any path welcome</strong> — 12-step, medication-assisted, moderation, or your own way.</span></li>
          <li className="flex gap-2"><span aria-hidden="true">•</span><span><strong className="text-rb-dark dark:text-gray-100">On your schedule</strong> — no appointments or waiting rooms; connect when you need to.</span></li>
        </ul>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          How it works
        </h2>
        <ol className="mb-8 space-y-3 text-base text-rb-gray dark:text-gray-300">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rb-blue text-white text-sm font-bold flex items-center justify-center">1</span>
            <span><strong className="text-rb-dark dark:text-gray-100">Ask for support.</strong> Create a free, anonymous account and tap &ldquo;I Need Support.&rdquo; Available listeners are notified instantly.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rb-blue text-white text-sm font-bold flex items-center justify-center">2</span>
            <span><strong className="text-rb-dark dark:text-gray-100">A listener shows up.</strong> A volunteer peer accepts, and a private one-on-one chat begins — just the two of you.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rb-blue text-white text-sm font-bold flex items-center justify-center">3</span>
            <span><strong className="text-rb-dark dark:text-gray-100">Talk freely.</strong> Say what is really going on — no judgment, no agenda. Your listener is here because they have been there too.</span>
          </li>
        </ol>

        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-3">
          What you can talk about
        </h2>
        <p className="text-base text-rb-gray dark:text-gray-300 leading-relaxed mb-8">
          Anything on your mind in recovery. Early sobriety and the loneliness that can come
          with it. A craving that will not let go. Relapse — the fear of it, or the shame
          after one. Family tension, grief, anxiety, or just needing to be heard by someone
          who will not flinch. You do not have to have the right words, and you do not have
          to be &ldquo;doing recovery right&rdquo; to reach out.
        </p>

        {/* FAQ */}
        <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-4">
          Common questions
        </h2>
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
          <h2 className="text-heading-3 text-rb-dark dark:text-gray-100 mb-2">You do not have to do this alone</h2>
          <p className="text-base text-rb-gray dark:text-gray-300 mb-5 max-w-xl mx-auto leading-relaxed">
            Connection is the antidote to addiction. Someone who understands is a moment away.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-rb-blue hover:bg-rb-blue-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Get started — it&apos;s free
          </Link>
        </div>

        {/* Related internal links */}
        <p className="text-sm text-rb-gray dark:text-gray-400">
          Related:{' '}
          <Link href="/support/recovery-chat" className="underline hover:text-rb-blue">Free recovery chat</Link>
          {' · '}
          <Link href="/support/what-to-do-when-you-want-to-use" className="underline hover:text-rb-blue">When you want to use again</Link>
          {' · '}
          <Link href="/support/recovery-support-without-aa" className="underline hover:text-rb-blue">Recovery support without AA</Link>
          {' · '}
          <Link href="/support/what-is-peer-support" className="underline hover:text-rb-blue">What is peer support</Link>
          {' · '}
          <Link href="/support/supporting-a-loved-one-in-recovery" className="underline hover:text-rb-blue">Supporting a loved one</Link>
          {' · '}
          <Link href="/safety" className="underline hover:text-rb-blue">How we keep support safe</Link>
        </p>
      </article>

      <Footer />
    </main>
  )
}
