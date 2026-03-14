import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';

interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (photoUrl: string) => Promise<void> | void;
}

const videoConstraints = {
  width: 320,
  height: 320,
  facingMode: 'user',
};

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async () => {
    setError(null);
    setLoading(true);
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setError('Nie udało się zrobić zdjęcia. Spróbuj ponownie.');
      setLoading(false);
      return;
    }
    try {
      await onSuccess(imageSrc);
      onClose();
    } catch (e) {
      setError('Weryfikacja nie powiodła się. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs flex flex-col items-center">
        <h2 className="text-lg font-semibold mb-2">Weryfikacja twarzy</h2>
        <p className="text-sm text-slate-600 mb-3 text-center">
          Zrób selfie, aby potwierdzić, że jesteś prawdziwą osobą.<br />
          Twoje zdjęcie zostanie użyte wyłącznie do weryfikacji i nie będzie widoczne publicznie.<br />
          Weryfikacja zwiększa zaufanie innych użytkowników.
        </p>
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          className="rounded mb-3 border"
        />
        {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2 disabled:opacity-60"
          onClick={handleCapture}
          disabled={loading}
        >
          {loading ? 'Weryfikacja...' : 'Zrób selfie i zweryfikuj'}
        </button>
        <button
          className="text-slate-500 text-xs underline"
          onClick={onClose}
          disabled={loading}
        >
          Anuluj
        </button>
      </div>
    </div>
  );
};
