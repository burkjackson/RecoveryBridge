import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/slugify'
import type { BlogPostStatus } from '@/lib/types/database'

const ELIGIBLE_ROLES = ['professional', 'ally']

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify auth
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Verify eligibility
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_role, is_admin')
    .eq('id', user.id)
    .single()

  const isEligible = profile?.is_admin || ELIGIBLE_ROLES.includes(profile?.user_role ?? '')
  if (!isEligible) {
    return NextResponse.json({ error: 'Not eligible to write stories' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, title, excerpt, content, cover_image_url, status,
            author_website, author_instagram, author_twitter, author_linkedin,
            author_threads, author_youtube } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const allowedStatuses: BlogPostStatus[] = ['draft', 'submitted']
    const postStatus: BlogPostStatus = allowedStatuses.includes(status) ? status : 'draft'

    if (id) {
      // Update existing post — verify ownership
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('author_id, status')
        .eq('id', id)
        .single()

      if (!existing) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }

      // Only admin can update others' posts
      if (existing.author_id !== user.id && !profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const updateData: Record<string, unknown> = {
        title: title.trim(),
        excerpt: excerpt?.trim() || null,
        content: content.trim(),
        cover_image_url: cover_image_url || null,
        status: postStatus,
        author_website: author_website?.trim() || null,
        author_instagram: author_instagram?.trim() || null,
        author_twitter: author_twitter?.trim() || null,
        author_linkedin: author_linkedin?.trim() || null,
        author_threads: author_threads?.trim() || null,
        author_youtube: author_youtube?.trim() || null,
      }

      // Clear rejection note when resubmitting
      if (postStatus === 'submitted') {
        updateData.rejection_note = null
      }

      const { data: updated, error: updateError } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select('id, slug')
        .single()

      if (updateError) throw updateError

      return NextResponse.json({ id: updated.id, slug: updated.slug })
    } else {
      // Create new post — generate unique slug
      const baseSlug = slugify(title.trim())
      let slug = baseSlug
      let attempt = 0

      while (true) {
        const { data: existing } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

        if (!existing) break
        attempt++
        slug = `${baseSlug}-${attempt + 1}`
      }

      const { data: created, error: createError } = await supabase
        .from('blog_posts')
        .insert([{
          author_id: user.id,
          title: title.trim(),
          slug,
          excerpt: excerpt?.trim() || null,
          content: content.trim(),
          cover_image_url: cover_image_url || null,
          status: postStatus,
          author_website: author_website?.trim() || null,
          author_instagram: author_instagram?.trim() || null,
          author_twitter: author_twitter?.trim() || null,
          author_linkedin: author_linkedin?.trim() || null,
        }])
        .select('id, slug')
        .single()

      if (createError) throw createError

      return NextResponse.json({ id: created.id, slug: created.slug })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Story save error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('author_id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (existing.author_id !== user.id && !profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', id)

  if (deleteError) throw deleteError

  return NextResponse.json({ success: true })
}
