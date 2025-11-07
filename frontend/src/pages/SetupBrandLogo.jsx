import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Image as ImageIcon, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SetupBrandLogo() {
  const navigate = useNavigate()
  const [logoPreview, setLogoPreview] = useState(null)
  const [fileName, setFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, SVG)')
      return
    }

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!logoPreview) {
      toast.error('Select a logo image before uploading.')
      return
    }

    setIsUploading(true)
    await new Promise(resolve => setTimeout(resolve, 600))
    setIsUploading(false)
    toast.success('Brand logo updated successfully')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <nav className="text-sm mb-4">
          <span className="text-gray-600">Home</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">Setup</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-600">General</span>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-orange-600 font-semibold">Update Brand Logo</span>
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Update Brand Logo</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Upload a crisp brand mark that will be used across receipts, member portals and the CRM. Recommended size 94 × 70 px.
            </p>
          </div>
          <button
            onClick={() => navigate('/branches')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white transition-colors"
          >
            View Profile
            <CheckCircle2 className="h-4 w-4 text-orange-500" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleUpload} className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div>
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-32 w-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <ImageIcon className="h-12 w-12" />
                  <p className="mt-4 text-sm font-medium text-gray-600">Upload logo for CRM & Member App</p>
                  <p className="text-xs text-gray-500">PNG, JPG or SVG • Max 1MB</p>
                </div>
              )}

              <label className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                <Upload className="h-4 w-4" />
                Change Image
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              {fileName && <p className="mt-2 text-xs text-gray-500">Selected: {fileName}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Branding checklist</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-orange-500" />
                  <span>Use a transparent PNG or SVG for the cleanest result against dark and light backgrounds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-orange-500" />
                  <span>Keep the file under 1MB to ensure quick load times inside the member portal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-orange-500" />
                  <span>Revisit this section whenever you refresh your branding assets.</span>
                </li>
              </ul>
            </section>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-700">Where this appears</p>
              <p className="mt-2 text-sm text-gray-600">
                CRM header, receipts, marketing campaigns, check-in kiosks, member app.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isUploading}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors ${
                  isUploading ? 'bg-orange-300 cursor-progress' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading…' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoPreview(null)
                  setFileName('')
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

