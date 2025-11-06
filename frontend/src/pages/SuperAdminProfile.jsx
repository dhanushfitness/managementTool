import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { getAdminProfile, updateAdminProfile, changePassword } from '../api/admin';
import LoadingPage from '../components/LoadingPage';
import LoadingSpinner from '../components/LoadingSpinner';

// Country codes for dropdown
const countryCodes = [
  { code: '+91', country: 'India (+91)' },
  { code: '+1', country: 'USA (+1)' },
  { code: '+44', country: 'UK (+44)' },
  { code: '+971', country: 'UAE (+971)' },
  { code: '+65', country: 'Singapore (+65)' },
];

// Timezone options
const timezones = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
];

export default function SuperAdminProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    countryCode: '+91',
    gender: '',
    rfidCard: '',
    defaultTimezone: 'Asia/Kolkata',
    defaultOpenPage: 'snapshot',
    isSuperAdminStaff: false,
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Fetch profile data
  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile,
  });

  // Update profile when data is loaded
  useEffect(() => {
    if (profileResponse?.success && profileResponse?.profile) {
      const profile = profileResponse.profile;
      setProfileData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        countryCode: profile.countryCode || '+91',
        gender: profile.gender || '',
        rfidCard: profile.rfidCard || '',
        defaultTimezone: profile.defaultTimezone || 'Asia/Kolkata',
        defaultOpenPage: profile.defaultOpenPage || 'snapshot',
        isSuperAdminStaff: profile.isSuperAdminStaff || false,
      });
    }
  }, [profileResponse]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Profile updated successfully');
        queryClient.invalidateQueries(['adminProfile']);
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    
    if (!profileData.firstName || !profileData.lastName || !profileData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    updateProfileMutation.mutate({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      phone: profileData.phone,
      countryCode: profileData.countryCode,
      gender: profileData.gender,
      rfidCard: profileData.rfidCard,
      defaultTimezone: profileData.defaultTimezone,
      defaultOpenPage: profileData.defaultOpenPage,
      isSuperAdminStaff: profileData.isSuperAdminStaff,
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  if (isLoading) {
    return <LoadingPage message="Loading profile..." />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">Super Admin Profile</h2>
        </div>

        {/* Change Working Hours Link */}
        <div className="px-6 py-2 border-b border-gray-200">
          <button
            onClick={() => navigate('/working-hours')}
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Change Working Hours
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'password'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="First Name"
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Last Name"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <select
                    name="countryCode"
                    value={profileData.countryCode}
                    onChange={handleProfileChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    {countryCodes.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.country}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Phone Number"
                    required
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={profileData.gender === 'male'}
                      onChange={handleProfileChange}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-gray-700">Male</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={profileData.gender === 'female'}
                      onChange={handleProfileChange}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-gray-700">Female</span>
                  </label>
                </div>
              </div>

              {/* RFID Card */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RFID Card
                </label>
                <input
                  type="text"
                  name="rfidCard"
                  value={profileData.rfidCard}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="RFID Card"
                />
              </div>

              {/* Default Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Timezone <span className="text-red-500">*</span>
                </label>
                <select
                  name="defaultTimezone"
                  value={profileData.defaultTimezone}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Open Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default open page
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="defaultOpenPage"
                      value="snapshot"
                      checked={profileData.defaultOpenPage === 'snapshot'}
                      onChange={handleProfileChange}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-gray-700">Snapshot</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="defaultOpenPage"
                      value="follow-ups"
                      checked={profileData.defaultOpenPage === 'follow-ups'}
                      onChange={handleProfileChange}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-gray-700">Follow-ups</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="defaultOpenPage"
                      value="calendar"
                      checked={profileData.defaultOpenPage === 'calendar'}
                      onChange={handleProfileChange}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-gray-700">Calendar</span>
                  </label>
                </div>
              </div>

              {/* Super Admin Staff Toggle */}
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Super Admin Staff
                  </span>
                  <div className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      name="isSuperAdminStaff"
                      checked={profileData.isSuperAdminStaff}
                      onChange={handleProfileChange}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-checked:bg-orange-500 transition-colors duration-200"></div>
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-6"></div>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Current Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="New Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Retype New Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changePasswordMutation.isLoading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

