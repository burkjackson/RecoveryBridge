import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { marked } from 'marked'
import type { BlogPostWithAuthor } from '@/lib/types/database'
import { IconWebsite, IconInstagram, IconX, IconLinkedIn, IconThreads, IconYouTube } from '@/components/SocialIcons'
import { BackToStories } from './BackToStories'
import { AuthorEditButton } from './AuthorEditButton'
import { formatDate, readingTime } from '../utils'
import { ShareButtons } from './ShareButtons'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: post } = await supabase
    .from('blog_posts')
    .select('title, excerpt, cover_image_url')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) return { title: 'Story Not Found — RecoveryBridge' }

  return {
    title: `${post.title} — RecoveryBridge Stories`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url }]
        : [{ url: 'https://stories.recoverybridge.app/og-default.png', width: 1200, height: 630 }],
      url: `https://stories.recoverybridge.app/${slug}`,
    },
  }
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: post } = await supabase
    .from('blog_posts')
    .select(`
      id, title, slug, excerpt, content, cover_image_url, published_at, author_id, word_count, tags,
      author_website, author_instagram, author_twitter, author_linkedin, author_threads, author_youtube,
      author:profiles!author_id(display_name, avatar_url, user_role)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!post) notFound()

  const typedPost = post as unknown as BlogPostWithAuthor
  const htmlContent = await marked(typedPost.content)

  // Related stories: tag-overlap first, fall back to most recent
  let relatedPosts: BlogPostWithAuthor[] = []
  if (typedPost.tags && typedPost.tags.length > 0) {
    const { data: tagMatches } = await supabase
      .from('blog_posts')
      .select(`id, title, slug, excerpt, cover_image_url, published_at, author_id, word_count, tags, author:profiles!author_id(display_name, avatar_url, user_role)`)
      .eq('status', 'published')
      .neq('id', typedPost.id)
      .overlaps('tags', typedPost.tags)
      .order('published_at', { ascending: false })
      .limit(3)
    relatedPosts = (tagMatches || []) as unknown as BlogPostWithAuthor[]
  }
  if (relatedPosts.length < 2) {
    const { data: recent } = await supabase
      .from('blog_posts')
      .select(`id, title, slug, excerpt, cover_image_url, published_at, author_id, word_count, tags, author:profiles!author_id(display_name, avatar_url, user_role)`)
      .eq('status', 'published')
      .neq('id', typedPost.id)
      .order('published_at', { ascending: false })
      .limit(3)
    relatedPosts = (recent || []) as unknown as BlogPostWithAuthor[]
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-[#2D3436] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <BackToStories />
          <div className="flex items-center gap-3">
            <AuthorEditButton authorId={typedPost.author_id} postId={typedPost.id} />
            <a
              href="https://recoverybridge.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/50 hover:text-white/80 transition"
            >
              RecoveryBridge
            </a>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {typedPost.cover_image_url && (
        <div className="w-full h-64 sm:h-96 overflow-hidden bg-gray-100">
          <img
            src={typedPost.cover_image_url}
            alt={typedPost.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Article */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Meta */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2D3436] leading-tight mb-4">
            {typedPost.title}
          </h1>

          {typedPost.excerpt && (
            <p className="text-lg text-[#4A5568] leading-relaxed italic mb-6 border-l-4 border-[#E8EEF2] pl-4">
              {typedPost.excerpt}
            </p>
          )}

          {/* Author byline */}
          <div className="flex items-center gap-3 py-4 border-y border-gray-100">
            {typedPost.author.avatar_url ? (
              <img
                src={typedPost.author.avatar_url}
                alt={typedPost.author.display_name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#5A7A8C] flex items-center justify-center text-white font-bold flex-shrink-0">
                {typedPost.author.display_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[#2D3436]">
                {typedPost.author.display_name}
              </p>
              <p className="text-xs text-gray-400">
                {typedPost.published_at ? formatDate(typedPost.published_at) : ''}
                {' · '}{readingTime(typedPost.word_count, typedPost.content)} min read
              </p>
            </div>
          </div>
        </div>

        {/* Topic tags */}
        {typedPost.tags && typedPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4 pb-2">
            {typedPost.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-[#E8F0F4] text-[#5A7A8C] text-xs font-semibold">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Author social links */}
        {(typedPost.author_website || typedPost.author_instagram || typedPost.author_twitter ||
          typedPost.author_linkedin || typedPost.author_threads || typedPost.author_youtube) && (
          <div className="flex flex-wrap gap-3 py-4 border-b border-gray-100">
            {typedPost.author_website && (
              <a href={typedPost.author_website} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#E8EEF2] text-xs font-medium text-[#4A5568] transition">
                <IconWebsite className="w-3.5 h-3.5 flex-shrink-0" />
                Website
              </a>
            )}
            {typedPost.author_instagram && (
              <a href={`https://instagram.com/${typedPost.author_instagram}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#E8EEF2] text-xs font-medium text-[#4A5568] transition">
                <IconInstagram className="w-3.5 h-3.5 flex-shrink-0" />
                @{typedPost.author_instagram}
              </a>
            )}
            {typedPost.author_twitter && (
              <a href={`https://x.com/${typedPost.author_twitter}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#E8EEF2] text-xs font-medium text-[#4A5568] transition">
                <IconX className="w-3.5 h-3.5 flex-shrink-0" />
                @{typedPost.author_twitter}
              </a>
            )}
            {typedPost.author_threads && (
              <a href={`https://threads.net/@${typedPost.author_threads}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#E8EEF2] text-xs font-medium text-[#4A5568] transition">
                <IconThreads className="w-3.5 h-3.5 flex-shrink-0" />
                @{typedPost.author_threads}
              </a>
            )}
            {typedPost.author_linkedin && (
              <a href={typedPost.author_linkedin} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#E8EEF2] text-xs font-medium text-[#4A5568] transition">
                <IconLinkedIn className="w-3.5 h-3.5 flex-shrink-0" />
                LinkedIn
              </a>
            )}
            {typedPost.author_youtube && (
              <a href={typedPost.author_youtube} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-[#E8EEF2] text-xs font-medium text-[#4A5568] transition">
                <IconYouTube className="w-3.5 h-3.5 flex-shrink-0" />
                YouTube
              </a>
            )}
          </div>
        )}

        {/* Rendered markdown content */}
        <article
          className="prose prose-slate max-w-none prose-headings:text-[#2D3436] prose-a:text-[#5A7A8C] prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-[#5A7A8C] prose-blockquote:text-[#4A5568] prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Share buttons */}
        <ShareButtons slug={typedPost.slug} title={typedPost.title} />

        {/* Back link */}
        <div className="mt-4">
          <BackToStories label="← Back to all stories" variant="article" />
        </div>
      </main>

      {/* Related Stories */}
      {relatedPosts.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 border-t border-gray-100">
          <h2 className="text-lg font-bold text-[#2D3436] mb-5">More Stories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {relatedPosts.map((related) => (
              <a
                key={related.id}
                href={`/${related.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col border border-gray-100"
              >
                <div className="aspect-video overflow-hidden flex-shrink-0 bg-gray-100">
                  {related.cover_image_url ? (
                    <img src={related.cover_image_url} alt={related.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#5A7A8C] to-[#3A5A6C] flex items-center justify-center">
                      <span className="text-white/20 text-4xl select-none">✦</span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-[#2D3436] leading-snug mb-1 line-clamp-2 group-hover:text-[#5A7A8C] transition">
                    {related.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-auto pt-2">
                    {related.author.display_name}
                    {related.word_count ? ` · ${readingTime(related.word_count)} min read` : ''}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-8 py-8 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} RecoveryBridge ·{' '}
          <a href="https://recoverybridge.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#5A7A8C] transition">
            recoverybridge.app
          </a>
        </p>
      </footer>
    </div>
  )
}
