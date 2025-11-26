import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import CallLogModal from '../components/CallLogModal'

export default function UpdateEnquiryCall() {
  const navigate = useNavigate()
  const location = useLocation()
  const { enquiryId } = useParams()

  const fallbackPath = location.state?.from || '/taskboard'

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Breadcrumbs />
        <button
          onClick={() => navigate(fallbackPath)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-semibold"
        >
          Back
        </button>
      </div>

      <CallLogModal
        enquiryId={enquiryId}
        mode="page"
        isOpen
        onClose={() => navigate(fallbackPath)}
      />
    </div>
  )
}

