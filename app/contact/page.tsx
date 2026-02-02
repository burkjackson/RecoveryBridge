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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Create mailto link with form data
    const mailtoLink = `mailto:recoverybridgeapp@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`

    // Open mail client
    window.location.href = mailtoLink

    // Show success message
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitted) {
    return (
      <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-3xl" role="img" aria-label="Success">✓</span>
            </div>
            <Heading1 className="mb-3">Thanks for reaching out!</Heading1>
            <Body16 className="text-rb-gray mb-6">
              Your email client should open with a pre-filled message. Send it and we'll get back to you as soon as possible.
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
    <main id="main-content" className="min-h-screen p-4 sm:p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="inline-block min-h-[44px] py-3 text-sm text-rb-blue hover:text-rb-blue-hover transition mb-4"
          >
            ← Back
          </button>
          <Heading1 className="mb-2">Contact Us</Heading1>
          <Body16 className="text-rb-gray">We'd love to hear from you</Body16>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <Body16 className="mb-2">
            <strong>📧 Email:</strong> recoverybridgeapp@gmail.com
          </Body16>
          <Body16 className="text-sm text-rb-gray">
            We typically respond within 24-48 hours. For urgent safety concerns, please use our crisis resources or contact emergency services.
          </Body16>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm">
          <Body18 className="font-semibold mb-4">Send us a message</Body18>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold mb-2">
                Your Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2">
                Your Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-semibold mb-2">
                Subject <span className="text-red-600">*</span>
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue"
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
              <label htmlFor="message" className="block text-sm font-semibold mb-2">
                Message <span className="text-red-600">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rb-blue resize-y"
                placeholder="Tell us what's on your mind..."
              />
            </div>

            {/* Privacy Note */}
            <div className="bg-gray-50 rounded-lg p-4">
              <Body16 className="text-xs text-rb-gray">
                <strong>Privacy Note:</strong> Your message will be sent via email. We'll only use your contact information to respond to your inquiry. See our{' '}
                <a href="/privacy" className="text-rb-blue hover:underline">Privacy Policy</a> for more details.
              </Body16>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] px-6 py-3 bg-rb-blue text-white rounded-full hover:bg-rb-blue-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Opening Email Client...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Additional Help */}
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <Body18 className="font-semibold mb-2">🆘 Need Immediate Help?</Body18>
          <Body16 className="text-sm text-rb-gray mb-3">
            If you're experiencing a mental health crisis, please don't wait for an email response:
          </Body16>
          <div className="space-y-2">
            <Body16 className="text-sm">
              <strong>988 Suicide & Crisis Lifeline:</strong> Call or text 988
            </Body16>
            <Body16 className="text-sm">
              <strong>Crisis Text Line:</strong> Text HOME to 741741
            </Body16>
            <Body16 className="text-sm">
              <strong>Emergency Services:</strong> Call 911
            </Body16>
          </div>
        </div>

        <CompactFooter />
      </div>
    </main>
  )
}
