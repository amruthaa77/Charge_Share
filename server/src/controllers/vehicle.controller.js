import { Vehicle } from '../models/Vehicle.js';

export const createVehicle = async (req, res, next) => {
  try {
    const { make, model, year, registrationNumber, connectorType, batteryCapacityKWh, isDefault } = req.body;

    const normalizedReg = registrationNumber.toUpperCase().trim();
    const existingVehicle = await Vehicle.findOne({
      userId: req.user._id,
      registrationNumber: normalizedReg,
    });
    if (existingVehicle) {
      return res.status(409).json({
        success: false,
        code: 'VEHICLE_EXISTS',
        message: 'A vehicle with this registration number already exists in your garage.',
        errors: [{ field: 'registrationNumber', message: 'A vehicle with this registration number already exists in your garage.' }],
        requestId: req.id,
      });
    }

    // Check if this is the user's first vehicle, if so make it default
    const count = await Vehicle.countDocuments({ userId: req.user._id });
    const shouldBeDefault = count === 0 || isDefault;

    if (shouldBeDefault) {
      await Vehicle.updateMany({ userId: req.user._id }, { isDefault: false });
    }

    const vehicle = await Vehicle.create({
      userId: req.user._id,
      make,
      model,
      year,
      registrationNumber: normalizedReg,
      connectorType,
      batteryCapacityKWh: batteryCapacityKWh || 30,
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    next(error);
  }
};

export const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        code: 'VEHICLE_NOT_FOUND',
        message: 'Vehicle not found',
        requestId: req.id,
      });
    }

    if (vehicle.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to access this vehicle',
        requestId: req.id,
      });
    }

    res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req, res, next) => {
  try {
    let vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        code: 'VEHICLE_NOT_FOUND',
        message: 'Vehicle not found',
        requestId: req.id,
      });
    }

    if (vehicle.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to update this vehicle',
        requestId: req.id,
      });
    }

    if (req.body.isDefault) {
      await Vehicle.updateMany({ userId: req.user._id }, { isDefault: false });
    }

    vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        code: 'VEHICLE_NOT_FOUND',
        message: 'Vehicle not found',
        requestId: req.id,
      });
    }

    if (vehicle.userId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to delete this vehicle',
        requestId: req.id,
      });
    }

    await vehicle.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
