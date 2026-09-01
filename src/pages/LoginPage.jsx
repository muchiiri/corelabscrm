import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { validateLoginForm } from '@/lib/validateLoginForm'
import { getLoginErrorMessage } from '@/lib/getLoginErrorMessage'
import { supabase } from '@/lib/supabase'

const INITIAL_VALUES = { email: '', password: '' }

function LoginPage() {
  const navigate = useNavigate()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateLoginForm(values)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (signInError) {
      console.error('Sign-in failed:', signInError)
      setSubmitError(getLoginErrorMessage(signInError))
      setIsSubmitting(false)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-heading">Log in</CardTitle>
          <CardDescription>Welcome back to TaskFlow CRM.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            {submitError && (
              <p className="rounded-sm bg-danger-bg px-3 py-2 text-sm text-danger">{submitError}</p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={values.password}
                onChange={handleChange}
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <p className="text-xs text-danger">{errors.password}</p>}
            </div>
            <Button type="submit" className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-faint">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" disabled>
              Continue with Google
            </Button>
            <Button type="button" variant="outline" disabled>
              Continue with GitHub
            </Button>
            <Button type="button" variant="outline" disabled>
              Continue with Microsoft
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-faint">SSO coming soon</p>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted">
          Don&apos;t have an account?&nbsp;
          <Link to="/signup" className="text-secondary hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

export default LoginPage
