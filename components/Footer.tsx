// Footer component with privacy reassurance for mental health platform

interface FooterProps {
  className?: string
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`mt-8 pt-6 pb-24 px-4 border-t border-gray-200 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Privacy Reassurance */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full mb-3">
            <span className="text-xl" role="img" aria-label="Lock">🔒</span>
            <span className="text-sm font-semibold text-green-900">
              Your conversations are private & confidential
            </span>
          </div>
          <p className="text-sm text-rb-gray max-w-md mx-auto">
            Your data is encrypted and never shared with third parties. We're committed to protecting your privacy.
          </p>
        </div>

        {/* Beta Feedback Button */}
        <div className="text-center mb-6">
          <a
            href="https://docs.google.com/forms/d/1FTmTnABHwsP1VpDg-RAtLUpAIv9S3ZaSOoK-ldjX9to/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-rb-blue text-white font-semibold rounded-full hover:bg-[#6B8DA1] transition shadow-md"
          >
            <span className="text-lg" role="img" aria-label="Feedback">💭</span>
            <span>Share Beta Feedback</span>
          </a>
          <p className="text-xs text-rb-gray mt-2">
            Help us improve RecoveryBridge! Your feedback shapes our future.
          </p>
        </div>

        {/* Links */}
        <div className="text-center mb-4">
          <div className="inline-flex flex-wrap justify-center items-center gap-x-3 gap-y-2 text-sm text-rb-gray">
            <a
              href="/privacy"
              className="min-h-[44px] inline-flex items-center hover:text-rb-blue transition"
            >
              Privacy Policy
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="/terms"
              className="min-h-[44px] inline-flex items-center hover:text-rb-blue transition"
            >
              Terms of Service
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="/safety"
              className="min-h-[44px] inline-flex items-center hover:text-rb-blue transition"
            >
              Safety Guidelines
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="/contact"
              className="min-h-[44px] inline-flex items-center hover:text-rb-blue transition"
            >
              Contact Us
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-gray-400">
          © {new Date().getFullYear()} RecoveryBridge. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

// Privacy badge for chat pages
export function PrivacyBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full ${className}`}>
      <span className="text-base" role="img" aria-label="Lock">🔒</span>
      <span className="text-xs sm:text-sm font-medium text-green-900">
        Private & Confidential
      </span>
    </div>
  )
}

// Compact footer for pages with limited space
export function CompactFooter({ className = '' }: FooterProps) {
  return (
    <footer className={`mt-6 py-4 px-4 text-center ${className}`}>
      <div className="flex flex-wrap justify-center items-center gap-2 text-xs text-rb-gray mb-2">
        <a href="/privacy" className="hover:text-rb-blue transition">Privacy</a>
        <span>•</span>
        <a href="/terms" className="hover:text-rb-blue transition">Terms</a>
        <span>•</span>
        <span className="text-gray-400">🔒 Encrypted & Private</span>
      </div>
    </footer>
  )
}
