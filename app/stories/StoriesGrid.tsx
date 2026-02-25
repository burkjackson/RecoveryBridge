'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { BlogPostWithAuthor } from '@/lib/types/database'
import { formatDate, readingTime } from './utils'

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="w-7 h-7 rounded-full object-cover" />
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#5A7A8C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function CoverImage({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return <img src={url} alt={title} className="w-full h-full object-cover" />
  }
  const colors = [
    'from-[#5A7A8C] to-[#3A5A6C]',
    'from-[#B8A9C9] to-[#8B7AAC]',
    'from-[#4A6A7C] to-[#2A4A5C]',
    'from-slate-500 to-slate-700',
    'from-teal-500 to-teal-700',
  ]
  const idx = title.charCodeAt(0) % colors.length
  return (
    <div className={`w-full h-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center`}>
      <span className="text-white/30 text-6xl select-none">✦</span>
    </div>
  )
}

interface Props {
  initialPosts: BlogPostWithAuthor[]
  initialHasMore: boolean
}

export function StoriesGrid({ initialPosts, initialHasMore }: Props) {
  const [posts, setPosts] = useState<BlogPostWithAuthor[]>(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    setLoading(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/stories/list?page=${nextPage}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setPosts((prev) => [...prev, ...(data.posts as BlogPostWithAuthor[])])
      setHasMore(data.hasMore)
      setPage(nextPage)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">📖</div>
        <h2 className="text-xl font-semibold text-[#2D3436] mb-2">No stories yet</h2>
        <p className="text-[#4A5568] text-sm max-w-sm mx-auto">
          Be the first to share your experience. Stories from our community will appear here.
        </p>
        <a
          href="/new"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#5A7A8C] text-white text-sm font-semibold rounded-full hover:bg-[#4A6A7C] transition"
        >
          Write the First Story
        </a>
      </div>
    )
  }

  return (
    <>
      {/* Featured post */}
      <Link
        href={`/${posts[0].slug}`}
        className="group block mb-10 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className="sm:flex">
          <div className="sm:w-2/5 h-56 sm:h-auto flex-shrink-0 overflow-hidden">
            <CoverImage url={posts[0].cover_image_url} title={posts[0].title} />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#5A7A8C] uppercase tracking-wider">
                Featured Story
              </span>
              {posts[0].is_pinned && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  📌 Pinned
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#2D3436] leading-tight mb-3 group-hover:text-[#5A7A8C] transition">
              {posts[0].title}
            </h2>
            {posts[0].excerpt && (
              <p className="text-[#4A5568] text-sm leading-relaxed line-clamp-3 mb-3">
                {posts[0].excerpt}
              </p>
            )}
            {posts[0].tags && posts[0].tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {posts[0].tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-[#E8F0F4] text-[#5A7A8C] text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <AuthorAvatar name={posts[0].author.display_name} avatarUrl={posts[0].author.avatar_url} />
              <span className="text-xs text-[#4A5568]">{posts[0].author.display_name}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{formatDate(posts[0].published_at!)}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{readingTime(posts[0].word_count)} min read</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Grid */}
      {posts.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.slice(1).map((post) => (
            <Link
              key={post.id}
              href={`/${post.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div className="aspect-video overflow-hidden flex-shrink-0">
                <CoverImage url={post.cover_image_url} title={post.title} />
              </div>
              <div className="p-5 flex flex-col flex-1">
                {post.is_pinned && (
                  <span className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold self-start">
                    📌 Pinned
                  </span>
                )}
                <h3 className="text-base font-bold text-[#2D3436] leading-snug mb-2 line-clamp-2 group-hover:text-[#5A7A8C] transition">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-sm text-[#4A5568] leading-relaxed line-clamp-2 mb-3 flex-1">
                    {post.excerpt}
                  </p>
                )}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-[#E8F0F4] text-[#5A7A8C] text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  <AuthorAvatar name={post.author.display_name} avatarUrl={post.author.avatar_url} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#2D3436] truncate">{post.author.display_name}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(post.published_at!)} · {readingTime(post.word_count)} min read
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-10 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 text-sm font-semibold text-[#5A7A8C] border border-[#5A7A8C] rounded-full hover:bg-[#5A7A8C] hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#5A7A8C] border-t-transparent rounded-full animate-spin" />
                Loading…
              </span>
            ) : (
              'Load More Stories'
            )}
          </button>
        </div>
      )}
    </>
  )
}
