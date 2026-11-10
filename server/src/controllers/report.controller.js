import { Report } from '../models/Report.js';
import { Charger } from '../models/Charger.js';

export const createReport = async (req, res, next) => {
  try {
    const { chargerId, reason, description, photoUrl } = req.body;

    const charger = await Charger.findById(chargerId);
    if (!charger) {
      return res.status(404).json({
        success: false,
        message: 'The charger you are reporting does not exist.',
      });
    }

    const report = await Report.create({
      chargerId,
      reporterId: req.user.id,
      reason,
      description,
      photoUrl: photoUrl || '',
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for reporting this bay. Our safety and verification team will investigate within 24 hours.',
      report,
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Regular users only see their own submitted reports; Admin sees all
    if (req.user.role !== 'ADMIN') {
      query.reporterId = req.user.id;
    }

    const reports = await Report.find(query)
      .populate('chargerId', 'title address city connectorTypes status')
      .populate('reporterId', 'name email phone')
      .populate('resolvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    report.status = status;
    if (adminNotes !== undefined) {
      report.adminNotes = adminNotes;
    }
    if (status === 'RESOLVED' || status === 'DISMISSED') {
      report.resolvedBy = req.user.id;
      report.resolvedAt = new Date();
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: `Report has been updated to ${status}.`,
      report,
    });
  } catch (error) {
    next(error);
  }
};
