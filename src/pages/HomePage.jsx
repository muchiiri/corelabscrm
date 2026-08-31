import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg text-text">
      <h1 className="text-heading font-semibold">TaskFlow CRM</h1>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/login">Log in</Link>
        </Button>
        <Button asChild>
          <Link to="/signup">Sign up</Link>
        </Button>
      </div>
    </div>
  )
}

export default HomePage
