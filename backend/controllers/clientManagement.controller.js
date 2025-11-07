import mongoose from 'mongoose'
import Branch from '../models/Branch.js'
import Member from '../models/Member.js'

const defaultSettings = {
  upgrade: {
    upgradeDeadlineDays: 30,
    enableTransferFee: false,
    enableFreezeFee: false,
    autoSelectAssetsOnTransfer: false
  },
  crossSell: {
    sameCategoryAsCrossSell: false
  },
  extension: {
    lastRunAt: null,
    lastRunBy: null,
    lastFromDate: null,
    lastExtensionDays: null,
    lastReason: '',
    processedCount: 0,
    skippedCount: 0
  }
}

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value)

const mergeSettings = (settings = {}) => ({
  upgrade: { ...defaultSettings.upgrade, ...(settings.upgrade || {}) },
  crossSell: { ...defaultSettings.crossSell, ...(settings.crossSell || {}) },
  extension: { ...defaultSettings.extension, ...(settings.extension || {}) }
})

const formatUserSummary = (userDoc) => {
  if (!userDoc) return null

  if (typeof userDoc === 'string') {
    return { id: userDoc }
  }

  const fullName = [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim()

  return {
    id: userDoc._id,
    name: fullName || userDoc.email || null,
    email: userDoc.email || null,
    role: userDoc.role || null
  }
}

const buildSettingsResponse = (branch) => {
  const merged = mergeSettings(branch?.clientManagementSettings)
  const extension = merged.extension || {}

  return {
    branchId: branch?._id,
    branchName: branch?.name,
    upgrade: merged.upgrade,
    crossSell: merged.crossSell,
    extension: {
      ...defaultSettings.extension,
      ...extension,
      lastRunBy: formatUserSummary(extension.lastRunBy)
    }
  }
}

const findBranchForOrganization = async (branchId, organizationId) => {
  if (!isValidObjectId(branchId)) {
    return null
  }

  return Branch.findOne({ _id: branchId, organizationId })
}

export const getClientManagementSettings = async (req, res) => {
  try {
    const { branchId } = req.params

    const branch = await findBranchForOrganization(branchId, req.organizationId)

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' })
    }

    await branch.populate({ path: 'clientManagementSettings.extension.lastRunBy', select: 'firstName lastName email role' })

    const data = buildSettingsResponse(branch)

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error fetching client management settings:', error)
    return res.status(500).json({ success: false, message: 'Failed to load settings' })
  }
}

export const updateUpgradeSettings = async (req, res) => {
  try {
    const { branchId } = req.params
    const {
      upgradeDeadlineDays,
      enableTransferFee = false,
      enableFreezeFee = false,
      autoSelectAssetsOnTransfer = false
    } = req.body || {}

    const branch = await findBranchForOrganization(branchId, req.organizationId)

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' })
    }

    const deadline = Number(upgradeDeadlineDays)

    if (!Number.isFinite(deadline) || deadline < 0 || deadline > 365) {
      return res.status(400).json({ success: false, message: 'Upgrade deadline must be between 0 and 365 days' })
    }

    branch.clientManagementSettings = mergeSettings(branch.clientManagementSettings)
    branch.clientManagementSettings.upgrade = {
      upgradeDeadlineDays: Math.round(deadline),
      enableTransferFee: Boolean(enableTransferFee),
      enableFreezeFee: Boolean(enableFreezeFee),
      autoSelectAssetsOnTransfer: Boolean(autoSelectAssetsOnTransfer)
    }

    branch.markModified('clientManagementSettings')
    await branch.save()
    await branch.populate({ path: 'clientManagementSettings.extension.lastRunBy', select: 'firstName lastName email role' })

    const data = buildSettingsResponse(branch)

    return res.status(200).json({ success: true, message: 'Upgrade settings updated successfully', data })
  } catch (error) {
    console.error('Error updating upgrade settings:', error)
    return res.status(500).json({ success: false, message: 'Failed to update upgrade settings' })
  }
}

export const updateCrossSellSettings = async (req, res) => {
  try {
    const { branchId } = req.params
    const { sameCategoryAsCrossSell = false } = req.body || {}

    const branch = await findBranchForOrganization(branchId, req.organizationId)

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' })
    }

    branch.clientManagementSettings = mergeSettings(branch.clientManagementSettings)
    branch.clientManagementSettings.crossSell = {
      sameCategoryAsCrossSell: Boolean(sameCategoryAsCrossSell)
    }

    branch.markModified('clientManagementSettings')
    await branch.save()
    await branch.populate({ path: 'clientManagementSettings.extension.lastRunBy', select: 'firstName lastName email role' })

    const data = buildSettingsResponse(branch)

    return res.status(200).json({ success: true, message: 'Cross-sell settings updated successfully', data })
  } catch (error) {
    console.error('Error updating cross-sell settings:', error)
    return res.status(500).json({ success: false, message: 'Failed to update cross-sell settings' })
  }
}

export const getExtensionSummary = async (req, res) => {
  try {
    const { branchId } = req.params

    const branch = await findBranchForOrganization(branchId, req.organizationId)

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' })
    }

    await branch.populate({ path: 'clientManagementSettings.extension.lastRunBy', select: 'firstName lastName email role' })

    const { extension } = buildSettingsResponse(branch)

    return res.status(200).json({ success: true, data: extension })
  } catch (error) {
    console.error('Error fetching extension summary:', error)
    return res.status(500).json({ success: false, message: 'Failed to load extension summary' })
  }
}

export const applyMembershipExtension = async (req, res) => {
  try {
    const { branchId } = req.params
    const { fromDate, extensionDays, reason = '' } = req.body || {}

    const extensionValue = Number(extensionDays)

    if (!Number.isFinite(extensionValue) || extensionValue <= 0) {
      return res.status(400).json({ success: false, message: 'Extension days must be greater than zero' })
    }

    let parsedFromDate = null
    if (fromDate) {
      const tempDate = new Date(fromDate)
      if (Number.isNaN(tempDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid from date provided' })
      }
      parsedFromDate = tempDate
    }

    const branch = await findBranchForOrganization(branchId, req.organizationId)

    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' })
    }

    const memberQuery = {
      organizationId: req.organizationId,
      branchId: branch._id,
      membershipStatus: 'active',
      'currentPlan.endDate': { $ne: null }
    }

    if (parsedFromDate) {
      memberQuery['currentPlan.endDate'].$gte = parsedFromDate
    }

    const members = await Member.find(memberQuery)

    if (!members.length) {
      return res.status(200).json({
        success: true,
        message: 'No active memberships found that match the criteria',
        data: {
          processedCount: 0,
          skippedCount: 0,
          totalEligible: 0,
          extensionDays: extensionValue,
          fromDate: parsedFromDate,
          reason: reason?.trim() || ''
        }
      })
    }

    let processedCount = 0
    let skippedCount = 0

    for (const member of members) {
      const currentPlan = member.currentPlan || {}
      const currentEndDate = currentPlan.endDate ? new Date(currentPlan.endDate) : null

      if (!currentEndDate) {
        skippedCount += 1
        continue
      }

      if (parsedFromDate && currentEndDate < parsedFromDate) {
        skippedCount += 1
        continue
      }

      const updatedEndDate = new Date(currentEndDate)
      updatedEndDate.setDate(updatedEndDate.getDate() + Math.round(extensionValue))

      member.currentPlan.endDate = updatedEndDate
      member.extensionHistory = member.extensionHistory || []
      member.extensionHistory.push({
        fromDate: parsedFromDate,
        extensionDays: Math.round(extensionValue),
        reason: reason?.trim() || '',
        extendedBy: req.user._id
      })

      await member.save()
      processedCount += 1
    }

    branch.clientManagementSettings = mergeSettings(branch.clientManagementSettings)
    branch.clientManagementSettings.extension = {
      ...branch.clientManagementSettings.extension,
      lastRunAt: new Date(),
      lastRunBy: req.user._id,
      lastFromDate: parsedFromDate,
      lastExtensionDays: Math.round(extensionValue),
      lastReason: reason?.trim() || '',
      processedCount,
      skippedCount
    }

    branch.markModified('clientManagementSettings')
    await branch.save()
    await branch.populate({ path: 'clientManagementSettings.extension.lastRunBy', select: 'firstName lastName email role' })

    const data = buildSettingsResponse(branch)

    return res.status(200).json({
      success: true,
      message: processedCount ? `Extended ${processedCount} membership(s)` : 'No memberships were updated',
      data: {
        summary: {
          processedCount,
          skippedCount,
          totalEligible: members.length,
          extensionDays: Math.round(extensionValue),
          fromDate: parsedFromDate,
          reason: reason?.trim() || ''
        },
        settings: data
      }
    })
  } catch (error) {
    console.error('Error applying membership extension:', error)
    return res.status(500).json({ success: false, message: 'Failed to apply membership extension' })
  }
}

