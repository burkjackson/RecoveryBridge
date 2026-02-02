'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Body16 } from './ui/Typography'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  onUploadComplete: (url: string) => void
}

export default function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)
  const supabase = createClient()

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Create preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const publicUrl = data.publicUrl

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      onUploadComplete(publicUrl)

    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-[#7C9EB2]"
          />
        ) : (
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[#E8E4F0] flex items-center justify-center border-4 border-[#7C9EB2]">
            <span className="text-4xl sm:text-5xl">👤</span>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <label
        htmlFor="avatar-upload"
        className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition ${
          uploading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-[#7C9EB2] text-white hover:bg-[#6B8DA1]'
        }`}
      >
        {uploading ? 'Uploading...' : previewUrl ? 'Change Photo' : 'Upload Photo'}
      </label>
      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      <Body16 className="text-center text-xs sm:text-sm">
        JPG, PNG or GIF. Max 2MB.
      </Body16>
    </div>
  )
}
