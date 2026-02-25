import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { BlogPostWithAuthor } from '@/lib/types/database'

export const metadata: Metadata = {
  title: 'Stories — RecoveryBridge',
  description: 'Stories, insights, and hope from the recovery community.',
  openGraph: {
    title: 'RecoveryBridge Stories',
    description: 'Stories, insights, and hope from the recovery community.',
    url: 'https://stories.recoverybridge.app',
  },
}

// Revalidate every 60 seconds so new published posts appear promptly
export const revalidate = 60

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function AuthorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-7 h-7 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full bg-[#5A7A8C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function CoverImage({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={title}
        className="w-full h-full object-cover"
      />
    )
  }
  // Fallback gradient — deterministic based on title char code
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

export default async function StoriesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: posts } = await supabase
    .from('blog_posts')
    .select(`
      id, title, slug, excerpt, cover_image_url, published_at, author_id,
      author:profiles!author_id(display_name, avatar_url, user_role)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const typedPosts = (posts || []) as unknown as BlogPostWithAuthor[]

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans">
      {/* Header */}
      <header className="bg-[#2D3436] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div>
            <a
              href="https://recoverybridge.app"
              className="text-xs text-white/50 hover:text-white/80 transition mb-1 inline-block"
            >
              ← RecoveryBridge
            </a>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stories</h1>
            <p className="text-sm text-white/60 mt-0.5">From the recovery community</p>
          </div>
          <a
            href="/new"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-full transition border border-white/20"
          >
            ✍️ Write a Story
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {typedPosts.length === 0 ? (
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
        ) : (
          <>
            {/* Featured post — first published */}
            {typedPosts.length > 0 && (
              <Link
                href={`/${typedPosts[0].slug}`}
                className="group block mb-10 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="sm:flex">
                  <div className="sm:w-2/5 h-56 sm:h-auto flex-shrink-0 overflow-hidden">
                    <CoverImage url={typedPosts[0].cover_image_url} title={typedPosts[0].title} />
                  </div>
                  <div className="p-6 sm:p-8 flex flex-col justify-center">
                    <span className="text-xs font-semibold text-[#5A7A8C] uppercase tracking-wider mb-2">
                      Featured Story
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#2D3436] leading-tight mb-3 group-hover:text-[#5A7A8C] transition">
                      {typedPosts[0].title}
                    </h2>
                    {typedPosts[0].excerpt && (
                      <p className="text-[#4A5568] text-sm leading-relaxed line-clamp-3 mb-4">
                        {typedPosts[0].excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <AuthorAvatar
                        name={typedPosts[0].author.display_name}
                        avatarUrl={typedPosts[0].author.avatar_url}
                      />
                      <span className="text-xs text-[#4A5568]">
                        {typedPosts[0].author.display_name}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {formatDate(typedPosts[0].published_at!)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid for the rest */}
            {typedPosts.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {typedPosts.slice(1).map((post) => (
                  <Link
                    key={post.id}
                    href={`/${post.slug}`}
                    className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
                  >
                    {/* Cover */}
                    <div className="aspect-video overflow-hidden flex-shrink-0">
                      <CoverImage url={post.cover_image_url} title={post.title} />
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-[#2D3436] leading-snug mb-2 line-clamp-2 group-hover:text-[#5A7A8C] transition">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-sm text-[#4A5568] leading-relaxed line-clamp-2 mb-4 flex-1">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-auto">
                        <AuthorAvatar
                          name={post.author.display_name}
                          avatarUrl={post.author.avatar_url}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#2D3436] truncate">
                            {post.author.display_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(post.published_at!)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 py-8 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} RecoveryBridge ·{' '}
          <a href="https://recoverybridge.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#5A7A8C] transition">
            recoverybridge.app
          </a>
          {' · '}
          <a href="https://recoverybridge.app/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#5A7A8C] transition">
            Privacy
          </a>
        </p>
      </footer>
    </div>
  )
}
