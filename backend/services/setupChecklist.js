import SetupTask from '../models/SetupTask.js';
import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import Plan from '../models/Plan.js';

export const DEFAULT_SETUP_GROUPS = [
  {
    id: 'launch-essentials',
    order: 1,
    title: 'Launch Essentials',
    tasks: [
      {
        key: 'branch-profile',
        order: 1,
        title: 'Set Up Branch Profile',
        description: 'Complete business profile, operating hours and contact details.',
        actionLabel: 'Update Profile',
        path: '/branches',
        icon: 'Building2'
      },
      {
        key: 'brand-logo',
        order: 2,
        title: 'Update Brand Logo',
        description: 'Upload your brand assets for CRM and member touchpoints.',
        actionLabel: 'Upload Logo',
        path: '/setup/brand-logo',
        icon: 'Image'
      },
      {
        key: 'define-tax',
        order: 3,
        title: 'Define Tax',
        description: 'Configure GST or VAT slabs for invoices and services.',
        actionLabel: 'Configure Taxes',
        path: '/setup/define-tax',
        icon: 'ScrollText'
      },
      {
        key: 'bill-template',
        order: 4,
        title: 'Update Bill Template',
        description: 'Customise invoice look & feel with terms and branding.',
        actionLabel: 'Open Billing Studio',
        path: '/setup/bill-template',
        icon: 'FileText'
      },
      {
        key: 'services-pricing',
        order: 5,
        title: 'Define Services & Pricing',
        description: 'Publish membership plans, packages and add-on pricing.',
        actionLabel: 'Manage Services',
        path: '/setup/services',
        icon: 'LayoutDashboard'
      }
    ]
  }
];

export const ensureSetupChecklist = async (organizationId) => {
  if (!organizationId) return;

  const existingCount = await SetupTask.countDocuments({ organizationId });
  if (existingCount === DEFAULT_SETUP_GROUPS.reduce((acc, group) => acc + group.tasks.length, 0)) {
    return;
  }

  await Promise.all(DEFAULT_SETUP_GROUPS.map(async (group) => {
    await Promise.all(group.tasks.map(async (task) => {
      await SetupTask.updateOne(
        { organizationId, key: task.key },
        {
          $setOnInsert: {
            organizationId,
            key: task.key,
            groupId: group.id,
            groupTitle: group.title,
            groupOrder: group.order,
            title: task.title,
            description: task.description,
            actionLabel: task.actionLabel,
            path: task.path,
            icon: task.icon,
            order: task.order,
            status: 'pending'
          }
        },
        { upsert: true }
      );
    }));
  }));
};

const buildChecklistContext = async (organizationId) => {
  const [organization, primaryBranch, activePlanCount] = await Promise.all([
    Organization.findById(organizationId).lean(),
    Branch.findOne({ organizationId }).lean(),
    Plan.countDocuments({ organizationId, isActive: true })
  ]);

  return {
    organization,
    primaryBranch,
    activePlanCount
  };
};

const TASK_EVALUATORS = {
  'branch-profile': ({ primaryBranch }) => {
    if (!primaryBranch) return false;
    const addressComplete = Boolean(primaryBranch.address?.fullAddress || primaryBranch.address?.street);
    const contactComplete = Boolean(primaryBranch.phone || primaryBranch.email);
    return Boolean(addressComplete && contactComplete);
  },
  'brand-logo': ({ organization }) => Boolean(organization?.logo),
  'define-tax': ({ organization }) => {
    if (!organization?.taxSettings) return false;
    const { gstNumber, taxRate } = organization.taxSettings;
    return Boolean((gstNumber && gstNumber.trim()) || (typeof taxRate === 'number' && taxRate > 0));
  },
  'bill-template': ({ organization }) => {
    if (!organization?.invoiceSettings) return false;
    const { footer, terms } = organization.invoiceSettings;
    return Boolean((footer && footer.trim()) || (terms && terms.trim()));
  },
  'services-pricing': ({ activePlanCount }) => activePlanCount > 0
};

export const syncSetupChecklistStatuses = async (organizationId) => {
  if (!organizationId) return;
  await ensureSetupChecklist(organizationId);

  const context = await buildChecklistContext(organizationId);
  const tasks = await SetupTask.find({ organizationId });

  await Promise.all(
    tasks.map(async (task) => {
      const evaluator = TASK_EVALUATORS[task.key];
      if (!evaluator) return;

      const shouldBeCompleted = evaluator(context);
      if (shouldBeCompleted && task.status !== 'completed') {
        task.status = 'completed';
        task.completedAt = task.completedAt || new Date();
        task.completedBy = task.completedBy || null;
        await task.save();
      }

      if (!shouldBeCompleted && task.status === 'completed') {
        task.status = 'pending';
        task.completedAt = undefined;
        task.completedBy = undefined;
        await task.save();
      }
    })
  );
};



