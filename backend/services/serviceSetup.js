import Service from '../models/Service.js';
import Plan from '../models/Plan.js';

export const DEFAULT_GYM_SERVICE = {
  name: 'Gym Membership',
  slug: 'gym-membership',
  description: 'Flagship membership program focused on strength, conditioning and consistent accountability.',
  category: 'membership',
  accentColor: '#f97316',
  icon: 'dumbbell',
  isPromoted: true,
  displayOrder: 1
};

export const DEFAULT_GYM_VARIATIONS = [
  {
    variationId: 'GM-001',
    name: '1 Month Membership',
    description: '6 Days per week. Valid for 1 month(s).',
    type: 'duration',
    duration: { value: 1, unit: 'months' },
    price: 6000,
    allowOnlineSale: false,
    isPopular: true,
    displayOrder: 1
  },
  {
    variationId: 'GM-002',
    name: '2 Month Membership',
    description: '6 Days per week. Valid for 2 month(s).',
    type: 'duration',
    duration: { value: 2, unit: 'months' },
    price: 7000,
    allowOnlineSale: false,
    displayOrder: 2
  },
  {
    variationId: 'GM-003',
    name: '3 Month Membership',
    description: '6 Days per week. Valid for 3 month(s).',
    type: 'duration',
    duration: { value: 3, unit: 'months' },
    price: 8849,
    allowOnlineSale: false,
    displayOrder: 3
  },
  {
    variationId: 'GM-004',
    name: '4 Months Membership',
    description: '6 Days per week. Valid for 4 month(s).',
    type: 'duration',
    duration: { value: 4, unit: 'months' },
    price: 8000,
    allowOnlineSale: false,
    displayOrder: 4
  },
  {
    variationId: 'GM-005',
    name: '6 Month Membership',
    description: '6 Days per week. Valid for 6 month(s).',
    type: 'duration',
    duration: { value: 6, unit: 'months' },
    price: 12389,
    allowOnlineSale: false,
    displayOrder: 5
  },
  {
    variationId: 'GM-006',
    name: '9 Month Membership',
    description: '6 Days per week. Valid for 9 month(s).',
    type: 'duration',
    duration: { value: 9, unit: 'months' },
    price: 12345,
    allowOnlineSale: false,
    displayOrder: 6
  },
  {
    variationId: 'GM-007',
    name: '1 Year Membership',
    description: '6 Days per week. Valid for 12 month(s).',
    type: 'duration',
    duration: { value: 12, unit: 'months' },
    price: 25000,
    allowOnlineSale: false,
    displayOrder: 7
  },
  {
    variationId: 'GM-008',
    name: '2 Year Membership',
    description: '6 Days per week. Valid for 24 month(s).',
    type: 'duration',
    duration: { value: 24, unit: 'months' },
    price: 50000,
    allowOnlineSale: false,
    displayOrder: 8
  },
  {
    variationId: 'GM-009',
    name: 'VIP Lifetime Membership',
    description: '6 Days per week. Valid for 100 month(s).',
    type: 'duration',
    duration: { value: 100, unit: 'months' },
    price: 150000,
    allowOnlineSale: false,
    autoRenew: false,
    displayOrder: 9
  }
];

export const ensureDefaultGymService = async (organizationId, userId) => {
  if (!organizationId) return;

  let service = await Service.findOne({ organizationId, slug: DEFAULT_GYM_SERVICE.slug });

  if (!service) {
    service = await Service.create({
      ...DEFAULT_GYM_SERVICE,
      organizationId,
      createdBy: userId
    });
  }

  const existingVariations = await Plan.find({
    organizationId,
    serviceId: service._id
  }).select('variationId name');

  const existingVariationIds = new Set(
    existingVariations
      .map(variation => variation.variationId)
      .filter(Boolean)
  );

  const plansToInsert = DEFAULT_GYM_VARIATIONS
    .filter(variation => !existingVariationIds.has(variation.variationId))
    .map(variation => ({
      ...variation,
      organizationId,
      serviceId: service._id,
      serviceName: service.name,
      serviceType: service.category,
      createdBy: userId
    }));

  if (plansToInsert.length > 0) {
    await Plan.insertMany(plansToInsert);
  }

  return service;
};


