'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { BlogPost, BlogPostStatus } from '@/lib/types/database'
import { formatDateShort } from '../utils'

function StatusBadge({ status }: { status: BlogPostStatus }) {
  const config = {
    draft: { label: 'Draft', className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
    submitted: { label: 'Pending Review', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
    published: { label: 'Published', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  }
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

export default function MyStoriesPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notSignedIn, setNotSignedIn] = useState(false)

  useEffect(() => {
    loadPosts()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPosts() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setNotSignedIn(true)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('author_id', session.user.id)
      .order('updated_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  async function handleDelete(post: BlogPost) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return
    setDeletingId(post.id)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`/api/stories/save?id=${post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
    } else {
      alert('Failed to delete post. Please try again.')
    }
    setDeletingId(null)
  }

  if (notSignedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] dark:bg-gray-900 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-[#2D3436] dark:text-gray-100 mb-2">Sign in required</h2>
            <a
              href="/login"
              className="mt-4 inline-flex items-center px-5 py-2.5 bg-[#5A7A8C] text-white font-semibold rounded-full hover:bg-[#4A6A7C] transition text-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] dark:bg-gray-900 font-sans">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#2D3436] dark:text-gray-100">My Stories</h1>
          <a
            href="/stories/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5A7A8C] text-white text-sm font-semibold rounded-full hover:bg-[#4A6A7C] transition shadow-sm"
          >
            ✍️ Write New Story
          </a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="text-4xl mb-3">✍️</div>
            <h2 className="text-lg font-semibold text-[#2D3436] dark:text-gray-100 mb-2">No stories yet</h2>
            <p className="text-sm text-[#4A5568] dark:text-gray-400 mb-6">Share your experience with the community.</p>
            <a
              href="/stories/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A7A8C] text-white text-sm font-semibold rounded-full hover:bg-[#4A6A7C] transition"
            >
              Write Your First Story
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Rejection notice */}
                {post.status === 'draft' && post.rejection_note && (
                  <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Returned for revision</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">{post.rejection_note}</p>
                    </div>
                  </div>
                )}

                <div className="px-5 py-4 flex items-center gap-4">
                  {/* Cover thumbnail */}
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-[#E8EEF2] dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl text-[#5A7A8C]">📝</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#2D3436] dark:text-gray-100 truncate">{post.title}</h3>
                      <StatusBadge status={post.status} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Updated {formatDateShort(post.updated_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {post.status === 'published' && (
                      <a
                        href={`/stories/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#5A7A8C] hover:underline font-medium"
                      >
                        View ↗
                      </a>
                    )}
                    <a
                      href={`/stories/edit/${post.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-[#4A5568] dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-[#5A7A8C] hover:text-[#5A7A8C] transition"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => handleDelete(post)}
                      disabled={deletingId === post.id}
                      className="px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-100 rounded-lg hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      {deletingId === post.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white/90 hover:text-white transition font-normal"
        >
          ← All Stories
        </a>
        <span className="text-sm font-semibold">My Stories</span>
        <a
          href="https://recoverybridge.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/50 hover:text-white/80 transition"
        >
          RecoveryBridge
        </a>
      </div>
    </header>
  )
}
