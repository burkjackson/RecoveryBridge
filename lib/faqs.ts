// Single source of truth for the landing-page FAQ.
// Consumed by both the visible accordion (components/FaqAccordion.tsx) and the
// FAQPage structured data on the home page (app/page.tsx), so the rich-result
// markup can never drift out of sync with what visitors actually see — Google
// flags FAQ schema whose Q&A text isn't present on the page.
export interface Faq {
  q: string
  a: string
}

export const faqs: Faq[] = [
  {
    q: "What if I'm in crisis?",
    a: "RecoveryBridge is peer support — not emergency services or crisis intervention. If you're in immediate danger, please reach out: text 988 (Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), or call 911. These resources are always one tap away inside the app.",
  },
  {
    q: 'Is it anonymous?',
    a: "You choose a display name — no real name, phone number, or identifying info required. Your conversations are private, encrypted, and visible only to you and the person you're speaking with. We never sell your data or share it with advertisers.",
  },
  {
    q: 'Is it really free?',
    a: 'Yes — completely. No subscriptions, no premium tiers, no ads. RecoveryBridge is supported by donations from people who believe peer support should be accessible to everyone, regardless of their situation.',
  },
  {
    q: 'Who are the listeners?',
    a: "Real people with lived experience in recovery — not therapists, counselors, or paid staff. Peers who've walked a similar path and want to offer the kind of understanding that only comes from having been there. Every listener completes a safety and guidelines orientation before connecting with anyone.",
  },
  {
    q: 'What can I talk about?',
    a: "Anything on your mind in recovery. Early sobriety, relapse fears, family tension, grief, anxiety, trauma — there's no set agenda. Listeners have specialty tags so you can find someone with relevant experience, whether that's alcohol, parenting in recovery, relationships, or something else entirely.",
  },
  {
    q: 'Does it work on my phone?',
    a: "Yes. RecoveryBridge is a Progressive Web App — add it to your home screen on iPhone or Android and it works like a native app, with push notifications so a seeker can find you even when you close the browser.",
  },
  {
    q: 'Can I be both a seeker and a listener?',
    a: "Yes. Many people do both — seeking support on hard days, offering it when they're in a stronger place. You can switch roles anytime from your dashboard.",
  },
]
