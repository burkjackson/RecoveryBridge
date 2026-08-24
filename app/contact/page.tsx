'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heading1, Body16, Body18 } from '@/components/ui/Typography'
import { CompactFooter } from '@/components/Footer'

export default function ContactPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'We could not send your message. Please email admin@recoverybridge.app directly.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('We could not reach the server. Please check your connection, or email admin@recoverybridge.app directly.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitted) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-3xl" role="img" aria-label="Success">✓</span>
            </div>
            <Heading1 className="mb-3 dark:text-gray-100">Thanks for reaching out!</Heading1>
            <Body16 className="text-rb-gray dark:text-gray-300 mb-6">
              We've received your message and will get back to you as soon as possible — typically within 24–48 hours.
            </Body16>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSubmitted(false)}
                className="min-h-[44px] px-6 py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition"
              >
                Send Another Message
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="min-h-[44px] px-6 py-3 text-sm bg-rb-blue text-white rounded-full hover:bg-rb-blue-hover transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="min-h-screen p-4 sm:p-6 bg-[#F8F9FA] dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition mb-4"
          >
            ← Back
          </button>
          <Heading1 className="mb-2 dark:text-gray-100">Contact Us</Heading1>
          <Body16 className="text-rb-gray dark:text-gray-300">We'd love to hear from you</Body16>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-4 mb-6">
          <Body16 className="mb-2 dark:text-gray-100">
            <strong>📧 Email:</strong> admin@recoverybridge.app
          </Body16>
          <Body16 className="text-sm text-rb-gray dark:text-gray-300">
            We typically respond within 24-48 hours. For urgent safety concerns, please use our crisis resources or contact emergency services.
          </Body16>
        </div>

        {/* Contact Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm">
          <Body18 className="font-semibold mb-4 dark:text-gray-100">Send us a message</Body18>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2 dark:text-gray-100">
                Your Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2 dark:text-gray-100">
                Your Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-semibold mb-2 dark:text-gray-100">
                Subject <span className="text-red-600">*</span>
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
              >
                <option value="">Select a topic...</option>
                <option value="General Question">General Question</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Safety Concern">Safety Concern</option>
                <option value="Account Issue">Account Issue</option>
                <option value="Feedback">Feedback or Suggestion</option>
                <option value="Partnership Inquiry">Partnership Inquiry</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-semibold mb-2 dark:text-gray-100">
                Message <span className="text-red-600">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue resize-y"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            {/* Privacy Note */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <Body16 className="text-xs text-rb-gray dark:text-gray-300">
                <strong>Privacy Note:</strong> Your message will be sent via email. We'll only use your contact information to respond to your inquiry. See our{' '}
                <a href="/privacy" className="text-rb-blue hover:underline">Privacy Policy</a> for more details.
              </Body16>
            </div>

            {/* Error message */}
            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <Body16 className="text-sm text-red-700 dark:text-red-300">{error}</Body16>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] px-6 py-3 bg-rb-blue text-white rounded-full hover:bg-rb-blue-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Additional Help */}
        <div className="mt-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
          <Body18 className="font-semibold mb-2 dark:text-gray-100">🆘 Need Immediate Help?</Body18>
          <Body16 className="text-sm text-rb-gray dark:text-gray-300 mb-3">
            If you're experiencing a mental health crisis, please don't wait for an email response:
          </Body16>
          <div className="space-y-2">
            <Body16 className="text-sm dark:text-gray-100">
              <strong>988 Suicide & Crisis Lifeline:</strong> Text or call 988
            </Body16>
            <Body16 className="text-sm dark:text-gray-100">
              <strong>Crisis Text Line:</strong> Text HOME to 741741
            </Body16>
            <Body16 className="text-sm dark:text-gray-100">
              <strong>Emergency Services:</strong> Call 911
            </Body16>
          </div>
        </div>

        <CompactFooter />
      </div>
    </main>
  )
}
