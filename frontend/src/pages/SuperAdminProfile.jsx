import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Building2, User, Lock, Mail, Phone, MapPin } from 'lucide-react';
import { getAdminProfile, updateAdminProfile, changePassword } from '../api/admin';
import { getOrganizationDetails, updateOrganization } from '../api/organization';
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
  const [activeTab, setActiveTab] = useState('organization');
  
  // Organization form state
  const [organizationData, setOrganizationData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  });

  // Admin profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
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
  const { data: profileResponse, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile,
  });

  // Fetch organization data
  const { data: orgResponse, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization-details'],
    queryFn: getOrganizationDetails,
  });

  // Update organization data when loaded
  useEffect(() => {
    if (orgResponse?.success && orgResponse?.organization) {
      const org = orgResponse.organization;
      setOrganizationData({
        name: org.name || '',
        email: org.email || '',
        phone: org.phone || '',
        address: {
          street: org.address?.street || '',
          city: org.address?.city || '',
          state: org.address?.state || '',
          zipCode: org.address?.zipCode || '',
          country: org.address?.country || 'India'
        }
      });
    }
  }, [orgResponse]);

  // Update profile when data is loaded
  useEffect(() => {
    if (profileResponse?.success && profileResponse?.profile) {
      const profile = profileResponse.profile;
      setProfileData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
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

  // Update organization mutation
  const updateOrganizationMutation = useMutation({
    mutationFn: updateOrganization,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Organization details updated successfully');
        queryClient.invalidateQueries(['organization-details']);
      } else {
        toast.error(data.message || 'Failed to update organization');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update organization');
    },
  });

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

  const handleOrganizationChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setOrganizationData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else {
      setOrganizationData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

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

  const handleOrganizationSubmit = (e) => {
    e.preventDefault();
    
    if (!organizationData.name || !organizationData.email || !organizationData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    updateOrganizationMutation.mutate(organizationData);
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

  if (isLoadingProfile || isLoadingOrg) {
    return <LoadingPage message="Loading profile..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Profile</h1>
        <p className="text-sm text-gray-600 mt-1">Manage your organization and personal details</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('organization')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'organization'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Organization</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'profile'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Admin Details</span>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-6 py-4 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'password'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Organization Tab */}
          {activeTab === 'organization' && (
            <form onSubmit={handleOrganizationSubmit} className="space-y-6">
              <div className="space-y-5">
                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={organizationData.name}
                      onChange={handleOrganizationChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter organization name"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={organizationData.email}
                      onChange={handleOrganizationChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="organization@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={organizationData.phone}
                      onChange={handleOrganizationChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                    Address
                  </h3>
                  <div className="space-y-4">
                    {/* Street */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={organizationData.address.street}
                        onChange={handleOrganizationChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Street address"
                      />
                    </div>

                    {/* City, State, Zip */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="address.city"
                          value={organizationData.address.city}
                          onChange={handleOrganizationChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          name="address.state"
                          value={organizationData.address.state}
                          onChange={handleOrganizationChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zip Code
                        </label>
                        <input
                          type="text"
                          name="address.zipCode"
                          value={organizationData.address.zipCode}
                          onChange={handleOrganizationChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Zip Code"
                        />
                      </div>
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        name="address.country"
                        value={organizationData.address.country}
                        onChange={handleOrganizationChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={updateOrganizationMutation.isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateOrganizationMutation.isLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner size="sm" className="text-white mr-2" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="First Name"
                        required
                      />
                    </div>
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Last Name"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="Email address"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">Read-only</span>
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
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.country}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Phone Number"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center cursor-pointer">
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
                    <label className="flex items-center cursor-pointer">
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
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value="other"
                        checked={profileData.gender === 'other'}
                        onChange={handleProfileChange}
                        className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="ml-2 text-gray-700">Other</span>
                    </label>
                  </div>
                </div>

                {/* Additional Settings Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Settings</h3>
                  
                  {/* RFID Card */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RFID Card
                    </label>
                    <input
                      type="text"
                      name="rfidCard"
                      value={profileData.rfidCard}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter RFID card number"
                    />
                  </div>

                  {/* Default Timezone */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Timezone <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="defaultTimezone"
                      value={profileData.defaultTimezone}
                      onChange={handleProfileChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Open Page
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center cursor-pointer">
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
                      <label className="flex items-center cursor-pointer">
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
                      <label className="flex items-center cursor-pointer">
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
                    <label className="flex items-center justify-between cursor-pointer">
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
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 peer-checked:translate-x-6 shadow-sm"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner size="sm" className="text-white mr-2" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-5">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
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
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter new password (min. 6 characters)"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters long</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Retype new password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changePasswordMutation.isLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner size="sm" className="text-white mr-2" />
                      Updating...
                    </span>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

