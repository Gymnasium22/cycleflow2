import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTelegram } from '../context/TelegramContext'
import { usePdfSession } from '../hooks/usePdfSession'
import { clearPdfSession } from '../lib/pdfSession'
import { sharePdfBlob, openPdfBlob, triggerPdfDownload } from '../utils/doctorReport'
import { PdfReadyCard, formatBytes } from './PdfReadyCard'
import { PdfPreviewModal } from './PdfPreviewModal'
import { useToast } from './Toast'

/**
 * Global host: shows PDF ready UI above the tab bar, independent of Settings tab.
 */
export function PdfExportHost() {
  const pdf = usePdfSession()
  const { t } = useTranslation()
  const { webApp, hapticFeedback } = useTelegram()
  const { showToast } = useToast()
  const [sharing, setSharing] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  // Telegram MainButton while PDF is ready
  useEffect(() => {
    if (!pdf?.blob || !webApp?.MainButton) return undefined

    const onClick = () => {
      handleShare()
    }

    try {
      webApp.MainButton.setText(t('settings.pdfShare'))
      webApp.MainButton.show()
      webApp.MainButton.onClick(onClick)
    } catch {
      // ignore
    }

    return () => {
      try {
        webApp.MainButton.hide()
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf?.filename, webApp])

  if (!pdf?.blob) return null

  async function handleShare() {
    setSharing(true)
    hapticFeedback.impact('medium')
    try {
      const result = await sharePdfBlob(pdf.blob, pdf.filename)
      if (result === 'shared') {
        hapticFeedback.notification('success')
        try {
          webApp?.showAlert?.(t('settings.exportPdfShared'))
        } catch {
          showToast(t('settings.exportPdfShared'))
        }
        return
      }
      if (result === 'cancelled') return

      triggerPdfDownload(pdf.blob, pdf.filename)
      try {
        webApp?.showPopup?.({
          title: t('settings.pdfShare'),
          message: t('settings.pdfShareFallback'),
          buttons: [{ type: 'close' }],
        })
      } catch {
        alert(t('settings.pdfShareFallback'))
      }
    } catch (e) {
      console.error(e)
      try {
        webApp?.showAlert?.(t('settings.errors.exportPdfFailed'))
      } catch {
        showToast(t('settings.errors.exportPdfFailed'))
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      {/* Fixed bottom sheet above tab bar — always visible */}
      <div className="fixed left-0 right-0 z-[80] px-4 pointer-events-none"
        style={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pointer-events-auto max-w-md mx-auto shadow-2xl rounded-2xl">
          <div id="pdf-ready-card">
            <PdfReadyCard
              filename={pdf.filename}
              fileSizeLabel={formatBytes(pdf.bytes)}
              onShare={handleShare}
              onView={() => {
                hapticFeedback.impact('light')
                setViewOpen(true)
              }}
              onDismiss={() => {
                clearPdfSession()
                setViewOpen(false)
              }}
              sharing={sharing}
            />
          </div>
        </div>
      </div>

      <PdfPreviewModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        blobUrl={pdf.url}
        filename={pdf.filename}
        onShare={handleShare}
        onOpen={() => openPdfBlob(pdf.blob)}
        sharing={sharing}
      />
    </>
  )
}
