'use client'

import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { CompactFooter } from '@/components/Footer'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition mb-4"
          >
            ← Back
          </button>
          <Heading1 className="mb-2">Privacy Policy</Heading1>
          <Body16 className="text-rb-gray">Last updated: {new Date().toLocaleDateString()}</Body16>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Introduction */}
          <section>
            <Body18 className="font-semibold mb-3">Your Privacy Matters</Body18>
            <Body16 className="text-rb-gray mb-3">
              At RecoveryBridge, we understand that privacy is essential, especially when you're seeking or providing support for mental health and recovery. This policy explains how we collect, use, and protect your personal information.
            </Body16>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <Body16 className="text-sm">
                <strong>Our Promise:</strong> Your conversations are private. We never sell your data. Your information is encrypted and protected.
              </Body16>
            </div>
          </section>

          {/* Information We Collect */}
          <section>
            <Body18 className="font-semibold mb-3">Information We Collect</Body18>
            <Body16 className="text-rb-gray mb-3">
              <strong className="text-[#2D3436]">Account Information:</strong> When you create an account, we collect your email address, display name, and any profile information you choose to share (like your bio or role).
            </Body16>
            <Body16 className="text-rb-gray mb-3">
              <strong className="text-[#2D3436]">Messages:</strong> We store your chat messages to provide the service. Your messages are encrypted in transit and at rest.
            </Body16>
            <Body16 className="text-rb-gray">
              <strong className="text-[#2D3436]">Usage Data:</strong> We collect basic information about how you use RecoveryBridge (like when you log in) to improve our service and keep it secure.
            </Body16>
          </section>

          {/* How We Use Your Information */}
          <section>
            <Body18 className="font-semibold mb-3">How We Use Your Information</Body18>
            <Body16 className="text-rb-gray mb-2">We use your information to:</Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray">
                <Body16>• Provide the RecoveryBridge platform and connect you with others</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Keep your account secure and prevent abuse</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Improve our service and fix technical issues</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Send you important updates about your account or our service</Body16>
              </li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section>
            <Body18 className="font-semibold mb-3">Who We Share Your Data With</Body18>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <Body16>
                <strong>We never sell your personal information to anyone.</strong>
              </Body16>
            </div>
            <Body16 className="text-rb-gray mb-2">
              We only share your information in these limited circumstances:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray">
                <Body16>• <strong>Other users:</strong> Your display name and profile information is visible to people you chat with</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• <strong>Service providers:</strong> We use trusted third parties (like hosting providers) who help us run RecoveryBridge. They're required to protect your data</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• <strong>Legal requirements:</strong> If required by law or to prevent serious harm</Body16>
              </li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <Body18 className="font-semibold mb-3">Your Privacy Rights</Body18>
            <Body16 className="text-rb-gray mb-2">You have the right to:</Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray">
                <Body16>• Access your personal information</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Update or correct your information in your profile settings</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Delete your account and data at any time</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Export your data</Body16>
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <Body18 className="font-semibold mb-3">How We Protect Your Data</Body18>
            <Body16 className="text-rb-gray mb-2">
              We take security seriously and use industry-standard measures to protect your information:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray">
                <Body16>• End-to-end encryption for messages</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Secure data storage with encryption at rest</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Regular security audits and updates</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Limited access to your data by our team</Body16>
              </li>
            </ul>
          </section>

          {/* Data Retention */}
          <section>
            <Body18 className="font-semibold mb-3">How Long We Keep Your Data</Body18>
            <Body16 className="text-rb-gray mb-2">
              We keep your information only as long as necessary:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray">
                <Body16>• Active accounts: We keep your data while your account is active</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Deleted accounts: We delete your personal information within 30 days of account deletion</Body16>
              </li>
              <li className="text-rb-gray">
                <Body16>• Backups: Some data may remain in encrypted backups for up to 90 days</Body16>
              </li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <Body18 className="font-semibold mb-3">Children's Privacy</Body18>
            <Body16 className="text-rb-gray">
              RecoveryBridge is intended for users 18 years and older. We do not knowingly collect information from anyone under 18. If we learn that we have collected information from someone under 18, we will delete it immediately.
            </Body16>
          </section>

          {/* Changes to Privacy Policy */}
          <section>
            <Body18 className="font-semibold mb-3">Changes to This Policy</Body18>
            <Body16 className="text-rb-gray">
              We may update this privacy policy from time to time. We'll notify you of any significant changes by email or through the app. Your continued use of RecoveryBridge after changes means you accept the updated policy.
            </Body16>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 rounded-lg p-4">
            <Body18 className="font-semibold mb-2">Questions About Privacy?</Body18>
            <Body16 className="text-rb-gray">
              If you have questions about this privacy policy or how we handle your data, please contact us at{' '}
              <a href="mailto:privacy@recoverybridge.com" className="text-rb-blue hover:underline">
                privacy@recoverybridge.com
              </a>
            </Body16>
          </section>
        </div>

        <CompactFooter />
      </div>
    </main>
  )
}
