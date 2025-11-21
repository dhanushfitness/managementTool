import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Home, 
  ArrowLeft, 
  Search, 
  Sparkles
} from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 px-6 py-12 overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className={`relative z-10 flex flex-col items-center gap-8 text-center max-w-2xl transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* 404 Illustration */}
        <div className="relative">
          <div className="text-[200px] font-black leading-none bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent select-none">
            404
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <Search className="relative w-20 h-20 text-orange-500 animate-bounce" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 -mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
            <Search className="w-4 h-4" />
            Page Not Found
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Oops! Lost in Space
          </h1>
          
          <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
            The page you're looking for seems to have wandered off. Don't worry though, 
            we'll help you find your way back home.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </button>

          <Link
            to="/"
            className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white font-semibold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Back to Dashboard
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          </Link>
        </div>

        {/* Error Code */}
        <div className="mt-8">
          <p className="text-xs text-gray-400 font-mono">
            ERROR_CODE: HTTP_404_NOT_FOUND
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes blob {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `
      }} />
    </div>
  )
}
