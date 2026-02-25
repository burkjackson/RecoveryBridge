'use client'

import { SPECIALTY_TAGS } from '@/lib/constants'

const MAX_STORY_TAGS = 3

interface Props {
  selected: string[]
  onChange: (tags: string[]) => void
}

export function StoryTagSelector({ selected, onChange }: Props) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag))
    } else if (selected.length < MAX_STORY_TAGS) {
      onChange([...selected, tag])
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-[#2D3436]">
          Topic Tags <span className="font-normal text-gray-400">(optional — up to {MAX_STORY_TAGS})</span>
        </label>
        <span className={`text-xs ${selected.length >= MAX_STORY_TAGS ? 'text-amber-500 font-semibold' : 'text-gray-400'}`}>
          {selected.length}/{MAX_STORY_TAGS}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SPECIALTY_TAGS.map((tag) => {
          const isSelected = selected.includes(tag)
          const isDisabled = !isSelected && selected.length >= MAX_STORY_TAGS
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              disabled={isDisabled}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                isSelected
                  ? 'bg-[#5A7A8C] text-white border-[#5A7A8C]'
                  : isDisabled
                  ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  : 'bg-white text-[#4A5568] border-gray-200 hover:border-[#5A7A8C] hover:text-[#5A7A8C]'
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
