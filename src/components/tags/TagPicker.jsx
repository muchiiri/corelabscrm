import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TagBadge from '@/components/tags/TagBadge'
import { validateTagName } from '@/lib/validateTagName'
import { cn } from '@/lib/utils'

const TAG_COLORS = ['gray', 'red', 'orange', 'green', 'blue', 'purple']

// Reuses each color's -text token (solid and saturated) as the swatch
// fill - the -bg token is intentionally pale, meant for pill backgrounds,
// not a solid swatch.
const SWATCH_CLASS = {
  gray: 'bg-tag-gray-text',
  red: 'bg-tag-red-text',
  orange: 'bg-tag-orange-text',
  green: 'bg-tag-green-text',
  blue: 'bg-tag-blue-text',
  purple: 'bg-tag-purple-text',
}

function TagPicker({ tags, selectedTagIds, onChange, onCreateTag, readOnly = false }) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('gray')
  const [error, setError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  function toggle(tagId) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  async function handleCreate() {
    const errors = validateTagName(
      { name: newName },
      tags.map((tag) => tag.name),
    )
    if (errors.name) {
      setError(errors.name)
      return
    }

    setError(null)
    setIsCreating(true)
    try {
      const created = await onCreateTag(newName, newColor)
      onChange([...selectedTagIds, created.id])
      setNewName('')
      setNewColor('gray')
    } catch (createError) {
      console.error('Failed to create tag:', createError)
      setError('Something went wrong creating that tag. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2">
              <Checkbox checked={selectedTagIds.includes(tag.id)} onChange={() => toggle(tag.id)} disabled={readOnly} />
              <TagBadge name={tag.name} color={tag.color} />
            </label>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="New tag name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              aria-invalid={Boolean(error)}
            />
            <Button type="button" variant="outline" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <div className="flex gap-1.5">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`${color} tag color`}
                onClick={() => setNewColor(color)}
                className={cn(
                  'h-5 w-5 rounded-full border-2',
                  SWATCH_CLASS[color],
                  newColor === color ? 'border-text' : 'border-transparent',
                )}
              />
            ))}
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default TagPicker
export { TAG_COLORS, SWATCH_CLASS }
