// Footer component with privacy reassurance for mental health platform

interface FooterProps {
  className?: string
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`mt-8 pt-6 pb-24 px-4 border-t border-gray-200 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Social */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <a
            href="https://www.facebook.com/ARecoveryBridge/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RecoveryBridge on Facebook"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-rb-gray hover:text-rb-blue transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#1877F2]" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </a>
          <a
            href="https://www.instagram.com/recoverybridge.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RecoveryBridge on Instagram"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-rb-gray hover:text-rb-blue transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#E1306C]" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </a>
          <a
            href="https://www.threads.com/@recoverybridge.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="RecoveryBridge on Threads"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-rb-gray hover:text-rb-blue transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="currentColor" className="w-5 h-5 text-rb-dark" aria-hidden="true">
              <path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.898-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 9.607 125.202.195 97.07 0h-.113C68.882.195 47.292 9.643 32.788 28.094 19.882 44.634 13.224 67.399 13.001 95.932v.136c.223 28.533 6.88 51.299 19.787 67.839 14.504 18.451 36.094 27.899 64.199 28.094h.113c24.94-.169 42.503-6.715 57.013-21.208 18.963-18.944 18.392-42.631 12.157-57.157-4.531-10.556-13.228-19.079-24.733-24.708z"/>
              <path d="M96.764 122.16c-10.964 0-19.578-2.886-25.095-8.35-4.179-4.136-6.298-9.614-6.124-15.802.365-12.809 10.265-21.638 25.57-22.499 8.923-.514 16.954.228 24.006 2.202a84.45 84.45 0 0 1 2.64.822c-.69 8.166-2.817 14.455-6.33 18.755-4.424 5.395-10.898 8.12-19.667 8.872z"/>
            </svg>
            Threads
          </a>
        </div>

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

        {/* Support Us Button */}
        <div className="text-center mb-6">
          <a
            href="https://ko-fi.com/recoverybridge"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition shadow-md"
          >
            <span>Please Support Us</span>
          </a>
          <p className="text-xs text-rb-gray mt-2">
            RecoveryBridge is free for everyone. Your support keeps it that way.
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
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="https://docs.google.com/forms/d/1FTmTnABHwsP1VpDg-RAtLUpAIv9S3ZaSOoK-ldjX9to/viewform"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center hover:text-rb-blue transition"
            >
              Share Feedback
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="https://stories.recoverybridge.app"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center hover:text-rb-blue transition"
            >
              Stories
            </a>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <a
              href="/donate"
              className="min-h-[44px] inline-flex items-center gap-1 hover:text-rb-blue transition font-semibold text-rb-blue"
            >
              Support Us
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
