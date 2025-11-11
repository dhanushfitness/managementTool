import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-6 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-500">404</p>
        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
          Page not found
        </h1>
        <p className="max-w-md text-base text-gray-600">
          The page you’re looking for doesn’t exist or has been moved. Try heading back to the dashboard.
        </p>
        <Link
          to="/"
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}

