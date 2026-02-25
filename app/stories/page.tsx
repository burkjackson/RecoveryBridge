import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import type { BlogPostWithAuthor } from '@/lib/types/database'
import { StoriesGrid } from './StoriesGrid'

export const metadata: Metadata = {
  title: 'Stories — RecoveryBridge',
  description: 'Stories, insights, and hope from the recovery community.',
  openGraph: {
    title: 'RecoveryBridge Stories',
    description: 'Stories, insights, and hope from the recovery community.',
    url: 'https://stories.recoverybridge.app',
    images: [{ url: 'https://stories.recoverybridge.app/og-default.png', width: 1200, height: 630 }],
  },
}

export const revalidate = 60

const PAGE_SIZE = 9

export default async function StoriesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: posts, count } = await supabase
    .from('blog_posts')
    .select(`
      id, title, slug, excerpt, cover_image_url, published_at, author_id, word_count, tags,
      author:profiles!author_id(display_name, avatar_url, user_role)
    `, { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  const typedPosts = (posts || []) as unknown as BlogPostWithAuthor[]
  const initialHasMore = (count ?? 0) > PAGE_SIZE

  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans">
      {/* Header */}
      <header className="bg-[#2D3436] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <a
                href="https://recoverybridge.app"
                target="_blank"
                rel="noopener noreferrer"
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
          <a
            href="/new"
            className="mt-4 sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-full transition border border-white/20"
          >
            ✍️ Write a Story
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <StoriesGrid initialPosts={typedPosts} initialHasMore={initialHasMore} />
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
