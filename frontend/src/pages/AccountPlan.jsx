import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Mail, Calendar, CalendarCheck, AlertCircle } from 'lucide-react';
import { getAccountPlan } from '../api/admin';

export default function AccountPlan() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['accountPlan'],
    queryFn: getAccountPlan,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">Error loading account plan</div>
      </div>
    );
  }

  const accountPlan = data?.accountPlan || {
    smsBalance: { transactional: 0, promotional: 0 },
    mailBalance: { free: 0, paid: 0 },
    subscriptionStartDate: 'N/A',
    subscriptionExpiryDate: 'N/A',
  };

  const cards = [
    {
      title: 'SMS Balance',
      icon: MessageSquare,
      iconBg: 'bg-teal-500',
      details: `Transactional : ${accountPlan.smsBalance.transactional.toLocaleString()}, Promotional : ${accountPlan.smsBalance.promotional.toLocaleString()}`,
      iconComponent: (
        <div className="relative">
          <div className="w-16 h-16 bg-teal-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
        </div>
      ),
    },
    {
      title: 'Mail Balance',
      icon: Mail,
      iconBg: 'bg-teal-600',
      details: `Free : ${accountPlan.mailBalance.free.toLocaleString()}, Paid : ${accountPlan.mailBalance.paid.toLocaleString()}`,
      iconComponent: (
        <div className="relative">
          <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          {accountPlan.mailBalance.free === 0 && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">0</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Subscription Start Date',
      icon: Calendar,
      iconBg: 'bg-orange-500',
      details: accountPlan.subscriptionStartDate,
      iconComponent: (
        <div className="relative">
          <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <Calendar className="w-8 h-8 text-white" />
          </div>
        </div>
      ),
    },
    {
      title: 'Subscription Expiry Date',
      icon: CalendarCheck,
      iconBg: 'bg-purple-500',
      details: accountPlan.subscriptionExpiryDate,
      iconComponent: (
        <div className="relative">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          {accountPlan.subscriptionExpiryDate !== 'N/A' && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Account Plan</h1>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600">{card.details}</p>
              </div>
              <div className="ml-4">{card.iconComponent}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

