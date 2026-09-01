import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { Button } from '@/components/ui/button'

function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text">
      <p className="text-muted">
        Dashboard - coming soon{user && <> - logged in as {user.email}</>}
      </p>
      <Button type="button" variant="outline" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  )
}

export default DashboardPage
