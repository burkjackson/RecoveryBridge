'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IconWebsite, IconInstagram, IconX, IconLinkedIn, IconThreads, IconYouTube } from '@/components/SocialIcons'
import { StoryTagSelector } from '../../StoryTagSelector'
import { marked } from 'marked'
import type { BlogPost } from '@/lib/types/database'

const MAX_TITLE = 120
const MAX_EXCERPT = 300
const MIN_CONTENT = 50

type Tab = 'write' | 'preview'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function EditStoryPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'submitted' | 'published'>('draft')
  const [tab, setTab] = useState<Tab>('write')
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [authorWebsite, setAuthorWebsite] = useState('')
  const [authorInstagram, setAuthorInstagram] = useState('')
  const [authorTwitter, setAuthorTwitter] = useState('')
  const [authorLinkedin, setAuthorLinkedin] = useState('')
  const [authorThreads, setAuthorThreads] = useState('')
  const [authorYoutube, setAuthorYoutube] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [previewHtml, setPreviewHtml] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  const hasLoadedRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadPost() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/login'
        return
      }

      const { data: post } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .eq('author_id', session.user.id)
        .single()

      if (!post) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const typedPost = post as BlogPost
      setTitle(typedPost.title)
      setExcerpt(typedPost.excerpt ?? '')
      setContent(typedPost.content)
      setCoverUrl(typedPost.cover_image_url)
      setSavedSlug(typedPost.slug)
      setCurrentStatus(typedPost.status)
      setAuthorWebsite(typedPost.author_website ?? '')
      setAuthorInstagram(typedPost.author_instagram ?? '')
      setAuthorTwitter(typedPost.author_twitter ?? '')
      setAuthorLinkedin(typedPost.author_linkedin ?? '')
      setAuthorThreads(typedPost.author_threads ?? '')
      setAuthorYoutube(typedPost.author_youtube ?? '')
      setTags(typedPost.tags ?? [])
      setLoading(false)
      hasLoadedRef.current = true
    }
    loadPost()
  }, [id, supabase])

  useEffect(() => {
    if (tab === 'preview') {
      const result = marked(content || '*No content yet.*')
      Promise.resolve(result).then((html) => setPreviewHtml(html as string))
    }
  }, [tab, content])

  // Auto-save: only for drafts/submitted, not published, and not before initial load
  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (currentStatus === 'published') return
    if (!title.trim() || content.trim().length < 50) return

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        setAutoSaving(true)
        const res = await fetch('/api/stories/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            id,
            title: title.trim(), excerpt: excerpt.trim() || null,
            content: content.trim(), cover_image_url: coverUrl, status: 'draft',
            author_website: authorWebsite.trim() || null, author_instagram: authorInstagram.trim() || null,
            author_twitter: authorTwitter.trim() || null, author_linkedin: authorLinkedin.trim() || null,
            author_threads: authorThreads.trim() || null, author_youtube: authorYoutube.trim() || null,
            tags,
          }),
        })
        if (res.ok) setLastAutoSaved(new Date())
      } catch { /* silent */ } finally { setAutoSaving(false) }
    }, 30_000)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  }, [title, excerpt, content, coverUrl, authorWebsite, authorInstagram, authorTwitter, authorLinkedin, authorThreads, authorYoutube, tags, currentStatus, id, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { alert('Image must be under 8MB'); return }
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }

    try {
      setUploadingCover(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const ext = file.name.split('.').pop()
      const path = `${session.user.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('blog-images').upload(path, file, { upsert: true })
      if (error) throw error

      const { data } = supabase.storage.from('blog-images').getPublicUrl(path)
      setCoverUrl(data.publicUrl)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingCover(false)
    }
  }

  async function handleSave(status: 'draft' | 'submitted' | 'published') {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    if (!title.trim()) { setErrorMsg('Please add a title before saving.'); return }
    if (content.trim().length < MIN_CONTENT) { setErrorMsg(`Content must be at least ${MIN_CONTENT} characters.`); return }
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
          id,
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          cover_image_url: coverUrl,
          status,
          author_website: authorWebsite.trim() || null,
          author_instagram: authorInstagram.trim() || null,
          author_twitter: authorTwitter.trim() || null,
          author_linkedin: authorLinkedin.trim() || null,
          author_threads: authorThreads.trim() || null,
          author_youtube: authorYoutube.trim() || null,
          tags,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSavedSlug(data.slug)
      setCurrentStatus(status)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed')
      setSaveStatus('error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5A7A8C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-[#2D3436] mb-2">Story not found</h2>
            <p className="text-sm text-[#4A5568] mb-4">This story doesn't exist or you don't have permission to edit it.</p>
            <a href="/my" className="text-sm text-[#5A7A8C] hover:underline">← My Stories</a>
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
                tab === t ? 'bg-[#2D3436] text-white shadow-sm' : 'text-[#4A5568] hover:text-[#2D3436]'
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
                <span className={`text-xs ${title.length > MAX_TITLE * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>{title.length}/{MAX_TITLE}</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="Give your story a title…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[#2D3436] text-lg font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A7A8C]/30 focus:border-[#5A7A8C] transition"
              />
            </div>

            {/* Cover image */}
            <div>
              <label className="text-sm font-semibold text-[#2D3436] block mb-1.5">Cover Photo <span className="font-normal text-gray-400">(optional)</span></label>
              {coverUrl ? (
                <div className="relative rounded-xl overflow-hidden h-48 bg-gray-100">
                  <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                  <button onClick={() => setCoverUrl(null)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/80 transition">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#5A7A8C] bg-white flex flex-col items-center justify-center gap-2 text-sm text-[#4A5568] hover:text-[#5A7A8C] transition disabled:opacity-50"
                >
                  {uploadingCover ? <div className="w-5 h-5 border-2 border-[#5A7A8C] border-t-transparent rounded-full animate-spin" /> : <><span className="text-2xl">🖼️</span><span>Upload a cover photo</span><span className="text-xs text-gray-400">JPG, PNG — up to 8MB</span></>}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </div>

            {/* Excerpt */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#2D3436]">Short Description <span className="font-normal text-gray-400">(optional)</span></label>
                <span className={`text-xs ${excerpt.length > MAX_EXCERPT * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>{excerpt.length}/{MAX_EXCERPT}</span>
              </div>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value.slice(0, MAX_EXCERPT))} placeholder="A sentence or two shown in the card preview…" rows={2} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-[#2D3436] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A7A8C]/30 focus:border-[#5A7A8C] transition resize-none" />
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#2D3436]">Story *</label>
                <span className="text-xs text-gray-400">Markdown supported</span>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your story…" rows={18} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-[#2D3436] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A7A8C]/30 focus:border-[#5A7A8C] transition resize-y font-mono leading-relaxed" />
            </div>

            {/* Social Links */}
            <div>
              <label className="text-sm font-semibold text-[#2D3436] block mb-1.5">
                Your Links <span className="font-normal text-gray-400">(optional — shown on your published story)</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
                  <IconWebsite className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="url" value={authorWebsite} onChange={(e) => setAuthorWebsite(e.target.value)} placeholder="Website (https://...)" className="flex-1 text-sm text-[#2D3436] placeholder:text-gray-400 bg-transparent focus:outline-none" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
                  <IconInstagram className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-400 select-none">@</span>
                  <input type="text" value={authorInstagram} onChange={(e) => setAuthorInstagram(e.target.value.replace(/^@/, ''))} placeholder="Instagram username" className="flex-1 text-sm text-[#2D3436] placeholder:text-gray-400 bg-transparent focus:outline-none" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
                  <IconX className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-400 select-none">@</span>
                  <input type="text" value={authorTwitter} onChange={(e) => setAuthorTwitter(e.target.value.replace(/^@/, ''))} placeholder="X / Twitter username" className="flex-1 text-sm text-[#2D3436] placeholder:text-gray-400 bg-transparent focus:outline-none" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
                  <IconLinkedIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="url" value={authorLinkedin} onChange={(e) => setAuthorLinkedin(e.target.value)} placeholder="LinkedIn URL (https://linkedin.com/in/...)" className="flex-1 text-sm text-[#2D3436] placeholder:text-gray-400 bg-transparent focus:outline-none" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
                  <IconThreads className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-400 select-none">@</span>
                  <input type="text" value={authorThreads} onChange={(e) => setAuthorThreads(e.target.value.replace(/^@/, ''))} placeholder="Threads username" className="flex-1 text-sm text-[#2D3436] placeholder:text-gray-400 bg-transparent focus:outline-none" />
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#5A7A8C]/30 focus-within:border-[#5A7A8C] transition">
                  <IconYouTube className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input type="url" value={authorYoutube} onChange={(e) => setAuthorYoutube(e.target.value)} placeholder="YouTube channel URL" className="flex-1 text-sm text-[#2D3436] placeholder:text-gray-400 bg-transparent focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Tags */}
            <StoryTagSelector selected={tags} onChange={setTags} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {coverUrl && <div className="w-full h-56 overflow-hidden"><img src={coverUrl} alt="Cover" className="w-full h-full object-cover" /></div>}
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#2D3436] leading-tight mb-4">{title || <span className="text-gray-300">Your title will appear here</span>}</h1>
              {excerpt && <p className="text-[#4A5568] italic leading-relaxed mb-6 border-l-4 border-[#E8EEF2] pl-4">{excerpt}</p>}
              <article className="prose prose-slate max-w-none prose-headings:text-[#2D3436] prose-a:text-[#5A7A8C] prose-blockquote:border-l-[#5A7A8C]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        )}

        {errorMsg && <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errorMsg}</div>}
        {saveStatus === 'saved' && savedSlug && (
          <div className="mt-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center justify-between">
            <span>✓ Saved successfully</span>
            <a href="/my" className="text-xs font-semibold underline">View My Stories →</a>
          </div>
        )}

        {/* Auto-save indicator */}
        {(autoSaving || lastAutoSaved) && currentStatus !== 'published' && (
          <div className="mt-3 text-xs text-gray-400 text-right">
            {autoSaving ? 'Auto-saving draft…' : lastAutoSaved ? `Draft auto-saved ${Math.max(0, Math.round((Date.now() - lastAutoSaved.getTime()) / 60000))} min ago` : ''}
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-end">
          <a href="/my" className="px-5 py-2.5 text-sm font-semibold text-[#4A5568] border border-gray-200 rounded-full hover:border-gray-300 transition text-center">My Stories</a>
          {currentStatus === 'published' ? (
            <>
              <button onClick={() => handleSave('draft')} disabled={saveStatus === 'saving'} className="px-5 py-2.5 text-sm font-semibold text-[#4A5568] border border-gray-200 rounded-full hover:border-gray-300 transition disabled:opacity-50">
                {saveStatus === 'saving' ? 'Saving…' : 'Unpublish to Draft'}
              </button>
              <button onClick={() => handleSave('published')} disabled={saveStatus === 'saving'} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5A7A8C] rounded-full hover:bg-[#4A6A7C] transition disabled:opacity-50 shadow-sm">
                {saveStatus === 'saving' ? 'Saving…' : '✓ Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleSave('draft')} disabled={saveStatus === 'saving'} className="px-5 py-2.5 text-sm font-semibold text-[#5A7A8C] border border-[#5A7A8C] rounded-full hover:bg-[#5A7A8C]/5 transition disabled:opacity-50">
                {saveStatus === 'saving' ? 'Saving…' : 'Save Draft'}
              </button>
              <button onClick={() => handleSave('submitted')} disabled={saveStatus === 'saving'} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#5A7A8C] rounded-full hover:bg-[#4A6A7C] transition disabled:opacity-50 shadow-sm">
                {saveStatus === 'saving' ? 'Saving…' : 'Submit for Review →'}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="bg-[#2D3436] text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <a href="/my" className="text-sm text-white/70 hover:text-white transition">← My Stories</a>
        <span className="text-sm font-semibold">Edit Story</span>
        <a href="https://recoverybridge.app" target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white/80 transition">RecoveryBridge</a>
      </div>
    </header>
  )
}
