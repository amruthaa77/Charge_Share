import React, { useState, useEffect, useCallback, memo } from 'react';
import { vehicleAPI } from '../services/api';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { DataErrorState } from '../components/common/DataErrorState';
import { useToast } from '../context/ToastContext';
import { getErrorMessage, applyServerErrors } from '../utils/errorMapper';
import { Bike, Plus, Trash2, Edit2, BatteryCharging } from 'lucide-react';

// Bengaluru Two-Wheeler Presets
const SCOOTER_PRESETS = [
  { make: 'Ather', model: '450X', connector: '3-pin', kwh: 3.7 },
  { make: 'Ola Electric', model: 'S1 Pro Gen 2', connector: '3-pin', kwh: 4.0 },
  { make: 'TVS', model: 'iQube ST', connector: '3-pin', kwh: 5.1 },
  { make: 'Bajaj', model: 'Chetak Premium', connector: '3-pin', kwh: 3.2 },
  { make: 'Hero', model: 'Vida V1 Pro', connector: '3-pin', kwh: 3.94 },
  { make: 'Simple Energy', model: 'Simple One', connector: '3-pin', kwh: 5.0 },
  { make: 'Ultraviolette', model: 'F77 Mach 2', connector: '3-pin', kwh: 10.3 },
];

// Module-level memoized vehicle form modal
const VehicleFormModal = memo(({ isOpen, onClose, editingVehicle, onSave }) => {
  const [make, setMake] = useState('Ather');
  const [model, setModel] = useState('450X');
  const [year, setYear] = useState(2024);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [regError, setRegError] = useState('');
  const [regTouched, setRegTouched] = useState(false);
  const [connectorType, setConnectorType] = useState('3-pin');
  const [batteryCapacityKWh, setBatteryCapacityKWh] = useState(3.7);
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Initialize form state once when modal opens or editingVehicle changes
  useEffect(() => {
    if (isOpen) {
      if (editingVehicle) {
        setMake(editingVehicle.make || 'Ather');
        setModel(editingVehicle.model || '450X');
        setYear(editingVehicle.year || 2024);
        setRegistrationNumber(editingVehicle.registrationNumber || '');
        setConnectorType(editingVehicle.connectorType || '3-pin');
        setBatteryCapacityKWh(editingVehicle.batteryCapacityKWh || 3.7);
        setIsDefault(Boolean(editingVehicle.isDefault));
      } else {
        setMake('Ather');
        setModel('450X');
        setYear(2024);
        setRegistrationNumber('');
        setConnectorType('3-pin');
        setBatteryCapacityKWh(3.7);
        setIsDefault(false);
      }
      setRegError('');
      setRegTouched(false);
      setModalError(null);
    }
  }, [isOpen, editingVehicle]);

  const applyPreset = (preset) => {
    setMake(preset.make);
    setModel(preset.model);
    setConnectorType(preset.connector);
    setBatteryCapacityKWh(preset.kwh);
  };

  const validateReg = (val) => {
    const clean = val.trim();
    if (!clean) {
      setRegError('Registration number is required.');
      return false;
    }
    if (clean.length < 4 || clean.length > 20) {
      setRegError('Registration number must be between 4 and 20 characters (e.g. KA01EV1234).');
      return false;
    }
    setRegError('');
    return true;
  };

  const handleRegBlur = () => {
    const sanitized = registrationNumber.toUpperCase().replace(/[\s-]+/g, '');
    setRegistrationNumber(sanitized);
    setRegTouched(true);
    validateReg(sanitized);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanReg = registrationNumber.toUpperCase().replace(/[\s-]+/g, '');
    setRegistrationNumber(cleanReg);
    setRegTouched(true);
    if (!validateReg(cleanReg)) return;

    setSubmitting(true);
    setModalError(null);
    try {
      await onSave({
        make: make.trim(),
        model: model.trim(),
        year: Number(year) || 2024,
        registrationNumber: cleanReg,
        connectorType,
        batteryCapacityKWh: Number(batteryCapacityKWh) || 3.7,
        isDefault,
      });
      onClose();
    } catch (err) {
      applyServerErrors(
        err,
        (mapped) => {
          if (mapped.registrationNumber) {
            setRegError(mapped.registrationNumber);
            setRegTouched(true);
          }
        },
        setModalError
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingVehicle ? 'Edit EV Two-Wheeler' : 'Add EV Two-Wheeler'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {modalError && (
          <ErrorAlert
            error={modalError}
            onDismiss={() => setModalError(null)}
          />
        )}
        {/* Quick Presets */}
        <div>
          <span className="text-xs font-bold text-text-primary block mb-1.5">
            Popular Bengaluru Scooters:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SCOOTER_PRESETS.map((p) => (
              <button
                key={p.model}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 min-h-[36px] flex items-center rounded-xl bg-bg-elevated hover:bg-brand/10 text-text-primary font-semibold text-[11px] border border-border transition-colors cursor-pointer"
              >
                {p.make} {p.model}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="vehMake"
            label="Make:"
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            required
            placeholder="e.g. Ather"
          />
          <Input
            id="vehModel"
            label="Model:"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
            placeholder="e.g. 450X"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="vehReg"
            label="Registration #:"
            type="text"
            value={registrationNumber}
            onChange={(e) => {
              setRegistrationNumber(e.target.value);
              if (regError) setRegError('');
            }}
            onBlur={handleRegBlur}
            required
            placeholder="KA 03 EV 1234"
            helperText="e.g. KA01EV1234"
            error={regTouched ? regError : ''}
            className="font-mono uppercase"
          />
          <Input
            id="vehKwh"
            label="Battery (kWh):"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0.5"
            max="25.0"
            value={batteryCapacityKWh}
            onChange={(e) => setBatteryCapacityKWh(e.target.value)}
            required
            placeholder="3.7"
            helperText="Standard 16A pack capacity (0.5 – 25.0 kWh)"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer font-semibold text-text-primary pt-1">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
          />
          <span>Set as default vehicle for booking</span>
        </label>

        <div className="flex justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold text-text-secondary bg-surface hover:bg-bg-elevated transition-colors cursor-pointer touch-target-min"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 min-h-[44px] flex items-center justify-center rounded-xl text-xs font-bold text-brand-contrast bg-brand hover:opacity-90 transition-colors cursor-pointer touch-target-min"
          >
            {submitting ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
});

VehicleFormModal.displayName = 'VehicleFormModal';

export const VehiclesPage = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await vehicleAPI.getMyVehicles();
      setVehicles(res.data.vehicles || []);
    } catch (err) {
      console.error('Failed to load vehicles', err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const openAddModal = useCallback(() => {
    setEditingVehicle(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((v) => {
    setEditingVehicle(v);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingVehicle(null);
  }, []);

  const handleSaveVehicle = useCallback(async (payload) => {
    if (editingVehicle) {
      await vehicleAPI.update(editingVehicle._id, payload);
    } else {
      await vehicleAPI.create(payload);
    }
    fetchVehicles();
  }, [editingVehicle, fetchVehicles]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle from your garage?')) return;
    try {
      await vehicleAPI.delete(id);
      toast.success('Vehicle removed from garage');
      fetchVehicles();
    } catch (err) {
      const mapped = getErrorMessage(err);
      toast.error(mapped.message);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-24 bg-bg text-text-primary transition-colors">
      {/* Unified Page Header */}
      <PageHeader
        badgeText="Two-Wheeler Garage"
        badgeSubtext="• 16A Socket Compatibility"
        title="My Electric Two-Wheelers"
        description="Register your electric scooter or motorcycle (Ather, Ola, TVS, Chetak) for 1-click slot booking."
        action={
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-semibold text-xs hover:opacity-90 transition-all shadow-luxury-sm flex items-center gap-1.5 cursor-pointer touch-target-min"
          >
            <Plus className="w-4 h-4 text-brand-contrast" />
            <span>Add Electric Scooter</span>
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2].map((n) => (
              <div key={n} className="h-44 rounded-3xl bg-surface border border-border animate-pulse p-6 shadow-luxury-sm" />
            ))}
          </div>
        ) : fetchError ? (
          <DataErrorState
            error={fetchError}
            title="Couldn't load your garage"
            description="We couldn't retrieve your saved vehicles. Please check your connection and try again."
            onRetry={fetchVehicles}
          />
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center rounded-4xl bg-surface border border-border shadow-luxury-sm space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto">
              <Bike className="w-7 h-7" />
            </div>
            <h3 className="font-editorial text-xl font-bold text-text-primary">
              No electric scooters in your garage
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
              Add your Ather, Ola, TVS, or Chetak to automatically prefill slot durations and 16A socket compatibility.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={openAddModal}
                className="px-5 py-2.5 min-h-[44px] rounded-2xl bg-brand text-brand-contrast font-bold text-xs hover:opacity-90 transition-all shadow-luxury-sm inline-flex items-center gap-1.5 cursor-pointer touch-target-min"
              >
                <Plus className="w-4 h-4 text-brand-contrast" />
                <span>Add EV Scooter Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {vehicles.map((v) => (
              <div
                key={v._id}
                className="p-6 rounded-3xl bg-surface border border-border hover:border-brand/40 space-y-4 relative group shadow-luxury-sm hover:shadow-luxury transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(v)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer touch-target-min"
                      title="Edit vehicle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v._id)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer touch-target-min"
                      title="Delete vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-bg-elevated text-text-secondary border border-border text-[11px] font-bold">
                      EV Scooter
                    </span>
                    <h3 className="font-editorial text-lg font-bold text-text-primary">
                      {v.make} {v.model}
                    </h3>
                    {v.isDefault && (
                      <span className="text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-text-muted mt-1 tracking-wider">
                    {v.registrationNumber} • {v.year}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-bg-elevated text-text-secondary border border-border font-semibold text-[11px]">
                    🔌 16A 3-Pin Single Phase
                  </span>
                  <span className="text-text-secondary flex items-center gap-1 font-semibold">
                    <BatteryCharging className="w-3.5 h-3.5 text-brand" />
                    <span>{v.batteryCapacityKWh} kWh Pack</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Vehicle Modal */}
      <VehicleFormModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        editingVehicle={editingVehicle}
        onSave={handleSaveVehicle}
      />
    </div>
  );
};
