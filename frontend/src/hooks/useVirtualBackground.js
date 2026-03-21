import { useRef, useEffect, useCallback, useState } from 'react'
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'

const MASK_ALPHA = 0.42
const EDGE_BLUR_PX = 3

export const BEAUTY_FILTERS = [
  null,
  'brightness(1.04) contrast(1.06) saturate(1.08)',
  'brightness(1.08) contrast(1.1) saturate(1.12) sepia(0.06)',
  'brightness(1.12) contrast(1.16) saturate(1.16) sepia(0.1)',
]

export const BEAUTY_LABELS = ['Off', 'Subtle', 'Medium', 'Strong']

export function useVirtualBackground(cameraStream) {
  const [bgMode, setBgMode] = useState('none')
  const [beautyLevel, setBeautyLevelState] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const segmenterRef = useRef(null)
  const activeRef = useRef(false)
  const rafRef = useRef(null)

  const bgModeRef = useRef('none')
  const bgImageRef = useRef(null)
  const beautyLevelRef = useRef(0)

  const prevMaskRef = useRef(null)

  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const tempCanvasRef = useRef(null)
  const tempCtxRef = useRef(null)
  const maskCanvasRef = useRef(null)
  const maskCtxRef = useRef(null)
  const edgeMaskCanvasRef = useRef(null)
  const edgeMaskCtxRef = useRef(null)
  const maskImgDataRef = useRef(null)

  const hiddenVideoRef = useRef(null)
  const canvasStreamRef = useRef(null)

  useEffect(() => {
    if (!cameraStream) return
    let cancelled = false

    async function init() {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
        const seg = await ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        })
        if (cancelled) { seg.close(); return }
        segmenterRef.current = seg
        setIsReady(true)
        console.log('[VB] MediaPipe ready')
      } catch (e) {
        console.error('[VB] init failed:', e)
      }
    }
    init()

    return () => {
      cancelled = true
      segmenterRef.current?.close()
      segmenterRef.current = null
      setIsReady(false)
    }
  }, [cameraStream])

  const stopProcessing = useCallback(() => {
    activeRef.current = false
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null
      hiddenVideoRef.current = null
    }
    canvasRef.current = null;       ctxRef.current = null
    tempCanvasRef.current = null;   tempCtxRef.current = null
    maskCanvasRef.current = null;   maskCtxRef.current = null
    edgeMaskCanvasRef.current = null; edgeMaskCtxRef.current = null
    maskImgDataRef.current = null
    canvasStreamRef.current = null
    prevMaskRef.current = null
  }, [])

  const startProcessing = useCallback(() => {
    if (!cameraStream) return null

    const videoTrack = cameraStream.getVideoTracks()[0]
    const { width: W = 1280, height: H = 720 } = videoTrack.getSettings()

    const video = document.createElement('video')
    video.srcObject = cameraStream
    video.playsInline = true
    video.muted = true
    video.width = W
    video.height = H
    video.play().catch(() => {})
    hiddenVideoRef.current = video

    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    canvasRef.current = canvas
    ctxRef.current = canvas.getContext('2d')

    const tempCanvas = new OffscreenCanvas(W, H)
    tempCanvasRef.current = tempCanvas
    tempCtxRef.current = tempCanvas.getContext('2d')

    const maskCanvas = new OffscreenCanvas(W, H)
    maskCanvasRef.current = maskCanvas
    maskCtxRef.current = maskCanvas.getContext('2d')

    const edgeMaskCanvas = new OffscreenCanvas(W, H)
    edgeMaskCanvasRef.current = edgeMaskCanvas
    edgeMaskCtxRef.current = edgeMaskCanvas.getContext('2d')

    maskImgDataRef.current = new ImageData(W, H)

    activeRef.current = true

    const ctx = ctxRef.current
    const tempCtx = tempCtxRef.current
    const maskCtx = maskCtxRef.current
    const edgeMaskCtx = edgeMaskCtxRef.current

    function processFrame() {
      if (!activeRef.current) return

      const vid = hiddenVideoRef.current
      if (!vid || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame)
        return
      }

      const mode = bgModeRef.current
      const beauty = beautyLevelRef.current
      const bf = BEAUTY_FILTERS[beauty]

      if (mode === 'none') {
        if (bf) ctx.filter = bf
        ctx.drawImage(vid, 0, 0, W, H)
        ctx.filter = 'none'
        rafRef.current = requestAnimationFrame(processFrame)
        return
      }

      if (!segmenterRef.current) {
        if (bf) ctx.filter = bf
        ctx.drawImage(vid, 0, 0, W, H)
        ctx.filter = 'none'
        rafRef.current = requestAnimationFrame(processFrame)
        return
      }

      segmenterRef.current.segmentForVideo(vid, performance.now(), (result) => {
        const masks = result.confidenceMasks
        if (!masks?.length) {
          ctx.drawImage(vid, 0, 0, W, H)
          result.close()
          return
        }

        const rawMask = masks[0].getAsFloat32Array()

        if (!prevMaskRef.current || prevMaskRef.current.length !== rawMask.length) {
          prevMaskRef.current = new Float32Array(rawMask)
        }
        const prev = prevMaskRef.current
        for (let i = 0, len = rawMask.length; i < len; i++) {
          prev[i] = MASK_ALPHA * rawMask[i] + (1 - MASK_ALPHA) * prev[i]
        }

        const md = maskImgDataRef.current.data
        for (let i = 0, len = prev.length; i < len; i++) {
          md[(i << 2) + 3] = (prev[i] * 255 + 0.5) | 0
        }
        maskCtx.putImageData(maskImgDataRef.current, 0, 0)

        edgeMaskCtx.clearRect(0, 0, W, H)
        edgeMaskCtx.filter = `blur(${EDGE_BLUR_PX}px)`
        edgeMaskCtx.drawImage(maskCanvasRef.current, 0, 0)
        edgeMaskCtx.filter = 'none'

        if (mode === 'blur') {
          ctx.filter = 'blur(16px)'
          ctx.drawImage(vid, 0, 0, W, H)
          ctx.filter = 'none'
        } else if (mode === 'image') {
          const img = bgImageRef.current
          if (img?.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, W, H)
          } else {
            ctx.filter = 'blur(16px)'
            ctx.drawImage(vid, 0, 0, W, H)
            ctx.filter = 'none'
          }
        }

        tempCtx.clearRect(0, 0, W, H)
        tempCtx.globalCompositeOperation = 'source-over'
        if (bf) tempCtx.filter = bf
        tempCtx.drawImage(vid, 0, 0, W, H)
        tempCtx.filter = 'none'
        tempCtx.globalCompositeOperation = 'destination-in'
        tempCtx.drawImage(edgeMaskCanvasRef.current, 0, 0)
        tempCtx.globalCompositeOperation = 'source-over'

        ctx.drawImage(tempCanvasRef.current, 0, 0)
        result.close()
      })

      if (activeRef.current) rafRef.current = requestAnimationFrame(processFrame)
    }

    rafRef.current = requestAnimationFrame(processFrame)
    const stream = canvas.captureStream(30)
    canvasStreamRef.current = stream
    return stream
  }, [cameraStream])

  const updatePipeline = useCallback(() => {
    const bgActive = bgModeRef.current !== 'none'
    const beautyActive = beautyLevelRef.current > 0

    if (!bgActive && !beautyActive) {
      stopProcessing()
      return null
    }

    if (activeRef.current) return canvasStreamRef.current

    return startProcessing()
  }, [startProcessing, stopProcessing])

  const setBackground = useCallback((mode, imageSrc = null) => {
    bgModeRef.current = mode
    setBgMode(mode)

    if (mode === 'image' && imageSrc) {
      bgImageRef.current = null
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { bgImageRef.current = img }
      img.onerror = () => {
        console.warn('[VB] Image load failed — falling back to blur')
        bgModeRef.current = 'blur'
        setBgMode('blur')
      }
      img.src = imageSrc
    } else if (mode !== 'image') {
      bgImageRef.current = null
    }

    return updatePipeline()
  }, [updatePipeline])

  const setBeautyLevel = useCallback((level) => {
    beautyLevelRef.current = level
    setBeautyLevelState(level)
    return updatePipeline()
  }, [updatePipeline])

  useEffect(() => () => stopProcessing(), [stopProcessing])

  return { bgMode, beautyLevel, isReady, setBackground, setBeautyLevel }
}
