import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HelpCircle } from 'lucide-react';
import { createBranch, updateBranch, getBranch } from '../api/organization';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Time options for dropdowns
const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return [`${hour}:00`, `${hour}:30`];
}).flat();

// Country options
const countries = ['India', 'USA', 'UK', 'UAE', 'Singapore'];
const states = ['Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Gujarat'];
const cities = ['Bengaluru', 'Mumbai', 'Delhi', 'Chennai', 'Ahmedabad'];
const localities = ['Indiranagar', 'Koramangala', 'Whitefield', 'HSR Layout', 'Marathahalli'];

const businessTypes = ['Gym', 'Yoga Studio', 'Fitness Center', 'Personal Training', 'CrossFit', 'Other'];
const currencies = ['INR', 'USD', 'GBP', 'AED', 'SGD'];
const timezones = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Singapore'
];

export default function BranchManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branchId = searchParams.get('id');
  const isEdit = !!branchId;

  // Step 1: Business/Interest Group Profile
  const [profileData, setProfileData] = useState({
    country: '',
    state: '',
    city: '',
    locality: '',
    currency: 'INR',
    region: ''
  });

  // Step 2: Branch Management
  const [branchData, setBranchData] = useState({
    name: '',
    code: '',
    timezone: 'Asia/Kolkata',
    businessType: '',
    brandName: '',
    countryCode: '+91',
    phone: '',
    email: '',
    latitude: 0,
    longitude: 0,
    address: {
      fullAddress: ''
    },
    area: 0
  });

  // Step 3: Operating Hours
  const [operatingHours, setOperatingHours] = useState({
    monday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' },
    tuesday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' },
    wednesday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' },
    thursday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' },
    friday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' },
    saturday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' },
    sunday: { open: '09:00', close: '18:00', isClosed: false, breakStart: '', breakEnd: '' }
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch branch data if editing
  const { data: branchResponse, isLoading } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => getBranch(branchId),
    enabled: isEdit && !!branchId,
    onSuccess: (data) => {
      if (data?.success && data?.branch) {
        const branch = data.branch;
        setProfileData({
          country: branch.country || '',
          state: branch.state || '',
          city: branch.city || '',
          locality: branch.locality || '',
          currency: branch.currency || 'INR',
          region: branch.region || ''
        });
        setBranchData({
          name: branch.name || '',
          code: branch.code || '',
          timezone: branch.timezone || 'Asia/Kolkata',
          businessType: branch.businessType || '',
          brandName: branch.brandName || '',
          countryCode: branch.countryCode || '+91',
          phone: branch.phone || '',
          email: branch.email || '',
          latitude: branch.latitude || 0,
          longitude: branch.longitude || 0,
          address: {
            fullAddress: branch.address?.fullAddress || ''
          },
          area: branch.area || 0
        });
        if (branch.operatingHours) {
          setOperatingHours(branch.operatingHours);
        }
      }
    }
  });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Branch created successfully');
        navigate('/branches');
      } else {
        toast.error(data.message || 'Failed to create branch');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create branch');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateBranch(branchId, data),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Branch updated successfully');
        navigate('/branches');
      } else {
        toast.error(data.message || 'Failed to update branch');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update branch');
    }
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleBranchChange = (e) => {
    const { name, value } = e.target;
    setBranchData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e) => {
    const { value } = e.target;
    setBranchData(prev => ({
      ...prev,
      address: { ...prev.address, fullAddress: value }
    }));
  };

  const handleOperatingHoursChange = (day, field, value) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const copyToNextDay = (currentDayIndex) => {
    if (currentDayIndex < days.length - 1) {
      const nextDay = days[currentDayIndex + 1];
      const currentDay = days[currentDayIndex];
      setOperatingHours(prev => ({
        ...prev,
        [nextDay]: { ...prev[currentDay] }
      }));
      toast.success(`Copied to ${dayLabels[currentDayIndex + 1]}`);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!profileData.country || !profileData.state || !profileData.city || !profileData.locality || !profileData.currency) {
        toast.error('Please fill all required fields');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate step 2
      if (!branchData.name || !branchData.code || !branchData.timezone || !branchData.businessType || 
          !branchData.brandName || !branchData.address.fullAddress) {
        toast.error('Please fill all required fields');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleSubmit = () => {
    if (!agreedToTerms) {
      toast.error('You must agree to Terms and Conditions');
      return;
    }

    const submitData = {
      ...profileData,
      ...branchData,
      operatingHours,
      agreedToTerms
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <nav className="text-sm text-gray-600">
          <span>Home / Setup / General / </span>
          <span className="text-orange-600 font-medium">Let's create the business or Interest group profile</span>
        </nav>
        <div className="flex justify-end space-x-3 mt-2">
          <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            View Profile
          </button>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            CRM Logo
          </button>
        </div>
      </div>

      {/* Step 1: Business/Interest Group Profile */}
      {currentStep === 1 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Business/Interest Group Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country"
                value={profileData.country}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State/Region <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={profileData.state}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <select
                name="city"
                value={profileData.city}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Locality <span className="text-red-500">*</span>
              </label>
              <select
                name="locality"
                value={profileData.locality}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select Locality</option>
                {localities.map(locality => (
                  <option key={locality} value={locality}>{locality}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                value={profileData.currency}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                name="region"
                value={profileData.region}
                onChange={handleProfileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="Central">Central</option>
              </select>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Branch Management */}
      {currentStep === 2 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Branch Management</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                <option value="">Select</option>
                <option value="North">North</option>
                <option value="South">South</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone <span className="text-red-500">*</span>
              </label>
              <select
                name="timezone"
                value={branchData.timezone}
                onChange={handleBranchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select
                name="businessType"
                value={branchData.businessType}
                onChange={handleBranchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="brandName"
                value={branchData.brandName}
                onChange={handleBranchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={branchData.name}
                onChange={handleBranchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={branchData.code}
                onChange={handleBranchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Phone Number
              </label>
              <div className="flex">
                <select
                  name="countryCode"
                  value={branchData.countryCode}
                  onChange={handleBranchChange}
                  className="px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="+91">+91</option>
                  <option value="+1">+1</option>
                  <option value="+44">+44</option>
                </select>
                <input
                  type="tel"
                  name="phone"
                  value={branchData.phone}
                  onChange={handleBranchChange}
                  className="flex-1 px-4 py-2 border border-gray-300 border-l-0 rounded-r-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Phone Number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch e-mail id
              </label>
              <input
                type="email"
                name="email"
                value={branchData.email}
                onChange={handleBranchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="latitude"
                  value={branchData.latitude}
                  onChange={handleBranchChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  step="any"
                />
                <span className="text-sm text-blue-600 flex items-center cursor-pointer">
                  Help <HelpCircle className="w-4 h-4 ml-1" />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="longitude"
                  value={branchData.longitude}
                  onChange={handleBranchChange}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  step="any"
                />
                <span className="text-sm text-blue-600 flex items-center cursor-pointer">
                  Help <HelpCircle className="w-4 h-4 ml-1" />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="fullAddress"
                value={branchData.address.fullAddress}
                onChange={handleAddressChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                placeholder="Enter full address"
                required
              />
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Operating Hours & Area */}
      {currentStep === 3 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Operating Hours & Area</h2>
          
          {/* Operating Hours Table */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Operating Hours <span className="text-red-500">*</span>
            </label>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Days</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Select Operating Hour</th>
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">Select Break Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day, index) => (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={operatingHours[day].isClosed}
                            onChange={(e) => handleOperatingHoursChange(day, 'isClosed', e.target.checked)}
                            className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                          />
                          <span>We are closed</span>
                          <span className="ml-2 font-medium">{dayLabels[index]}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <select
                            value={operatingHours[day].open}
                            onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                            disabled={operatingHours[day].isClosed}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span>to</span>
                          <select
                            value={operatingHours[day].close}
                            onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                            disabled={operatingHours[day].isClosed}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <select
                            value={operatingHours[day].breakStart}
                            onChange={(e) => handleOperatingHoursChange(day, 'breakStart', e.target.value)}
                            disabled={operatingHours[day].isClosed}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span>to</span>
                          <select
                            value={operatingHours[day].breakEnd}
                            onChange={(e) => handleOperatingHoursChange(day, 'breakEnd', e.target.value)}
                            disabled={operatingHours[day].isClosed}
                            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select</option>
                            {timeOptions.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          {index < days.length - 1 && (
                            <button
                              onClick={() => copyToNextDay(index)}
                              className="ml-2 text-sm text-blue-600 hover:text-blue-700 underline"
                            >
                              Copy to next day
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Area (Sqft)
            </label>
            <input
              type="number"
              value={branchData.area}
              onChange={(e) => setBranchData(prev => ({ ...prev, area: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter area in square feet"
            />
          </div>

          {/* Terms and Conditions */}
          <div className="mb-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                required
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</a>
                {' '}&{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          {/* Info Message */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              Once we have received your form, one of our representatives will be in touch. If we fail to get in touch with you, we may not list your business or interest group details.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : 'Continue to plan selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

