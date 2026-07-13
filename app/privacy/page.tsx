'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { CompactFooter } from '@/components/Footer'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
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
          <Heading1 className="mb-2 dark:text-gray-100">Privacy Policy</Heading1>
          <Body16 className="text-rb-gray dark:text-gray-300">Last updated: May 28, 2026</Body16>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Introduction */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Your Privacy Matters</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              At RecoveryBridge, we understand that privacy is essential, especially when you're seeking or providing support for mental health and recovery. This policy explains how we collect, use, and protect your personal information.
            </Body16>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <Body16 className="text-sm dark:text-gray-100">
                <strong>Our Promise:</strong> Your conversations are private. We never sell your data. Your information is encrypted and protected.
              </Body16>
            </div>
          </section>

          {/* Information We Collect */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Information We Collect</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Account Information:</strong> When you create an account, we collect your email address, display name, and any profile information you choose to share (like your bio or role).
            </Body16>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Messages:</strong> We store your chat messages so the service works, encrypted both in transit and at rest. If someone reports misconduct, a RecoveryBridge admin may review that session&apos;s transcript to look into it — and every review is logged.
            </Body16>
            <Body16 className="text-rb-gray dark:text-gray-300">
              <strong className="text-[#2D3436] dark:text-gray-100">Usage Data:</strong> We collect basic information about how you use RecoveryBridge (like when you log in) to improve our service and keep it secure.
            </Body16>
          </section>

          {/* How We Use Your Information */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">How We Use Your Information</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-2">We use your information to:</Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Provide the RecoveryBridge platform and connect you with others</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Keep your account secure and prevent abuse</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Improve our service and fix technical issues</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Send you important updates about your account or our service</Body16>
              </li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Who We Share Your Data With</Body18>
            <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-4 mb-3">
              <Body16 className="dark:text-gray-100">
                <strong>We never sell your personal information to anyone.</strong>
              </Body16>
            </div>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-2">
              We share as little as possible — only in these situations:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">The people you chat with:</strong> they can see your display name and profile</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">Companies that help us run the app:</strong> trusted providers like our hosting and database. They&apos;re required to protect your data and can&apos;t use it for anything else</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">The law:</strong> if we&apos;re legally required to, or to prevent serious harm to someone</Body16>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Your Privacy Rights</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-2">It&apos;s your data. You can:</Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• See the personal information we hold about you</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Update or correct it anytime in your profile settings</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Delete your account and data whenever you want</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Export a copy of your data</Body16>
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">How We Protect Your Data</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-2">
              We use strong, industry-standard protections to keep your information safe:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Messages encrypted in transit (TLS) and at rest</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Secure data storage with encryption at rest</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Regular security audits and updates</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• Limited access to your data by our team</Body16>
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">How Long We Keep Your Data</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-2">
              We hold onto your information only as long as we need to:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">While your account is active:</strong> we keep your data so the service works</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">After you delete your account:</strong> we remove your personal information within 30 days</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">Backups:</strong> some data may linger in encrypted backups for up to 90 days, then it&apos;s gone</Body16>
              </li>
            </ul>
          </section>

          {/* Consumer Health Data Privacy Notice */}
          <section className="border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <Body18 className="font-semibold mb-1 dark:text-gray-100">Consumer Health Data Privacy Notice</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              Because RecoveryBridge is about recovery, some of what you share here counts as &ldquo;health data&rdquo; under state privacy laws. Here&apos;s what that means for you, in plain terms.
            </Body16>
            <Body16 className="text-xs text-rb-gray dark:text-gray-300 mb-4">
              This notice applies to residents of states with consumer health data privacy laws, including Washington (My Health My Data Act).
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">What counts as health data:</strong> The things you share about your mental health, substance use, recovery, and related experiences count as &ldquo;consumer health data&rdquo; under these laws. We only collect it to provide peer support.
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">How we use it:</strong> Only to connect you with peer support and to run RecoveryBridge. Never for advertising, marketing profiles, or sale to anyone — full stop.
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Who helps us run it:</strong> A few trusted service providers handle the technical side. They&apos;re contractually required to protect your information and can&apos;t use it for their own purposes:
            </Body16>
            <ul className="space-y-2 ml-6 mb-3">
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">Supabase</strong> — securely stores your account, messages, and profile</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">Vercel</strong> — runs the app; may keep basic server logs (IP address, timestamp, page requested)</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-300">
                <Body16>• <strong className="dark:text-gray-300">Sentry</strong> — error monitoring; only captures crash reports and privacy-masked session replays (your text is hidden, images blocked), and only when we&apos;ve turned it on</Body16>
              </li>
            </ul>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              None of them are allowed to use your health data for their own purposes — only to help run RecoveryBridge.
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-300 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Your rights:</strong> Depending on where you live, you can ask us to:
            </Body16>
            <ul className="space-y-2 ml-6 mb-3">
              <li className="text-rb-gray dark:text-gray-300"><Body16>• Confirm whether we hold your health data</Body16></li>
              <li className="text-rb-gray dark:text-gray-300"><Body16>• Get a copy of it</Body16></li>
              <li className="text-rb-gray dark:text-gray-300"><Body16>• Delete it — or just delete your account in settings, which does the same thing</Body16></li>
              <li className="text-rb-gray dark:text-gray-300"><Body16>• Withdraw your consent anytime</Body16></li>
            </ul>

            <Body16 className="text-rb-gray dark:text-gray-300">
              <strong className="text-[#2D3436] dark:text-gray-100">How to ask:</strong> Just email{' '}
              <a href="mailto:admin@recoverybridge.app" className="text-rb-blue hover:underline">admin@recoverybridge.app</a>
              {' '}and we&apos;ll get back to you within 45 days (the legal deadline).
            </Body16>
          </section>

          {/* Children's Privacy */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Children's Privacy</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300">
              RecoveryBridge is intended for users 18 years and older. We do not knowingly collect information from anyone under 18. If we learn that we have collected information from someone under 18, we will delete it immediately.
            </Body16>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Changes to This Policy</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300">
              We may update this privacy policy from time to time. We'll notify you of any significant changes by email or through the app. Your continued use of RecoveryBridge after changes means you accept the updated policy.
            </Body16>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Body18 className="font-semibold mb-2 dark:text-gray-100">Questions About Privacy?</Body18>
            <Body16 className="text-rb-gray dark:text-gray-300">
              If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:admin@recoverybridge.app" className="text-rb-blue hover:underline">
                admin@recoverybridge.app
              </a>
            </Body16>
          </section>
        </div>

        <CompactFooter />
      </div>
    </main>
  )
}
