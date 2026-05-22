'use client'

import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { CompactFooter } from '@/components/Footer'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition mb-4"
          >
            ← Back
          </button>
          <Heading1 className="mb-2 dark:text-gray-100">Privacy Policy</Heading1>
          <Body16 className="text-rb-gray dark:text-gray-400">Last updated: {new Date().toLocaleDateString()}</Body16>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Introduction */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Your Privacy Matters</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
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
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Account Information:</strong> When you create an account, we collect your email address, display name, and any profile information you choose to share (like your bio or role).
            </Body16>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Messages:</strong> We store your chat messages to provide the service. Your messages are encrypted in transit and at rest. In cases of reported misconduct, session transcripts may be reviewed by RecoveryBridge administrators for moderation purposes. All such reviews are recorded in an audit log.
            </Body16>
            <Body16 className="text-rb-gray dark:text-gray-400">
              <strong className="text-[#2D3436] dark:text-gray-100">Usage Data:</strong> We collect basic information about how you use RecoveryBridge (like when you log in) to improve our service and keep it secure.
            </Body16>
          </section>

          {/* How We Use Your Information */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">How We Use Your Information</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">We use your information to:</Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Provide the RecoveryBridge platform and connect you with others</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Keep your account secure and prevent abuse</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Improve our service and fix technical issues</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
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
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              We only share your information in these limited circumstances:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• <strong className="dark:text-gray-300">Other users:</strong> Your display name and profile information is visible to people you chat with</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• <strong className="dark:text-gray-300">Service providers:</strong> We use trusted third parties (like hosting providers) who help us run RecoveryBridge. They're required to protect your data</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• <strong className="dark:text-gray-300">Legal requirements:</strong> If required by law or to prevent serious harm</Body16>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Your Privacy Rights</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">You have the right to:</Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Access your personal information</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Update or correct your information in your profile settings</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Delete your account and data at any time</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Export your data</Body16>
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">How We Protect Your Data</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              We take security seriously and use industry-standard measures to protect your information:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• End-to-end encryption for messages</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Secure data storage with encryption at rest</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Regular security audits and updates</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Limited access to your data by our team</Body16>
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">How Long We Keep Your Data</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              We keep your information only as long as necessary:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Active accounts: We keep your data while your account is active</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Deleted accounts: We delete your personal information within 30 days of account deletion</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Backups: Some data may remain in encrypted backups for up to 90 days</Body16>
              </li>
            </ul>
          </section>

          {/* Consumer Health Data Privacy Notice */}
          <section className="border-2 border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <Body18 className="font-semibold mb-1 dark:text-gray-100">Consumer Health Data Privacy Notice</Body18>
            <Body16 className="text-xs text-rb-gray dark:text-gray-400 mb-4">
              This notice applies to residents of states with consumer health data privacy laws, including Washington (My Health My Data Act).
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Health Data We Process:</strong> RecoveryBridge processes consumer health data as defined under applicable state law, including information you provide about mental health, substance use, addiction recovery status, and related personal experiences. This data is collected only to provide the peer support service.
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">How We Use Health Data:</strong> Your health-related information is used solely to connect you with peer support and to operate RecoveryBridge. We do not use this data for advertising, marketing profiling, or sale to third parties.
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Third-Party Processors:</strong> We share limited technical data with the following service providers who are contractually required to protect your information:
            </Body16>
            <ul className="space-y-2 ml-6 mb-3">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• <strong className="dark:text-gray-300">Supabase</strong> — database and authentication provider that stores all user data and messages</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• <strong className="dark:text-gray-300">Vercel</strong> — application hosting; may retain server access logs (IP address, timestamp, requested path)</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• <strong className="dark:text-gray-300">Sentry</strong> — error monitoring; captures application error reports and anonymized session replays (text masked, media blocked) only when enabled via environment configuration</Body16>
              </li>
            </ul>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              None of these providers are authorized to use your health data for their own purposes beyond providing services to RecoveryBridge LLC.
            </Body16>

            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Your Rights (applicable states):</strong> Depending on your state of residence, you may have the right to:
            </Body16>
            <ul className="space-y-2 ml-6 mb-3">
              <li className="text-rb-gray dark:text-gray-400"><Body16>• Confirm whether we process your consumer health data</Body16></li>
              <li className="text-rb-gray dark:text-gray-400"><Body16>• Access and obtain a copy of your health data</Body16></li>
              <li className="text-rb-gray dark:text-gray-400"><Body16>• Delete your health data (via account deletion in profile settings)</Body16></li>
              <li className="text-rb-gray dark:text-gray-400"><Body16>• Withdraw consent for processing</Body16></li>
            </ul>

            <Body16 className="text-rb-gray dark:text-gray-400">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@recoverybridge.app" className="text-rb-blue hover:underline">privacy@recoverybridge.app</a>.
              We will respond within 45 days as required by applicable law.
            </Body16>
          </section>

          {/* Children's Privacy */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Children's Privacy</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              RecoveryBridge is intended for users 18 years and older. We do not knowingly collect information from anyone under 18. If we learn that we have collected information from someone under 18, we will delete it immediately.
            </Body16>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Changes to This Policy</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              We may update this privacy policy from time to time. We'll notify you of any significant changes by email or through the app. Your continued use of RecoveryBridge after changes means you accept the updated policy.
            </Body16>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Body18 className="font-semibold mb-2 dark:text-gray-100">Questions About Privacy?</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:privacy@recoverybridge.app" className="text-rb-blue hover:underline">
                privacy@recoverybridge.app
              </a>
            </Body16>
          </section>
        </div>

        <CompactFooter />
      </div>
    </main>
  )
}
