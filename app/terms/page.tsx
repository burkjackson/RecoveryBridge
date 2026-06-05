'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { CompactFooter } from '@/components/Footer'

export default function TermsPage() {
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
          <Heading1 className="mb-2 dark:text-gray-100">Terms of Service</Heading1>
          <Body16 className="text-rb-gray dark:text-gray-400">Last updated: May 28, 2026</Body16>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Introduction */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Welcome to RecoveryBridge</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              By using RecoveryBridge, you agree to these terms. Please read them carefully. If you don't agree, please don't use our service.
            </Body16>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
              <Body16 className="text-sm dark:text-gray-100">
                <strong>Important:</strong> RecoveryBridge is a peer support platform, not a substitute for professional medical or mental health care. If you're in crisis, please contact emergency services or a crisis hotline immediately.
              </Body16>
            </div>
          </section>

          {/* What RecoveryBridge Is */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">What RecoveryBridge Is (And Isn't)</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">RecoveryBridge IS:</strong>
            </Body16>
            <ul className="space-y-2 ml-6 mb-4">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• A peer support community for recovery and mental health</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• A place to connect with others who understand what you're going through</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• A safe space for sharing experiences and support</Body16>
              </li>
            </ul>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">RecoveryBridge IS NOT:</strong>
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Professional therapy, counseling, or medical care</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• A crisis intervention service</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• A replacement for emergency services or professional help</Body16>
              </li>
            </ul>
          </section>

          {/* Eligibility */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Who Can Use RecoveryBridge</Body18>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
              <Body16 className="dark:text-gray-100">
                <strong>You must be at least 18 years old to create an account or use RecoveryBridge.</strong> By registering, you confirm that you meet this age requirement. Accounts found to belong to minors will be terminated.
              </Body16>
            </div>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              To use RecoveryBridge, you must:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Be at least 18 years old</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Provide accurate information when creating your account</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Not be prohibited from using the service under applicable law</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Agree to follow our Safety Guidelines and Community Standards</Body16>
              </li>
            </ul>
          </section>

          {/* Your Responsibilities */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Your Responsibilities</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              When using RecoveryBridge, you agree to:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Treat others with respect and kindness</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Keep your account secure and not share your login information</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Not impersonate others or create fake accounts</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Not use RecoveryBridge for any illegal purposes</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Not share others' private information without permission</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Report concerning behavior to our moderation team</Body16>
              </li>
            </ul>
          </section>

          {/* Prohibited Conduct */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Prohibited Conduct</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              The following behaviors are not allowed on RecoveryBridge:
            </Body16>
            <ul className="space-y-2 ml-6">
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Harassment, bullying, or abusive behavior</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Sharing harmful, illegal, or explicit content</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Spam, scams, or commercial solicitation</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Impersonating healthcare professionals</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Encouraging self-harm or dangerous behaviors</Body16>
              </li>
              <li className="text-rb-gray dark:text-gray-400">
                <Body16>• Attempting to circumvent our safety systems</Body16>
              </li>
            </ul>
          </section>

          {/* Content and Intellectual Property */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Content and Ownership</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-3">
              <strong className="text-[#2D3436] dark:text-gray-100">Your Content:</strong> You retain ownership of the content you share on RecoveryBridge. By posting, you grant us a license to display and store your content as necessary to provide the service.
            </Body16>
            <Body16 className="text-rb-gray dark:text-gray-400">
              <strong className="text-[#2D3436] dark:text-gray-100">Our Platform:</strong> RecoveryBridge's design, code, and branding are our intellectual property and protected by copyright law.
            </Body16>
          </section>

          {/* Disclaimer of Warranties */}
          <section className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Important Medical Disclaimer</Body18>
            <Body16 className="mb-2 dark:text-gray-100">
              <strong>RecoveryBridge does not provide medical advice.</strong>
            </Body16>
            <Body16 className="text-sm text-rb-gray dark:text-gray-400 mb-2">
              The information and support shared on RecoveryBridge is for peer support purposes only and should not be considered medical or professional advice. Always consult with qualified healthcare professionals for medical decisions.
            </Body16>
            <Body16 className="text-sm text-rb-gray dark:text-gray-400">
              RecoveryBridge is provided "as is" without warranties of any kind. We don't guarantee that the service will always be available, error-free, or meet your specific needs.
            </Body16>
          </section>

          {/* Limitation of Liability */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Limitation of Liability</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              To the fullest extent permitted by law, RecoveryBridge and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the service. This includes, but is not limited to, any decisions made based on peer support received through the platform.
            </Body16>
          </section>

          {/* Account Termination */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Account Termination</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400 mb-2">
              <strong className="text-[#2D3436] dark:text-gray-100">You can:</strong> Delete your account at any time through your profile settings.
            </Body16>
            <Body16 className="text-rb-gray dark:text-gray-400">
              <strong className="text-[#2D3436] dark:text-gray-100">We can:</strong> Suspend or terminate accounts that violate these terms or our Safety Guidelines. We'll generally provide notice, but may terminate immediately for serious violations.
            </Body16>
          </section>

          {/* Changes to Terms */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Changes to These Terms</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              We may update these terms from time to time. If we make significant changes, we'll notify you through the app or by email. Continued use of RecoveryBridge after changes means you accept the updated terms.
            </Body16>
          </section>

          {/* Governing Law */}
          <section>
            <Body18 className="font-semibold mb-3 dark:text-gray-100">Governing Law</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              These terms are governed by applicable United States federal and state law, without regard to conflicts of law principles. Any disputes arising from these terms or your use of RecoveryBridge will first be addressed through good-faith negotiation. If the parties cannot reach a resolution, disputes shall be submitted to binding arbitration or resolved in a court of competent jurisdiction in the United States.
            </Body16>
          </section>

          {/* Contact */}
          <section className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Body18 className="font-semibold mb-2 dark:text-gray-100">Questions About These Terms?</Body18>
            <Body16 className="text-rb-gray dark:text-gray-400">
              If you have questions about these terms, please contact us at{' '}
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
