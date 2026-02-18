'use client'

import { SPECIALTY_TAGS, MAX_SPECIALTY_TAGS } from '@/lib/constants'
import { Body16 } from '@/components/ui/Typography'

interface TagSelectorProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}

export default function TagSelector({ selectedTags, onChange, disabled }: TagSelectorProps) {
  function toggleTag(tag: string) {
    if (disabled) return

    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag))
    } else if (selectedTags.length < MAX_SPECIALTY_TAGS) {
      onChange([...selectedTags, tag])
    }
  }

  const atLimit = selectedTags.length >= MAX_SPECIALTY_TAGS

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {SPECIALTY_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag)
          const isDisabled = disabled || (!isSelected && atLimit)

          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              disabled={isDisabled}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isSelected
                  ? 'bg-rb-blue text-white shadow-sm'
                  : isDisabled
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
              aria-pressed={isSelected}
            >
              {tag}
            </button>
          )
        })}
      </div>
      <Body16 className="text-xs text-gray-500 mt-2">
        {selectedTags.length}/{MAX_SPECIALTY_TAGS} selected
      </Body16>
    </div>
  )
}
