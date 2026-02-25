'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { marked } from 'marked'

const MAX_TITLE = 120
const MAX_EXCERPT = 300
const MIN_CONTENT = 50
const ELIGIBLE_ROLES = ['professional', 'ally']

type Tab = 'write' | 'preview'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function NewStoryPage() {
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [eligible, setEligible] = useState(false)
  const [notSignedIn, setNotSignedIn] = useState(false)

  const [tab, setTab] = useState<Tab>('write')
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function checkEligibility() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setNotSignedIn(true)
        setChecking(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_role, is_admin')
        .eq('id', session.user.id)
        .single()

      if (profile?.is_admin || ELIGIBLE_ROLES.includes(profile?.user_role ?? '')) {
        setEligible(true)
      }
      setChecking(false)
    }
    checkEligibility()
  }, [supabase])

  useEffect(() => {
    if (tab === 'preview') {
      const result = marked(content || '*No content yet.*')
      Promise.resolve(result).then((html) => setPreviewHtml(html as string))
    }
  }, [tab, content])

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 8 * 1024 * 1024) {
      alert('Image must be under 8MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    try {
      setUploadingCover(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const ext = file.name.split('.').pop()
      const path = `${session.user.id}-${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from('blog-images')
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data } = supabase.storage.from('blog-images').getPublicUrl(path)
      setCoverUrl(data.publicUrl)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      alert(msg)
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleSave(status: 'draft' | 'submitted') {
    if (!title.trim()) {
      setErrorMsg('Please add a title before saving.')
      return
    }
    if (content.trim().length < MIN_CONTENT) {
      setErrorMsg(`Content must be at least ${MIN_CONTENT} characters.`)
      return
    }
    setErrorMsg('')
    setSaveStatus('saving')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const res = await fetch('/api/stories/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: savedId,
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          cover_image_url: coverUrl,
          status,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')

      setSavedId(data.id)
      setSavedSlug(data.slug)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setErrorMsg(msg)
      setSaveStatus('error')
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5A7A8C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notSignedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-[#2D3436] mb-2">Sign in required</h2>
            <p className="text-sm text-[#4A5568] mb-6">
              You need to be signed in to write a story.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A7A8C] text-white font-semibold rounded-full hover:bg-[#4A6A7C] transition text-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!eligible) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">✍️</div>
            <h2 className="text-xl font-bold text-[#2D3436] mb-2">Stories are for listeners</h2>
            <p className="text-sm text-[#4A5568] mb-6">
              Only verified listeners and recovery professionals can write stories for the community.
              If you believe this is a mistake, reach out to us.
            </p>
            <a
              href="https://recoverybridge.app/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A7A8C] text-white font-semibold rounded-full hover:bg-[#4A6A7C] transition text-sm"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 p-1 bg-white border border-gray-200 rounded-xl w-fit">
          {(['write', 'preview'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition capitalize ${
                tab === t
                  ? 'bg-[#2D3436] text-white shadow-sm'
                  : 'text-[#4A5568] hover:text-[#2D3436]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'write' ? (
          <div className="space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#2D3436]">Title *</label>
                <span className={`text-xs ${title.length > MAX_TITLE * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {title.length}/{MAX_TITLE}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="Give your story a title…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#2D3436] text-lg font-semibold placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A7A8C]/30 focus:border-[#5A7A8C] transition"
              />
            </div>

            {/* Cover image */}
            <div>
              <label className="text-sm font-semibold text-[#2D3436] block mb-1.5">
                Cover Photo <span className="font-normal text-gray-400">(optional)</span>
              </label>
              {coverUrl ? (
                <div className="relative rounded-xl overflow-hidden h-48 bg-gray-100">
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setCoverUrl(null)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#5A7A8C] bg-white flex flex-col items-center justify-center gap-2 text-sm text-[#4A5568] hover:text-[#5A7A8C] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingCover ? (
                    <div className="w-5 h-5 border-2 border-[#5A7A8C] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="text-2xl">🖼️</span>
                      <span>Upload a cover photo</span>
                      <span className="text-xs text-gray-400">JPG, PNG — up to 8MB</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#2D3436]">
                  Short Description <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <span className={`text-xs ${excerpt.length > MAX_EXCERPT * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {excerpt.length}/{MAX_EXCERPT}
                </span>
              </div>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value.slice(0, MAX_EXCERPT))}
                placeholder="A sentence or two shown in the card preview…"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-[#2D3436] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A7A8C]/30 focus:border-[#5A7A8C] transition resize-none"
              />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#2D3436]">Story *</label>
                <span className="text-xs text-gray-400">Markdown supported</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share your story, insight, or message of hope…"
                rows={18}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-[#2D3436] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#5A7A8C]/30 focus:border-[#5A7A8C] transition resize-y font-mono leading-relaxed"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Use **bold**, *italic*, ## Headings, and {">"} blockquotes for formatting.
              </p>
            </div>
          </div>
        ) : (
          /* Preview tab */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Cover */}
            {coverUrl && (
              <div className="w-full h-56 overflow-hidden">
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2D3436] leading-tight mb-4">
                {title || <span className="text-gray-300">Your title will appear here</span>}
              </h1>
              {excerpt && (
                <p className="text-[#4A5568] italic leading-relaxed mb-6 border-l-4 border-[#E8EEF2] pl-4">
                  {excerpt}
                </p>
              )}
              <article
                className="prose prose-slate max-w-none prose-headings:text-[#2D3436] prose-a:text-[#5A7A8C] prose-blockquote:border-l-[#5A7A8C] prose-blockquote:text-[#4A5568]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Success */}
        {saveStatus === 'saved' && savedSlug && (
          <div className="mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center justify-between">
            <span>✓ Saved successfully</span>
            <a href={`/stories/my`} className="text-xs font-semibold underline">
              View My Stories →
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
          <a
            href="/stories/my"
            className="px-5 py-2.5 text-sm font-semibold text-[#4A5568] border border-gray-200 rounded-full hover:border-gray-300 transition text-center"
          >
            My Stories
          </a>
          <button
            onClick={() => handleSave('draft')}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2.5 text-sm font-semibold text-[#5A7A8C] border border-[#5A7A8C] rounded-full hover:bg-[#5A7A8C]/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave('submitted')}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5A7A8C] rounded-full hover:bg-[#4A6A7C] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Submit for Review →'}
          </button>
        </div>
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="bg-[#2D3436] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <a
          href="/stories"
          className="text-sm text-white/70 hover:text-white transition flex items-center gap-1.5"
        >
          ← Stories
        </a>
        <span className="text-sm font-semibold">Write a Story</span>
        <a
          href="https://recoverybridge.app"
          className="text-xs text-white/50 hover:text-white/80 transition"
        >
          RecoveryBridge
        </a>
      </div>
    </header>
  )
}
