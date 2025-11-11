import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    branchName: '',
    organizationPhone: '',
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    addressCountry: 'India',
    gstNumber: '',
    taxRate: '',
    taxInclusive: false,
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  })
  const [organizationLogo, setOrganizationLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const currencyOptions = useMemo(
    () => [
      { value: 'INR', label: 'Indian Rupee (INR)' },
      { value: 'USD', label: 'US Dollar (USD)' },
      { value: 'EUR', label: 'Euro (EUR)' },
      { value: 'GBP', label: 'British Pound (GBP)' }
    ],
    []
  )

  const timezoneOptions = useMemo(
    () => [
      { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
      { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
      { value: 'Europe/London', label: 'Europe/London (GMT)' },
      { value: 'America/New_York', label: 'America/New_York (EST)' }
    ],
    []
  )

  const handleChange = (field) => (event) => {
    const { type, value, checked } = event.target
    setFormData((prev) => ({
      ...prev,
      [field]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    setOrganizationLogo(file || null)

    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result?.toString() || null)
      }
      reader.readAsDataURL(file)
    } else {
      setLogoPreview(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = new FormData()

      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        if (typeof value === 'string' && value.trim() === '') return
        if (typeof value === 'boolean') {
          payload.append(key, value ? 'true' : 'false')
        } else {
          payload.append(key, value)
        }
      })

      if (organizationLogo) {
        payload.append('organizationLogo', organizationLogo)
      }

      const { data } = await api.post('/auth/register', payload)
      setAuth(data.token, data.user)
      toast.success('Registration successful!')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Register your gym</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Organization Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                <input
                  required
                  className="input mt-1"
                  value={formData.organizationName}
                  onChange={handleChange('organizationName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization Contact Number</label>
                <input
                  type="tel"
                  className="input mt-1"
                  placeholder="Optional"
                  value={formData.organizationPhone}
                  onChange={handleChange('organizationPhone')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Branch Name</label>
                <input
                  required
                  className="input mt-1"
                  value={formData.branchName}
                  onChange={handleChange('branchName')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Organization Photo / Logo</label>
                <div className="mt-1 flex items-center space-x-4">
                  <label className="inline-flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {organizationLogo ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Organization preview"
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 5MB.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Account Owner</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    required
                    className="input mt-1"
                    value={formData.firstName}
                    onChange={handleChange('firstName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    required
                    className="input mt-1"
                    value={formData.lastName}
                    onChange={handleChange('lastName')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="input mt-1"
                  value={formData.email}
                  onChange={handleChange('email')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    required
                    className="input mt-1"
                    value={formData.phone}
                    onChange={handleChange('phone')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="input mt-1"
                    value={formData.password}
                    onChange={handleChange('password')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Organization Address</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Street Address</label>
                <input
                  className="input mt-1"
                  value={formData.addressStreet}
                  onChange={handleChange('addressStreet')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    className="input mt-1"
                    value={formData.addressCity}
                    onChange={handleChange('addressCity')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    className="input mt-1"
                    value={formData.addressState}
                    onChange={handleChange('addressState')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                  <input
                    className="input mt-1"
                    value={formData.addressZip}
                    onChange={handleChange('addressZip')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country</label>
                  <input
                    className="input mt-1"
                    value={formData.addressCountry}
                    onChange={handleChange('addressCountry')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Billing & Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    className="input mt-1"
                    value={formData.currency}
                    onChange={handleChange('currency')}
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timezone</label>
                  <select
                    className="input mt-1"
                    value={formData.timezone}
                    onChange={handleChange('timezone')}
                  >
                    {timezoneOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">GST Number</label>
                  <input
                    className="input mt-1"
                    placeholder="Optional"
                    value={formData.gstNumber}
                    onChange={handleChange('gstNumber')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="input mt-1"
                    placeholder="Optional"
                    value={formData.taxRate}
                    onChange={handleChange('taxRate')}
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={formData.taxInclusive}
                  onChange={handleChange('taxInclusive')}
                />
                Prices include tax by default
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700">
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

