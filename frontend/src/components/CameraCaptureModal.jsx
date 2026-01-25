import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera, RotateCcw, Check } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Reusable Camera Capture Modal Component
 * Used for capturing member profile photos via device camera
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Callback when modal is closed
 * @param {function} props.onCapture - Callback with captured image data URL
 * @param {string} props.title - Modal title (default: "Capture Member Photo")
 * @param {string} props.subtitle - Modal subtitle
 */
export default function CameraCaptureModal({ 
  isOpen, 
  onClose, 
  onCapture,
  title = "Capture Member Photo",
  subtitle = "Grant camera permissions to click a quick photo from this device."
}) {
  const [capturedImage, setCapturedImage] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [cameraLoading, setCameraLoading] = useState(false)
  const [facingMode, setFacingMode] = useState('user') // 'user' for front camera, 'environment' for back
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Cleanup camera stream
  const cleanupCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Initialize camera
  const initializeCamera = async (mode = facingMode) => {
    setCapturedImage(null)
    setCameraError('')
    setCameraLoading(true)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported on this browser/device.')
      setCameraLoading(false)
      return
    }

    try {
      cleanupCameraStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false
      })

      streamRef.current = stream

      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream
          videoRef.current.play().then(() => {
            setCameraLoading(false)
          }).catch((err) => {
            console.error('Error playing video:', err)
            setCameraError('Failed to start camera preview.')
            setCameraLoading(false)
          })
        }
      }, 100)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setCameraError('Unable to access camera. Please check permissions and try again.')
      setCameraLoading(false)
    }
  }

  // Stop camera and close modal
  const handleClose = () => {
    cleanupCameraStream()
    setCapturedImage(null)
    setCameraError('')
    setCameraLoading(false)
    onClose()
  }

  // Capture photo from video stream
  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) {
      toast.error('Video element not found.')
      return
    }

    if (video.readyState < 2) {
      toast.error('Camera not ready. Please wait a moment.')
      return
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Video dimensions not available. Please try again.')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(imageData)
      toast.success('Photo captured! Review and confirm below.')
    } catch (error) {
      console.error('Error capturing photo:', error)
      toast.error('Failed to capture photo. Please try again.')
    }
  }

  // Confirm and use captured photo
  const confirmPhoto = () => {
    if (!capturedImage) return
    onCapture(capturedImage)
    handleClose()
    toast.success('Photo saved successfully!')
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
  }

  // Switch between front and back camera
  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(newMode)
    cleanupCameraStream()
    await initializeCamera(newMode)
  }

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera(facingMode)
    }
    return () => {
      cleanupCameraStream()
    }
  }, [isOpen])

  // Handle video stream assignment
  useEffect(() => {
    if (isOpen && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [isOpen])

  if (!isOpen) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[10002] flex items-center justify-center" 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border border-gray-200 relative" 
        style={{ zIndex: 10003, pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-100 px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClose(); }}
            className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-200 rounded z-10"
            style={{ position: 'relative', zIndex: 10 }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera Preview Area */}
        <div className="bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr] items-start">
            {/* Video/Image Preview */}
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '320px' }}>
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured preview"
                  className="w-full h-full object-cover"
                />
              ) : cameraError ? (
                <div className="flex items-center justify-center h-full text-center px-6">
                  <p className="text-sm text-gray-200">{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(console.error)
                    }
                  }}
                  onCanPlay={() => {
                    setCameraLoading(false)
                  }}
                />
              )}
              
              {/* Loading Overlay */}
              {cameraLoading && !capturedImage && !cameraError && (
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <p className="text-white text-sm">Requesting camera access…</p>
                </div>
              )}
              
              {/* Camera Switch Button */}
              {!capturedImage && !cameraError && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); switchCamera(); }}
                  className="absolute top-3 right-3 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-700 p-2 rounded-full shadow-md transition-all z-10"
                  title="Switch Camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Tips & Actions */}
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600 bg-gray-50">
                <p className="font-semibold text-gray-900 mb-1">Tips</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Ensure good lighting for sharper images.</li>
                  <li>Frame the member's shoulders and head.</li>
                  <li>Use the switch button for front/back cameras.</li>
                </ul>
              </div>

              {/* Action Buttons */}
              {!capturedImage && !cameraError ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                  disabled={cameraLoading || !videoRef.current || (videoRef.current && (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0))}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Camera className="w-5 h-5" />
                  <span>{cameraLoading ? 'Loading Camera...' : 'Capture Photo'}</span>
                </button>
              ) : capturedImage ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); retakePhoto(); }}
                    className="w-full px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); confirmPhoto(); }}
                    className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>Use This Photo</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); initializeCamera(facingMode); }}
                    className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                  >
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    className="w-full px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

