import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to admin dashboard as this is primarily an admin platform
  redirect('/admin')
}
