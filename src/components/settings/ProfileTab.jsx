import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateProfileName } from '@/lib/validateProfileName'
import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/ThemeContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function ProfileTab() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', user.id)
        .single()

      if (cancelled) {
        return
      }
      if (error || !data) {
        console.error('Failed to load profile:', error)
        setLoadError(true)
        setLoading(false)
        return
      }

      setProfile(data)
      setName(data.name)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user.id])

  function handleChange(event) {
    setName(event.target.value)
    setSaveSuccess(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateProfileName({ name })
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setSaveSuccess(false)
    setIsSubmitting(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update profile:', updateError)
      setSubmitError('Something went wrong saving your changes. Please try again.')
      setIsSubmitting(false)
      return
    }

    setProfile((prev) => ({ ...prev, name }))
    setSaveSuccess(true)
    setIsSubmitting(false)
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading...</p>
  }

  if (loadError) {
    return (
      <p className="text-sm text-danger">
        Something went wrong loading your profile. Please try again.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-heading">Your profile</CardTitle>
          <CardDescription>Visible to everyone in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={profile.name} email={profile.email} className="h-16 w-16 text-lg" />
            <Button type="button" variant="outline" size="sm" disabled>
              Upload photo
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled>
              Remove
            </Button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
            )}
            {saveSuccess && (
              <p className="rounded-sm bg-border px-3 py-2 text-sm text-text">Saved.</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="jobTitle">Job title</Label>
                <Input id="jobTitle" type="text" value="" placeholder="Not set" disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} disabled />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:w-1/3">
              <Label htmlFor="timeZone">Time zone</Label>
              <Input id="timeZone" type="text" value="" placeholder="Not set" disabled />
            </div>
            <Button type="submit" className="mt-2 self-start" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading">Appearance</CardTitle>
          <CardDescription>Applies to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => theme !== 'light' && toggleTheme()}
              className={cn(
                'flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition',
                theme === 'light'
                  ? 'border-accent-border bg-accent-bg'
                  : 'border-border hover:bg-surface-hover',
              )}
            >
              <span className="text-sm font-semibold text-text">Light</span>
              <span className="text-xs text-muted">Default paper white</span>
            </button>
            <button
              type="button"
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={cn(
                'flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition',
                theme === 'dark'
                  ? 'border-accent-border bg-accent-bg'
                  : 'border-border hover:bg-surface-hover',
              )}
            >
              <span className="text-sm font-semibold text-text">Dark</span>
              <span className="text-xs text-muted">Dimmed for evenings</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfileTab
