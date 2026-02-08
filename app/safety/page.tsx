'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { CompactFooter } from '@/components/Footer'

export default function SafetyPage() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition"
            >
              ← Back
            </button>
            <Link
              href="/"
              className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition"
            >
              Home
            </Link>
          </div>
          <Heading1 className="mb-2">Safety Guidelines</Heading1>
          <Body16 className="text-rb-gray">Creating a safe, supportive community together</Body16>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Crisis Resources - Most Important */}
          <section className="bg-red-50 border-2 border-red-300 rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl" role="img" aria-label="Emergency">🆘</span>
              <div className="flex-1">
                <Body18 className="font-bold text-red-900 mb-2">If You're in Crisis</Body18>
                <Body16 className="text-red-800 mb-3">
                  RecoveryBridge is peer support, not crisis intervention. If you're having thoughts of harming yourself or others, please reach out for immediate help:
                </Body16>
              </div>
            </div>
            <div className="space-y-3 ml-12">
              <div>
                <Body16 className="font-semibold">988 Suicide & Crisis Lifeline</Body16>
                <Body16 className="text-sm text-rb-gray">Call or text 988 • Available 24/7</Body16>
              </div>
              <div>
                <Body16 className="font-semibold">Crisis Text Line</Body16>
                <Body16 className="text-sm text-rb-gray">Text HOME to 741741 • Available 24/7</Body16>
              </div>
              <div>
                <Body16 className="font-semibold">Emergency Services</Body16>
                <Body16 className="text-sm text-rb-gray">Call 911 for immediate danger</Body16>
              </div>
            </div>
          </section>

          {/* Introduction */}
          <section>
            <Body18 className="font-semibold mb-3">Our Commitment to Safety</Body18>
            <Body16 className="text-rb-gray">
              RecoveryBridge is built on mutual respect, compassion, and safety. These guidelines help create a supportive environment where everyone feels welcome and protected.
            </Body16>
          </section>

          {/* For Everyone */}
          <section>
            <Body18 className="font-semibold mb-3">Guidelines for Everyone</Body18>

            <div className="space-y-4">
              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-2">✅ Do:</Body16>
                <ul className="space-y-2 ml-6">
                  <li className="text-rb-gray">
                    <Body16>• Treat others with kindness, respect, and empathy</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Share your experiences and support others from your perspective</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Respect boundaries - if someone doesn't want to talk about something, that's okay</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Use the report feature if you see concerning behavior</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Take breaks when you need them - self-care comes first</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Keep conversations confidential - what's shared in chats stays private</Body16>
                  </li>
                </ul>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-2">❌ Don't:</Body16>
                <ul className="space-y-2 ml-6">
                  <li className="text-rb-gray">
                    <Body16>• Give medical, legal, or professional advice</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Pressure others to share more than they're comfortable with</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Share others' personal information or stories without permission</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Engage in romantic or sexual conversations</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Try to diagnose others or prescribe treatments</Body16>
                  </li>
                  <li className="text-rb-gray">
                    <Body16>• Share graphic or triggering content without warning</Body16>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* For Listeners */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Body18 className="font-semibold mb-3">🎧 For Listeners</Body18>
            <Body16 className="text-rb-gray mb-3">
              Thank you for offering support! Here's how to be an effective, safe listener:
            </Body16>

            <div className="space-y-3">
              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Listen actively and without judgment</Body16>
                <Body16 className="text-sm text-rb-gray">Let the person guide the conversation. Your role is to listen, not to fix.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Share your experiences, not advice</Body16>
                <Body16 className="text-sm text-rb-gray">Instead of "You should...", try "What worked for me was..." Remember, you're a peer, not a therapist.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Know your limits</Body16>
                <Body16 className="text-sm text-rb-gray">It's okay to say "I'm not sure I'm the right person for this." If someone needs professional help, encourage them to seek it.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Watch for burnout</Body16>
                <Body16 className="text-sm text-rb-gray">Supporting others is rewarding but can be draining. Take breaks and practice self-care.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">If someone mentions self-harm or suicide</Body16>
                <Body16 className="text-sm text-rb-gray">Encourage them to contact 988 or other crisis resources immediately. Don't try to be a crisis counselor - that's beyond peer support.</Body16>
              </div>
            </div>
          </section>

          {/* For Seekers */}
          <section className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <Body18 className="font-semibold mb-3">🤝 For Those Seeking Support</Body18>
            <Body16 className="text-rb-gray mb-3">
              We're here for you! Here's how to get the most out of RecoveryBridge:
            </Body16>

            <div className="space-y-3">
              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Share at your own pace</Body16>
                <Body16 className="text-sm text-rb-gray">You decide what and how much to share. There's no pressure to open up before you're ready.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Remember - peers, not professionals</Body16>
                <Body16 className="text-sm text-rb-gray">Listeners are people with lived experience, not therapists. They can offer support and understanding, but not treatment or diagnosis.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Seek professional help when needed</Body16>
                <Body16 className="text-sm text-rb-gray">RecoveryBridge is a supplement to professional care, not a replacement. If you're struggling, please reach out to a qualified mental health professional.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">It's okay to disconnect</Body16>
                <Body16 className="text-sm text-rb-gray">If a conversation isn't helpful or feels uncomfortable, you can end it at any time. Your wellbeing comes first.</Body16>
              </div>

              <div>
                <Body16 className="font-semibold text-[#2D3436] mb-1">Different listeners, different styles</Body16>
                <Body16 className="text-sm text-rb-gray">If one conversation doesn't click, try connecting with someone else. Finding the right support match may take time.</Body16>
              </div>
            </div>
          </section>

          {/* Reporting and Safety */}
          <section>
            <Body18 className="font-semibold mb-3">Reporting Concerns</Body18>
            <Body16 className="text-rb-gray mb-3">
              Your safety is our priority. If you experience or witness any of the following, please report it immediately:
            </Body16>
            <ul className="space-y-2 ml-6 mb-4">
              <li className="text-rb-gray">
                <Body16>• Harassment, bullying, or threatening behavior</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Requests for personal information (phone number, address, etc.)</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Inappropriate romantic or sexual advances</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Someone impersonating a healthcare professional</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Spam, scams, or commercial solicitation</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Encouragement of harmful behaviors</Body16>
              </li>
            </ul>
            <div className="bg-gray-100 rounded-lg p-4">
              <Body16>
                <strong>How to report:</strong> Use the 🚩 Report button during a chat, or contact us at{' '}
                <a href="mailto:safety@recoverybridge.com" className="text-rb-blue hover:underline">
                  safety@recoverybridge.com
                </a>
              </Body16>
            </div>
          </section>

          {/* Privacy and Confidentiality */}
          <section>
            <Body18 className="font-semibold mb-3">Privacy and Confidentiality</Body18>
            <Body16 className="text-rb-gray mb-2">
              <strong className="text-[#2D3436]">What we protect:</strong> Your conversations are private and encrypted. We never share your personal information without your consent.
            </Body16>
            <Body16 className="text-rb-gray mb-2">
              <strong className="text-[#2D3436]">What we ask of you:</strong> Please respect others' privacy too. Don't share screenshots, personal details, or stories from your conversations without explicit permission.
            </Body16>
            <Body16 className="text-rb-gray">
              <strong className="text-[#2D3436]">Exception:</strong> We may need to break confidentiality if there's an immediate risk of harm to you or others, or if required by law.
            </Body16>
          </section>

          {/* Healthy Boundaries */}
          <section>
            <Body18 className="font-semibold mb-3">Maintaining Healthy Boundaries</Body18>
            <Body16 className="text-rb-gray mb-2">
              Healthy boundaries make RecoveryBridge work for everyone:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray">
                <Body16>• Keep conversations on the platform - don't exchange personal contact info</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Respect that people may not always be available</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• It's okay to say "I need to take a break"</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Avoid becoming dependent on one person for support</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Remember - this is peer support, not friendship or therapy</Body16>
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-lg p-4">
            <Body18 className="font-semibold mb-2">Questions About Safety?</Body18>
            <Body16 className="text-rb-gray">
              If you have questions or concerns about safety on RecoveryBridge, please contact us at{' '}
              <a href="mailto:safety@recoverybridge.com" className="text-rb-blue hover:underline">
                safety@recoverybridge.com
              </a>
            </Body16>
          </section>
        </div>

        <CompactFooter />
      </div>
    </main>
  )
}
