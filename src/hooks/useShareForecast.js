import { useState, useCallback } from 'react'
import { drawForecastCard, canvasToBlob } from '../utils/forecastCanvas'

export function useShareForecast({ title, text, filename = 'cicle-forecast.png' } = {}) {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState(null)

  const share = useCallback(
    async (data) => {
      if (!data) {
        setError('No data')
        return false
      }

      setIsSharing(true)
      setError(null)

      try {
        const canvas = document.createElement('canvas')
        drawForecastCard(canvas, data)
        const blob = await canvasToBlob(canvas)
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
