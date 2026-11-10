import { Charger } from '../models/Charger.js';
import { Booking } from '../models/Booking.js';
import { getBayThumbnail, getBayImageById } from '../constants/bayImages.js';

/**
 * Attaches canonical image and thumbnail to a charger object.
 * If none stored, picks a deterministic image from BAY_IMAGES via stable hash of bay ID.
 */
export const attachBayMedia = (c) => {
  if (!c) return c;
  const obj = typeof c.toObject === 'function' ? c.toObject() : { ...c };
  const id = obj._id || obj.id;
  let image = null;

  if (Array.isArray(obj.photos) && obj.photos.length > 0 && typeof obj.photos[0] === 'string' && obj.photos[0].trim() !== '') {
    image = obj.photos[0];
  } else {
    image = getBayImageById(id);
  }

  const thumbnail = getBayThumbnail(image);

  return {
    ...obj,
    image,
    thumbnail,
    photos: Array.isArray(obj.photos) && obj.photos.length > 0 ? obj.photos : [image],
  };
};

export const BENGALURU_GEOFENCE = {
  CITY: 'Bengaluru',
  STATE: 'Karnataka',
  DEFAULT_LAT: 12.9716,
  DEFAULT_LNG: 77.5946,
  BOUNDS: {
    MIN_LAT: 12.80,
    MAX_LAT: 13.15,
    MIN_LNG: 77.45,
    MAX_LNG: 77.75,
  },
};

/**
 * Helper to compute live charger status in real-time
 */
export const computeLiveStatus = async (charger, now = new Date()) => {
  if (!charger) {
    return {
      liveStatus: 'OFFLINE',
      availableNow: false,
      isOpenNow: false,
      reason: 'NOT_FOUND',
    };
  }

  // 1. Station operational status
  if (charger.status === 'PAUSED') {
    return {
      liveStatus: 'OFFLINE',
      availableNow: false,
      isOpenNow: false,
      reason: 'STATION_PAUSED',
    };
  }
  if (charger.status !== 'VERIFIED') {
    return {
      liveStatus: 'MAINTENANCE',
      availableNow: false,
      isOpenNow: false,
      reason: 'UNDER_VERIFICATION',
    };
  }

  // 2. Check blocked dates
  const dateStr = now.toISOString().split('T')[0];
  if (charger.blockedDates && charger.blockedDates.includes(dateStr)) {
    return {
      liveStatus: 'OFFLINE',
      availableNow: false,
      isOpenNow: false,
      reason: 'DATE_BLOCKED',
    };
  }

  // 3. Check operating schedule
  const dayOfWeek = now.getDay();
  const daySchedule = charger.weeklySchedule?.find((s) => s.day === dayOfWeek) || {
    open: '06:00',
    close: '22:00',
    isActive: true,
  };

  if (!daySchedule.isActive) {
    return {
      liveStatus: 'OFFLINE',
      availableNow: false,
      isOpenNow: false,
      reason: 'CLOSED_TODAY',
    };
  }

  const [openH, openM] = daySchedule.open.split(':').map(Number);
  const [closeH, closeM] = daySchedule.close.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
    return {
      liveStatus: 'OFFLINE',
      availableNow: false,
      isOpenNow: false,
      reason: 'OUTSIDE_OPERATING_HOURS',
      operatingHours: `${daySchedule.open} - ${daySchedule.close}`,
      nextOpenAt: `${dateStr}T${daySchedule.open}:00.000Z`,
    };
  }

  // 4. Check for active or ongoing booking right now
  const activeBooking = await Booking.findOne({
    chargerId: charger._id,
    status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'PENDING_APPROVAL', 'ACTIVE'] },
    slotStart: { $lte: now },
    slotEnd: { $gt: now },
  }).sort({ slotEnd: -1 });

  if (activeBooking) {
    const minutesRemaining = Math.max(
      1,
      Math.round((new Date(activeBooking.slotEnd).getTime() - now.getTime()) / (1000 * 60))
    );
    return {
      liveStatus: 'OCCUPIED',
      availableNow: false,
      isOpenNow: true,
      reason: 'SESSION_IN_PROGRESS',
      occupiedUntil: activeBooking.slotEnd,
      estimatedWaitMinutes: minutesRemaining,
      currentBookingId: activeBooking._id,
      operatingHours: `${daySchedule.open} - ${daySchedule.close}`,
    };
  }

  // 5. Check for upcoming booking within next 20 minutes
  const in20Min = new Date(now.getTime() + 20 * 60 * 1000);
  const upcomingBooking = await Booking.findOne({
    chargerId: charger._id,
    status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'PENDING_APPROVAL', 'ACTIVE'] },
    slotStart: { $gt: now, $lte: in20Min },
  }).sort({ slotStart: 1 });

  if (upcomingBooking) {
    return {
      liveStatus: 'RESERVED',
      availableNow: false,
      isOpenNow: true,
      reason: 'UPCOMING_RESERVATION',
      reservedFrom: upcomingBooking.slotStart,
      nextAvailableAt: upcomingBooking.slotEnd,
      operatingHours: `${daySchedule.open} - ${daySchedule.close}`,
    };
  }

  // 6. Charger is fully open & available
  return {
    liveStatus: 'AVAILABLE',
    availableNow: true,
    isOpenNow: true,
    operatingHours: `${daySchedule.open} - ${daySchedule.close}`,
  };
};

export const createCharger = async (req, res, next) => {
  try {
    const {
      title,
      description,
      address,
      postalCode,
      latitude,
      longitude,
      connectorType,
      powerKW,
      pricingType,
      price,
      photos,
      houseRules,
      safetyFeatures,
      instantBooking,
      availabilityMode,
      emergencySupport,
      allowsReservations,
      requiresApproval,
      responseTimeMinutes,
      idleFeePerMinute,
      contactPhone,
      weeklySchedule,
    } = req.body;

    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);

    // Geofencing enforcement: strictly restricted to Bengaluru, Karnataka
    const isWithinBengaluru =
      parsedLat >= BENGALURU_GEOFENCE.BOUNDS.MIN_LAT &&
      parsedLat <= BENGALURU_GEOFENCE.BOUNDS.MAX_LAT &&
      parsedLng >= BENGALURU_GEOFENCE.BOUNDS.MIN_LNG &&
      parsedLng <= BENGALURU_GEOFENCE.BOUNDS.MAX_LNG;

    if (!isWithinBengaluru) {
      return res.status(400).json({
        success: false,
        code: 'OUTSIDE_GEOFENCE',
        message: `Location outside service area. ChargeShare currently operates exclusively within Bengaluru, Karnataka (Latitude: ${BENGALURU_GEOFENCE.BOUNDS.MIN_LAT} to ${BENGALURU_GEOFENCE.BOUNDS.MAX_LAT}, Longitude: ${BENGALURU_GEOFENCE.BOUNDS.MIN_LNG} to ${BENGALURU_GEOFENCE.BOUNDS.MAX_LNG}).`,
      });
    }

    const charger = await Charger.create({
      hostId: req.user._id,
      title,
      description,
      address,
      city: BENGALURU_GEOFENCE.CITY,
      state: BENGALURU_GEOFENCE.STATE,
      postalCode,
      location: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      },
      connectorType,
      powerKW,
      pricingType: pricingType || 'PER_KWH',
      price,
      photos: photos || [],
      houseRules: houseRules || undefined,
      safetyFeatures: safetyFeatures || undefined,
      instantBooking: instantBooking !== undefined ? instantBooking : true,
      availabilityMode: availabilityMode || 'INSTANT_BOOKING',
      emergencySupport: emergencySupport !== undefined ? emergencySupport : true,
      allowsReservations: allowsReservations !== undefined ? allowsReservations : true,
      requiresApproval: requiresApproval !== undefined ? requiresApproval : false,
      responseTimeMinutes: responseTimeMinutes || 5,
      idleFeePerMinute: idleFeePerMinute !== undefined ? idleFeePerMinute : 2,
      contactPhone: contactPhone || '',
      weeklySchedule: weeklySchedule || undefined,
      status: 'PENDING_VERIFICATION',
      liveStatus: 'AVAILABLE',
    });

    res.status(201).json({
      success: true,
      message: 'Charger listing created. It is now pending admin verification.',
      charger,
    });
  } catch (error) {
    next(error);
  }
};

export const getChargers = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radiusKm = 25,
      area,
      connectorType,
      minPower,
      maxPrice,
      minRating,
      verifiedOnly = true,
      availableNow,
      emergencyOnly,
      instantBookingOnly,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      city: { $regex: /^Bengaluru$/i },
      'location.coordinates.1': {
        $gte: BENGALURU_GEOFENCE.BOUNDS.MIN_LAT,
        $lte: BENGALURU_GEOFENCE.BOUNDS.MAX_LAT,
      },
      'location.coordinates.0': {
        $gte: BENGALURU_GEOFENCE.BOUNDS.MIN_LNG,
        $lte: BENGALURU_GEOFENCE.BOUNDS.MAX_LNG,
      },
    };

    if (verifiedOnly === true || verifiedOnly === 'true') {
      query.status = 'VERIFIED';
    }

    if (connectorType) {
      query.connectorType = connectorType;
    }

    if (minPower) {
      query.powerKW = { $gte: Number(minPower) };
    }

    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
    }

    if (minRating) {
      query.ratingAvg = { $gte: Number(minRating) };
    }

    if (emergencyOnly === true || emergencyOnly === 'true') {
      query.emergencySupport = true;
    }

    if (instantBookingOnly === true || instantBookingOnly === 'true') {
      query.instantBooking = true;
    }

    if (area) {
      const areaRegex = new RegExp(area, 'i');
      query.$or = [{ address: areaRegex }, { title: areaRegex }, { description: areaRegex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const now = new Date();

    // If geolocation is provided, use $geoNear aggregation
    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      let parsedLat = parseFloat(lat);
      let parsedLng = parseFloat(lng);

      if (
        parsedLat < BENGALURU_GEOFENCE.BOUNDS.MIN_LAT ||
        parsedLat > BENGALURU_GEOFENCE.BOUNDS.MAX_LAT ||
        parsedLng < BENGALURU_GEOFENCE.BOUNDS.MIN_LNG ||
        parsedLng > BENGALURU_GEOFENCE.BOUNDS.MAX_LNG
      ) {
        parsedLat = BENGALURU_GEOFENCE.DEFAULT_LAT;
        parsedLng = BENGALURU_GEOFENCE.DEFAULT_LNG;
      }

      const maxDistanceMeters = Number(radiusKm) * 1000;

      const geoQuery = {
        city: { $regex: /^Bengaluru$/i },
      };
      if (verifiedOnly === true || verifiedOnly === 'true') geoQuery.status = 'VERIFIED';
      if (connectorType) geoQuery.connectorType = connectorType;
      if (minPower) geoQuery.powerKW = { $gte: Number(minPower) };
      if (maxPrice) geoQuery.price = { $lte: Number(maxPrice) };
      if (minRating) geoQuery.ratingAvg = { $gte: Number(minRating) };
      if (emergencyOnly === true || emergencyOnly === 'true') geoQuery.emergencySupport = true;
      if (instantBookingOnly === true || instantBookingOnly === 'true') geoQuery.instantBooking = true;
      if (area) {
        const areaRegex = new RegExp(area, 'i');
        geoQuery.$or = [{ address: areaRegex }, { title: areaRegex }, { description: areaRegex }];
      }

      const pipeline = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parsedLng, parsedLat],
            },
            distanceField: 'distanceMeters',
            maxDistance: maxDistanceMeters,
            spherical: true,
            query: geoQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'hostId',
            foreignField: '_id',
            as: 'host',
          },
        },
        { $unwind: { path: '$host', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            'host.password': 0,
          },
        },
        { $skip: skip },
        { $limit: Number(limit) },
      ];

      const rawChargers = await Charger.aggregate(pipeline);
      const total = await Charger.countDocuments(geoQuery);

      // Compute dynamic live status for each charger
      const chargersWithStatus = await Promise.all(
        rawChargers.map(async (c) => {
          const liveInfo = await computeLiveStatus(c, now);
          return {
            ...c,
            distanceKm: c.distanceMeters ? Math.round((c.distanceMeters / 1000) * 10) / 10 : null,
            liveStatus: liveInfo.liveStatus,
            availableNow: liveInfo.availableNow,
            occupiedUntil: liveInfo.occupiedUntil || null,
            estimatedWaitMinutes: liveInfo.estimatedWaitMinutes || 0,
          };
        })
      );

      // If availableNow filter was passed, filter in-memory
      const filtered = (availableNow === true || availableNow === 'true')
        ? chargersWithStatus.filter((c) => c.availableNow)
        : chargersWithStatus;

      return res.status(200).json({
        success: true,
        count: filtered.length,
        total,
        page: Number(page),
        chargers: filtered.map(attachBayMedia),
      });
    }

    // Standard query without geo coordinates
    const chargers = await Charger.find(query)
      .populate('hostId', 'name avatar isVerifiedHost city isOnline expectedResponseTime phone')
      .sort({ ratingAvg: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Charger.countDocuments(query);

    const chargersWithStatus = await Promise.all(
      chargers.map(async (c) => {
        const liveInfo = await computeLiveStatus(c, now);
        const obj = c.toObject();
        return {
          ...obj,
          liveStatus: liveInfo.liveStatus,
          availableNow: liveInfo.availableNow,
          occupiedUntil: liveInfo.occupiedUntil || null,
          estimatedWaitMinutes: liveInfo.estimatedWaitMinutes || 0,
        };
      })
    );

    const filtered = (availableNow === true || availableNow === 'true')
      ? chargersWithStatus.filter((c) => c.availableNow)
      : chargersWithStatus;

    res.status(200).json({
      success: true,
      count: filtered.length,
      total,
      page: Number(page),
      chargers: filtered.map(attachBayMedia),
    });
  } catch (error) {
    next(error);
  }
};

export const getChargerById = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id).populate(
      'hostId',
      'name avatar isVerifiedHost city isOnline expectedResponseTime phone createdAt'
    );

    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger listing not found',
      });
    }

    const liveInfo = await computeLiveStatus(charger);
    const chargerObj = charger.toObject();

    res.status(200).json({
      success: true,
      charger: attachBayMedia({
        ...chargerObj,
        liveStatus: liveInfo.liveStatus,
        availableNow: liveInfo.availableNow,
        occupiedUntil: liveInfo.occupiedUntil || null,
        nextAvailableAt: liveInfo.nextAvailableAt || null,
        estimatedWaitMinutes: liveInfo.estimatedWaitMinutes || 0,
        operatingHours: liveInfo.operatingHours || '06:00 - 22:00',
        liveDetails: liveInfo,
      }),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Real-time Live Status endpoint for polling / immediate status checking
 */
export const getChargerLiveStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const charger = await Charger.findById(id).populate(
      'hostId',
      'name isOnline expectedResponseTime phone'
    );

    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger listing not found',
      });
    }

    const liveInfo = await computeLiveStatus(charger);

    res.status(200).json({
      success: true,
      chargerId: charger._id,
      ...liveInfo,
      host: {
        id: charger.hostId?._id,
        name: charger.hostId?.name,
        isOnline: charger.hostId?.isOnline ?? true,
        expectedResponseTime: charger.hostId?.expectedResponseTime || '< 5 mins',
        phone: charger.contactPhone || charger.hostId?.phone || '',
      },
      instantBooking: charger.instantBooking,
      emergencySupport: charger.emergencySupport,
      requiresApproval: charger.requiresApproval,
      allowsReservations: charger.allowsReservations,
      idleFeePerMinute: charger.idleFeePerMinute || 2,
      pricingType: charger.pricingType,
      price: charger.price,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Emergency alternatives finder
 */
export const getEmergencyAlternatives = async (req, res, next) => {
  try {
    const { lat, lng, connectorType, radiusKm = 25 } = req.query;
    const now = new Date();

    const query = {
      city: { $regex: /^Bengaluru$/i },
      status: 'VERIFIED',
      emergencySupport: true,
    };

    if (connectorType) {
      query.connectorType = connectorType;
    }

    let parsedLat = parseFloat(lat || BENGALURU_GEOFENCE.DEFAULT_LAT);
    let parsedLng = parseFloat(lng || BENGALURU_GEOFENCE.DEFAULT_LNG);

    if (
      parsedLat < BENGALURU_GEOFENCE.BOUNDS.MIN_LAT ||
      parsedLat > BENGALURU_GEOFENCE.BOUNDS.MAX_LAT ||
      parsedLng < BENGALURU_GEOFENCE.BOUNDS.MIN_LNG ||
      parsedLng > BENGALURU_GEOFENCE.BOUNDS.MAX_LNG
    ) {
      parsedLat = BENGALURU_GEOFENCE.DEFAULT_LAT;
      parsedLng = BENGALURU_GEOFENCE.DEFAULT_LNG;
    }

    const pipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parsedLng, parsedLat],
          },
          distanceField: 'distanceMeters',
          maxDistance: Number(radiusKm) * 1000,
          spherical: true,
          query,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'hostId',
          foreignField: '_id',
          as: 'host',
        },
      },
      { $unwind: { path: '$host', preserveNullAndEmptyArrays: true } },
      { $limit: 15 },
    ];

    const rawStations = await Charger.aggregate(pipeline);

    const evaluatedStations = await Promise.all(
      rawStations.map(async (c) => {
        const liveInfo = await computeLiveStatus(c, now);
        return {
          ...c,
          distanceKm: c.distanceMeters ? Math.round((c.distanceMeters / 1000) * 10) / 10 : 0.5,
          liveStatus: liveInfo.liveStatus,
          availableNow: liveInfo.availableNow,
          occupiedUntil: liveInfo.occupiedUntil || null,
          estimatedWaitMinutes: liveInfo.estimatedWaitMinutes || 0,
          hostPhone: c.contactPhone || c.host?.phone || '',
        };
      })
    );

    // Sort: 1) AVAILABLE stations first (by distanceKm), then 2) OCCUPIED by estimated wait time
    evaluatedStations.sort((a, b) => {
      if (a.availableNow && !b.availableNow) return -1;
      if (!a.availableNow && b.availableNow) return 1;
      if (a.availableNow && b.availableNow) return (a.distanceKm || 0) - (b.distanceKm || 0);
      return (a.estimatedWaitMinutes || 0) - (b.estimatedWaitMinutes || 0);
    });

    res.status(200).json({
      success: true,
      count: evaluatedStations.length,
      stations: evaluatedStations.map(attachBayMedia),
    });
  } catch (error) {
    next(error);
  }
};

export const getMyListings = async (req, res, next) => {
  try {
    const chargers = await Charger.find({ hostId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: chargers.length,
      chargers: chargers.map((c) => attachBayMedia(c.toObject())),
    });
  } catch (error) {
    next(error);
  }
};

export const updateCharger = async (req, res, next) => {
  try {
    let charger = await Charger.findById(req.params.id);
    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger not found',
      });
    }

    if (charger.hostId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to edit this charger listing',
      });
    }

    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      const parsedLat = Number(req.body.latitude);
      const parsedLng = Number(req.body.longitude);
      const isWithinBengaluru =
        parsedLat >= BENGALURU_GEOFENCE.BOUNDS.MIN_LAT &&
        parsedLat <= BENGALURU_GEOFENCE.BOUNDS.MAX_LAT &&
        parsedLng >= BENGALURU_GEOFENCE.BOUNDS.MIN_LNG &&
        parsedLng <= BENGALURU_GEOFENCE.BOUNDS.MAX_LNG;

      if (!isWithinBengaluru) {
        return res.status(400).json({
          success: false,
          message: `Location outside Bengaluru service area. Coordinates must be within Latitude ${BENGALURU_GEOFENCE.BOUNDS.MIN_LAT}-${BENGALURU_GEOFENCE.BOUNDS.MAX_LAT} and Longitude ${BENGALURU_GEOFENCE.BOUNDS.MIN_LNG}-${BENGALURU_GEOFENCE.BOUNDS.MAX_LNG}.`,
        });
      }

      req.body.location = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      };
    }

    charger = await Charger.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      charger,
    });
  } catch (error) {
    next(error);
  }
};

export const pauseCharger = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id);
    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger not found',
      });
    }

    if (charger.hostId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to modify this charger',
      });
    }

    const newStatus = charger.status === 'PAUSED' ? 'VERIFIED' : 'PAUSED';
    charger.status = newStatus;
    await charger.save();

    res.status(200).json({
      success: true,
      message: `Charger is now ${newStatus.toLowerCase()}`,
      status: newStatus,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCharger = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id);
    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger not found',
      });
    }

    if (charger.hostId.toString() !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Not authorized to delete this charger',
      });
    }

    await charger.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Charger listing deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getChargerAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    const charger = await Charger.findById(id);
    if (!charger) {
      return res.status(404).json({
        success: false,
        code: 'CHARGER_NOT_FOUND',
        message: 'Charger not found',
      });
    }

    const targetDate = date ? new Date(date) : new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    // Check if whole date is blocked
    if (charger.blockedDates && charger.blockedDates.includes(dateStr)) {
      return res.status(200).json({
        success: true,
        date: dateStr,
        isBlocked: true,
        slots: [],
      });
    }

    const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ...
    const daySchedule = charger.weeklySchedule?.find((s) => s.day === dayOfWeek) || {
      open: '06:00',
      close: '22:00',
      isActive: true,
    };

    if (!daySchedule.isActive) {
      return res.status(200).json({
        success: true,
        date: dateStr,
        isClosed: true,
        slots: [],
      });
    }

    // Parse open and close hours
    const [openHour, openMin] = daySchedule.open.split(':').map(Number);
    const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Fetch existing active bookings for this charger on target date
    const existingBookings = await Booking.find({
      chargerId: id,
      status: { $in: ['PENDING_PAYMENT', 'CONFIRMED', 'PENDING_APPROVAL', 'ACTIVE'] },
      slotStart: { $gte: startOfDay, $lte: endOfDay },
    });

    const bookedSlotsSet = new Set(
      existingBookings.map((b) => new Date(b.slotStart).toISOString())
    );

    // Generate discrete 60-min slots
    const slots = [];
    const openMinutesTotal = openHour * 60 + openMin;
    const closeMinutesTotal = closeHour * 60 + closeMin;

    for (let m = openMinutesTotal; m < closeMinutesTotal; m += 60) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const slotStartTime = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00.000Z`);
      const slotEndTime = new Date(slotStartTime.getTime() + 60 * 60 * 1000);

      const isTaken = bookedSlotsSet.has(slotStartTime.toISOString());
      const isPast = slotStartTime.getTime() <= Date.now();

      slots.push({
        slotStart: slotStartTime.toISOString(),
        slotEnd: slotEndTime.toISOString(),
        timeLabel: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} - ${String(h + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        isAvailable: !isTaken && !isPast,
        reason: isTaken ? 'BOOKED' : isPast ? 'PAST' : 'AVAILABLE',
      });
    }

    const liveInfo = await computeLiveStatus(charger);

    res.status(200).json({
      success: true,
      date: dateStr,
      schedule: daySchedule,
      liveStatus: liveInfo.liveStatus,
      availableNow: liveInfo.availableNow,
      slots,
    });
  } catch (error) {
    next(error);
  }
};
