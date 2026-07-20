import { useEffect, useRef, useState } from 'react';
import { FiCamera, FiRotateCcw } from 'react-icons/fi';
import Modal from './Modal';
import Button from './Button';

/**
 * Opens the device camera in a modal, lets the person snap a still frame,
 * preview it, retake if needed, and confirm — hands back a File (JPEG)
 * ready to go through the same upload path as a chosen file.
 */
export default function PhotoCapture({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null); // data URL
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;

    setSnapshot(null);
    setError('');

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Could not access your camera. Check your browser permissions and try again.'));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen]);

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.92));
  };

  const handleRetake = () => setSnapshot(null);

  const handleUse = async () => {
    const res = await fetch(snapshot);
    const blob = await res.blob();
    const file = new File([blob], `profile-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Take a photo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', alignItems: 'center' }}>
        {error && <p className="form-error">{error}</p>}

        <div style={{
          width: '100%', maxWidth: 360, aspectRatio: '1 / 1', borderRadius: 'var(--radius-md)',
          overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {snapshot ? (
            <img src={snapshot} alt="Captured preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {snapshot ? (
            <>
              <Button type="button" variant="secondary" onClick={handleRetake}>
                <FiRotateCcw /> Retake
              </Button>
              <Button type="button" onClick={handleUse}>Use this photo</Button>
            </>
          ) : (
            <Button type="button" onClick={handleCaptureFrame} disabled={!!error}>
              <FiCamera /> Capture
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
