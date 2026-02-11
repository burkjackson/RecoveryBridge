'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Body16 } from './ui/Typography'
import Cropper from 'react-easy-crop'
import { Point, Area } from 'react-easy-crop/types'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string | null
  onUploadComplete: (url: string) => void
}

// Helper function to create image from URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

// Helper function to get cropped image
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to the crop size
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.95)
  })
}

export default function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null)

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  const supabase = createClient()

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const file = event.target.files[0]

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Create preview and open crop modal
      const objectUrl = URL.createObjectURL(file)
      setOriginalFile(file)
      setImageToCrop(objectUrl)
      setShowCropModal(true)
      setZoom(1)
      setCrop({ x: 0, y: 0 })

    } catch (error: any) {
      alert(error.message)
    }
  }

  async function handleCropConfirm() {
    if (!imageToCrop || !croppedAreaPixels || !originalFile) return

    try {
      setUploading(true)
      setShowCropModal(false)

      // Get the cropped image as a blob
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels)

      // Create a file from the blob
      const fileExt = originalFile.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const croppedFile = new File([croppedImageBlob], fileName, { type: 'image/jpeg' })

      // Upload to Supabase Storage
      const filePath = `${fileName}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedFile, { upsert: true })

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

      // Update preview
      setPreviewUrl(publicUrl)
      onUploadComplete(publicUrl)

      // Cleanup
      URL.revokeObjectURL(imageToCrop)
      setImageToCrop(null)
      setOriginalFile(null)

    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  function handleCropCancel() {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
    }
    setShowCropModal(false)
    setImageToCrop(null)
    setOriginalFile(null)
  }

  return (
    <>
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
          JPG, PNG or GIF. Max 5MB.
        </Body16>
      </div>

      {/* Crop Modal */}
      {showCropModal && imageToCrop && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Adjust Your Photo</h3>
              <p className="text-sm text-gray-600 mt-1">
                Zoom and position your photo to fit the circle
              </p>
            </div>

            {/* Crop Area */}
            <div className="relative h-96 bg-gray-100">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            {/* Zoom Slider */}
            <div className="p-6 border-t border-gray-200">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7C9EB2]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>1x</span>
                <span>2x</span>
                <span>3x</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={handleCropCancel}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={uploading}
                className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-[#7C9EB2] hover:bg-[#6B8DA1] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
