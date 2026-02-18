import Organization from '../models/Organization.js';
import Branch from '../models/Branch.js';
import AuditLog from '../models/AuditLog.js';
import axios from 'axios';

// Helper function to send organization data to external API
const sendOrganizationToExternalAPI = async (organization, action = 'create', req = null) => {
  try {
    const apiUrl = process.env.ORGANIZATION_API_URL || 'https://api.airfitluxury.in/';
    
    if (!apiUrl) {
      console.warn('⚠️  ORGANIZATION_API_URL not configured, skipping external API call');
      return;
    }

    // Convert logo path to full URL if it's a relative path
    let logoUrl = organization.logo;
    if (logoUrl && !logoUrl.startsWith('http')) {
      if (req) {
        // Use request object to construct full URL
        const protocol = req.protocol;
        const host = req.get('host');
        logoUrl = `${protocol}://${host}${logoUrl}`;
      } else {
        // Fallback: use environment variable or construct from BACKEND_URL
        const backendUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL?.replace('/api', '') || 'http://localhost:5000';
        logoUrl = `${backendUrl}${logoUrl}`;
      }
    }

    // Prepare organization data for external API
    const organizationData = {
      id: organization._id.toString(),
      name: organization.name,
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
      logo: logoUrl,
      currency: organization.currency,
      timezone: organization.timezone,
      taxSettings: organization.taxSettings,
      invoiceSettings: organization.invoiceSettings,
      branding: organization.branding,
      isActive: organization.isActive,
      action: action, // 'create' or 'update'
      timestamp: new Date().toISOString()
    };

    // Send to external API
    await axios.post(apiUrl, organizationData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`✅ Successfully sent organization ${action} to external API: ${apiUrl}`);
  } catch (error) {
    // Log error but don't fail the request
    console.error(`❌ Error sending organization to external API:`, error.message);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data:`, error.response.data);
    }
  }
};

export const createOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    if (organization) {
      return res.status(400).json({ success: false, message: 'Organization already exists' });
    }

    const orgData = { ...req.body, createdBy: req.user._id };
    const newOrg = await Organization.create(orgData);

    await AuditLog.create({
      organizationId: newOrg._id,
      userId: req.user._id,
      action: 'organization.created',
      entityType: 'Organization',
      entityId: newOrg._id
    });

    // Send organization data to external API
    await sendOrganizationToExternalAPI(newOrg, 'create', req);

    res.status(201).json({ success: true, organization: newOrg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId)
      .populate('createdBy', 'firstName lastName');

    // Convert logo path to full URL if it exists
    if (organization && organization.logo) {
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      organization.logo = organization.logo.startsWith('http') 
        ? organization.logo 
        : `${baseUrl}${organization.logo}`;
    }

    res.json({ success: true, organization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    Object.assign(organization, req.body);
    await organization.save();

    await AuditLog.create({
      organizationId: organization._id,
      userId: req.user._id,
      action: 'organization.updated',
      entityType: 'Organization',
      entityId: organization._id,
      changes: { after: req.body }
    });

    // Send organization data to external API
    await sendOrganizationToExternalAPI(organization, 'update', req);

    // Convert logo path to full URL if it exists
    if (organization.logo) {
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      organization.logo = organization.logo.startsWith('http') 
        ? organization.logo 
        : `${baseUrl}${organization.logo}`;
    }

    res.json({ success: true, organization });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBranch = async (req, res) => {
  try {
    const {
      name,
      code,
      country,
      state,
      city,
      locality,
      currency,
      region,
      timezone,
      businessType,
      brandName,
      countryCode,
      phone,
      email,
      latitude,
      longitude,
      address,
      area,
      operatingHours,
      agreedToTerms
    } = req.body;

    // Validate required fields
    if (!name || !code || !country || !state || !city || !locality || !currency || 
        !timezone || !businessType || !brandName || !address?.fullAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must agree to Terms and Conditions' 
      });
    }

    const branchData = {
      organizationId: req.organizationId,
      name,
      code: code.toUpperCase(),
      country,
      state,
      city,
      locality,
      currency,
      region,
      timezone,
      businessType,
      brandName,
      countryCode: countryCode || '+91',
      phone,
      email,
      latitude: latitude || 0,
      longitude: longitude || 0,
      address: {
        ...address,
        city: city,
        state: state,
        country: country
      },
      area: area || 0,
      operatingHours: operatingHours || {},
      agreedToTerms: true
    };

    const branch = await Branch.create(branchData);

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'branch.created',
      entityType: 'Branch',
      entityId: branch._id
    });

    res.status(201).json({ success: true, branch });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch code already exists for this organization' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ organizationId: req.organizationId, isActive: true })
      .populate('managerId', 'firstName lastName email');

    res.json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.branchId,
      organizationId: req.organizationId
    }).populate('managerId', 'firstName lastName email');

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.json({ success: true, branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.branchId,
      organizationId: req.organizationId
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const {
      name,
      code,
      country,
      state,
      city,
      locality,
      currency,
      region,
      timezone,
      businessType,
      brandName,
      countryCode,
      phone,
      email,
      latitude,
      longitude,
      address,
      area,
      operatingHours,
      agreedToTerms
    } = req.body;

    // Update fields
    if (name) branch.name = name;
    if (code) branch.code = code.toUpperCase();
    if (country) branch.country = country;
    if (state) branch.state = state;
    if (city) branch.city = city;
    if (locality) branch.locality = locality;
    if (currency) branch.currency = currency;
    if (region !== undefined) branch.region = region;
    if (timezone) branch.timezone = timezone;
    if (businessType) branch.businessType = businessType;
    if (brandName) branch.brandName = brandName;
    if (countryCode) branch.countryCode = countryCode;
    if (phone !== undefined) branch.phone = phone;
    if (email !== undefined) branch.email = email;
    if (latitude !== undefined) branch.latitude = latitude;
    if (longitude !== undefined) branch.longitude = longitude;
    if (address) {
      branch.address = {
        ...branch.address,
        ...address,
        city: city || branch.city,
        state: state || branch.state,
        country: country || branch.country
      };
    }
    if (area !== undefined) branch.area = area;
    if (operatingHours) branch.operatingHours = operatingHours;
    if (agreedToTerms !== undefined) branch.agreedToTerms = agreedToTerms;

    await branch.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'branch.updated',
      entityType: 'Branch',
      entityId: branch._id,
      changes: req.body
    });

    res.json({ success: true, branch });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Branch code already exists for this organization' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.branchId,
      organizationId: req.organizationId
    });

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.isActive = false;
    await branch.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'branch.deleted',
      entityType: 'Branch',
      entityId: branch._id
    });

    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingStatus = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    res.json({ success: true, onboarding: organization.onboardingStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOnboardingStatus = async (req, res) => {
  try {
    const organization = await Organization.findById(req.organizationId);
    const { step } = req.body;

    if (!organization.onboardingStatus.completedSteps.includes(step)) {
      organization.onboardingStatus.completedSteps.push(step);
    }

    if (organization.onboardingStatus.completedSteps.length >= 7) {
      organization.onboardingStatus.isCompleted = true;
      organization.onboardingStatus.completedAt = new Date();
    }

    await organization.save();
    res.json({ success: true, onboarding: organization.onboardingStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const connectWhatsApp = async (req, res) => {
  try {
    const { apiKey, apiSecret, phoneNumberId } = req.body;
    const organization = await Organization.findById(req.organizationId);

    organization.whatsappSettings = {
      apiKey,
      apiSecret,
      phoneNumberId,
      isConnected: true,
      connectedAt: new Date()
    };

    await organization.save();

    await AuditLog.create({
      organizationId: req.organizationId,
      userId: req.user._id,
      action: 'whatsapp.connected',
      entityType: 'Organization',
      entityId: organization._id
    });

    res.json({ success: true, message: 'WhatsApp connected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadOrganizationLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Logo file is required' });
    }

    const organization = await Organization.findById(req.organizationId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const relativePath = `/uploads/organizations/${req.file.filename}`;
    organization.logo = relativePath;
    await organization.save();

    await AuditLog.create({
      organizationId: organization._id,
      userId: req.user._id,
      action: 'organization.logo.updated',
      entityType: 'Organization',
      entityId: organization._id,
      metadata: {
        logo: relativePath
      }
    });

    // Convert logo path to full URL
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const logoUrl = `${baseUrl}${relativePath}`;

    // Return organization with full logo URL
    const organizationResponse = organization.toObject();
    organizationResponse.logo = logoUrl;

    res.json({ success: true, logo: logoUrl, organization: organizationResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

