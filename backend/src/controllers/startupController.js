import mongoose from 'mongoose';
import Startup from '../models/Startup.js';

// simulate mca api call for cin verification
const verifyMCAStatus = async (cin) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!cin || cin.length !== 21) {
        return resolve({ verified: false, message: 'Invalid CIN format' });
      }
      resolve({ 
        verified: true, 
        legalName: 'Auto-Fetched Company Name Pvt Ltd'
      });
    }, 600);
  });
};

// @desc    Founder creates startup
// @route   POST /api/startups
// @access  founder
export const createStartup = async (req, res) => {
  try {
    const {
      companyName,
      cin,
      authorizedCapital,
      paidUpCapital,
      valuationAsk,
      pitchDeckUrl,
      pitchVideoUrl
    } = req.body;

    if (!companyName || !cin || valuationAsk === undefined || !pitchDeckUrl) {
      return res.status(400).json({
        success: false,
        message: 'Company name, CIN, valuation ask, and pitch deck URL are required'
      });
    }

    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Only founders can create startups'
      });
    }

    const existingStartupByFounder = await Startup.findOne({
      founderId: req.user._id
    });

    if (existingStartupByFounder) {
      return res.status(400).json({
        success: false,
        message: 'Founder already has a startup'
      });
    }

    const normalizedCin = cin.toUpperCase().trim();

    const existingStartupByCin = await Startup.findOne({
      cin: normalizedCin
    });

    if (existingStartupByCin) {
      return res.status(409).json({
        success: false,
        message: 'Startup with this CIN already exists'
      });
    }

    // verify cin with mca before creating
    const mcaResponse = await verifyMCAStatus(normalizedCin);
    
    if (!mcaResponse.verified) {
      return res.status(400).json({ 
        success: false, 
        message: 'MCA Verification failed. Please check your CIN.' 
      });
    }

    const startup = await Startup.create({
      founderId: req.user._id,
      companyName: companyName.trim(),
      cin: normalizedCin,
      mcaStatus: 'Verified',
      authorizedCapital: authorizedCapital || 0,
      paidUpCapital: paidUpCapital || 0,
      valuationAsk,
      pitchDeckUrl,
      pitchVideoUrl: pitchVideoUrl || null,
      isLive: false
    });

    return res.status(201).json({
      success: true,
      message: 'Startup created successfully. Waiting for admin approval.',
      startup
    });
  } catch (error) {
    console.error('Create Startup Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Startup already exists with this founder or CIN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while creating startup'
    });
  }
};

// @desc    Get logged-in founder startup
// @route   GET /api/startups/my
// @access  founder
export const getMyStartup = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Only founders can access this route'
      });
    }

    const startup = await Startup.findOne({
      founderId: req.user._id
    }).populate('founderId', 'name email role isVerified');

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'No startup found for this founder'
      });
    }

    return res.status(200).json({
      success: true,
      startup
    });
  } catch (error) {
    console.error('Get My Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup'
    });
  }
};

// @desc    Get startups
// @route   GET /api/startups
// @access  investor / founder / admin
export const getStartups = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === 'investor') {
      filter.isLive = true;
    }

    if (req.user.role === 'founder') {
      filter.founderId = req.user._id;
    }

    const startups = await Startup.find(filter)
      .populate('founderId', 'name email role isVerified')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: startups.length,
      startups
    });
  } catch (error) {
    console.error('Get Startups Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startups'
    });
  }
};

// @desc    Get single startup by ID
// @route   GET /api/startups/:id
// @access  protected
export const getStartupById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id).populate(
      'founderId',
      'name email role isVerified'
    );

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    if (req.user.role === 'investor' && !startup.isLive) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view startups that are not live yet'
      });
    }

    if (
      req.user.role === 'founder' &&
      startup.founderId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own startup'
      });
    }

    return res.status(200).json({
      success: true,
      startup
    });
  } catch (error) {
    console.error('Get Startup By ID Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching startup'
    });
  }
};

// @desc    Founder updates own startup
// @route   PUT /api/startups/my
// @access  founder
export const updateMyStartup = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Only founders can update startups'
      });
    }

    const startup = await Startup.findOne({
      founderId: req.user._id
    });

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'No startup found for this founder'
      });
    }

    const allowedUpdates = [
      'companyName',
      'authorizedCapital',
      'paidUpCapital',
      'valuationAsk',
      'pitchDeckUrl',
      'pitchVideoUrl'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'companyName') {
          startup[field] = req.body[field].trim();
        } else {
          startup[field] = req.body[field];
        }
      }
    });

    // set isLive to false if founder updates details
    startup.isLive = false;

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup updated successfully. Admin approval required again.',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Update Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while updating startup'
    });
  }
};

// @desc    Admin makes startup live
// @route   PATCH /api/startups/:id/verify
// @access  admin
export const verifyStartup = async (req, res) => {
  try {
    const { id } = req.params;
    const { mcaStatus, authorizedCapital, paidUpCapital } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can verify startups'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    startup.isLive = true;
    startup.mcaStatus = mcaStatus || 'Verified';

    if (authorizedCapital !== undefined) {
      startup.authorizedCapital = authorizedCapital;
    }

    if (paidUpCapital !== undefined) {
      startup.paidUpCapital = paidUpCapital;
    }

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup verified and made live successfully',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Verify Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while verifying startup'
    });
  }
};

// @desc    Admin removes startup from live listing
// @route   PATCH /api/startups/:id/unverify
// @access  admin
export const unverifyStartup = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can unverify startups'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    startup.isLive = false;
    startup.mcaStatus = 'Pending';

    const updatedStartup = await startup.save();

    return res.status(200).json({
      success: true,
      message: 'Startup removed from live listing',
      startup: updatedStartup
    });
  } catch (error) {
    console.error('Unverify Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while unverifying startup'
    });
  }
};

// @desc    Admin deletes startup
// @route   DELETE /api/startups/:id
// @access  admin
export const deleteStartup = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can delete startups'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startup ID'
      });
    }

    const startup = await Startup.findById(id);

    if (!startup) {
      return res.status(404).json({
        success: false,
        message: 'Startup not found'
      });
    }

    await startup.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Startup deleted successfully'
    });
  } catch (error) {
    console.error('Delete Startup Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while deleting startup'
    });
  }
};