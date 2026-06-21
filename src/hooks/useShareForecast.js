import { useState, useCallback } from 'react'

function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)[1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export function useShareForecast({ title, text, filename = 'cicle-forecast.png' } = {}) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState(null)

  const share = useCallback(
    async (cardElement) => {
      if (!cardElement) {
        setError('No card element')
        return false
      }

      setIsSharing(true)
      setError(null)

      try {
        const { toPng } = await import('html-to-image')
        const dataUrl = await toPng(cardElement, {
          width: 1080,
          height: 1080,
          pixelRatio: 1,
          cacheBust: true,
        })

        const blob = dataUrlToBlob(dataUrl)
        const file = new File([blob], filename, { type: 'image/png' })

        const shareData = {
          files: [file],
          title: title || 'Cicle Forecast',
          text: text || 'My cycle forecast',
        }

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share(shareData)
          setIsSharing(false)
          return true
        }

        // Fallback: download
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        setIsSharing(false)
        return 'downloaded'
      } catch (err) {
        console.error('Share forecast error:', err)
        setError(err?.message || 'Failed to share')
        setIsSharing(false)
        return false
      }
    },
    [title, text, filename]
  )

  return { share, isSharing, error }
}
