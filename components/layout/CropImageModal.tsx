'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, RotateCcw } from 'lucide-react';

interface CropImageModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onSave: (crop: { x: number; y: number; width: number; height: number }, zoom: number) => Promise<void>;
}

export default function CropImageModal({ isOpen, imageSrc, onClose, onSave }: CropImageModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (croppedAreaPixels) {
        await onSave(croppedAreaPixels, zoom);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl md:max-w-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 hover:bg-slate-200"
        >
          <X size={20} className="text-slate-600" />
        </button>

        <h3 className="mb-4 text-xl font-bold text-slate-800">Kadruj zdjęcie</h3>

        <div className="relative mb-4 h-96 w-full overflow-hidden rounded-xl bg-slate-100">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="mb-4 space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw size={16} />
            Resetuj
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
          >
            <Check size={16} />
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
