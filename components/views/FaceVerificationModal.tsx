import React, { useEffect, useRef, useState } from 'react';
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
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setCapturedImage(null);
      setPreviewOpen(false);
    }
  }, [isOpen]);

  const handleCapture = () => {
    setError(null);
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      setError('Nie udało się zrobić zdjęcia. Spróbuj ponownie.');
      return;
    }

    setCapturedImage(imageSrc);
  };

  const handleSubmit = async () => {
    if (!capturedImage) {
      setError('Najpierw zrób selfie.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSuccess(capturedImage);
      onClose();
    } catch {
      setError('Weryfikacja nie powiodła się. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    if (loading) return;

    setError(null);
    setCapturedImage(null);
    setPreviewOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-2">Weryfikacja twarzy</h2>
          <p className="text-sm text-slate-600 mb-4 text-center">
            Zrób selfie, aby potwierdzić, że jesteś prawdziwą osobą.<br />
            Twoje zdjęcie zostanie użyte wyłącznie do weryfikacji i nie będzie widoczne publicznie.<br />
            Przed wysłaniem możesz sprawdzić podgląd i powiększyć zdjęcie.
          </p>

          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="relative mb-3 w-full overflow-hidden rounded-xl border border-slate-200 group"
              >
                <img
                  src={capturedImage}
                  alt="Podglad selfie do weryfikacji"
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                    Kliknij, aby powiekszyc
                  </span>
                </div>
              </button>
              <p className="text-xs text-slate-500 mb-3 text-center">
                Sprawdź, czy twarz jest wyraźna i dobrze widoczna. Jeśli nie, zrób zdjęcie ponownie.
              </p>
            </>
          ) : (
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              className="rounded-xl mb-3 border w-full"
            />
          )}

          {error && <div className="text-red-500 text-xs mb-2">{error}</div>}

          {capturedImage ? (
            <>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Wysyłanie selfie...' : 'Wyślij selfie do weryfikacji'}
              </button>
              <button
                className="border border-slate-300 text-slate-700 px-4 py-2 rounded w-full mb-2 disabled:opacity-60"
                onClick={handleRetake}
                disabled={loading}
              >
                Zrób zdjęcie ponownie
              </button>
            </>
          ) : (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded w-full mb-2 disabled:opacity-60"
              onClick={handleCapture}
              disabled={loading}
            >
              Zrób selfie
            </button>
          )}

          <button
            className="text-slate-500 text-xs underline"
            onClick={onClose}
            disabled={loading}
          >
            Anuluj
          </button>
        </div>
      </div>

      {previewOpen && capturedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-black shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={capturedImage}
              alt="Powiekszone selfie do weryfikacji"
              className="w-full max-h-[85vh] object-contain bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
};
