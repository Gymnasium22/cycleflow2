import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HeartHandshake, Copy, Link2, Lock, Shield } from 'lucide-react'
import {
  loadPartnerShare,
  savePartnerShare,
  clearPartnerShare,
  generatePartnerToken,
  buildPartnerSnapshot,
} from '../utils/partnerShare'
import { getPartnerMiniAppLink } from '../lib/botLinks'

/** Premium partner read-only share with explicit consent */
export function PartnerSharePanel({
  isPremium,
  onNeedPremium,
  snapshotArgs,
  onCopy,
  onToast,
}) {
  const { t } = useTranslation()
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState(() => loadPartnerShare())

  function enable() {
    if (!isPremium) {
      onNeedPremium?.()
      return
    }
    if (!consent) return
    const token = generatePartnerToken()
    const snapshot = buildPartnerSnapshot(snapshotArgs || {})
    const next = {
      enabled: true,
      token,
      consent_at: new Date().toISOString(),
      snapshot,
    }
    savePartnerShare(next)
    setState(next)
    onToast?.(t('partner.enabled'))
  }

  function disable() {
    clearPartnerShare()
    setState(null)
    setConsent(false)
    onToast?.(t('partner.disabled'))
  }

  function refreshSnapshot() {
    if (!state?.token) return
    const snapshot = buildPartnerSnapshot(snapshotArgs || {})
    const next = { ...state, snapshot, updated_at: new Date().toISOString() }
    savePartnerShare(next)
    setState(next)
    onToast?.(t('common.saved'))
  }

  const link = state?.token ? getPartnerMiniAppLink(state.token) : ''

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HeartHandshake size={18} className="text-rose-500" aria-hidden />
          <span className="font-semibold">{t('partner.title')}</span>
        </div>
        {!isPremium && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-800">
            Premium
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--tg-theme-hint-color,#6b7280)] leading-relaxed">{t('partner.hint')}</p>

      {!isPremium ? (
        <button
          type="button"
          onClick={onNeedPremium}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm font-semibold"
        >
          <Lock size={16} />
          {t('partner.unlock')}
        </button>
      ) : !state?.enabled ? (
        <>
          <label className="flex items-start gap-2 p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-4 h-4 accent-[var(--tg-theme-button-color,#e11d48)]"
            />
            <span>
              <Shield size={14} className="inline mr-1 text-blue-500" aria-hidden />
              {t('partner.consent')}
            </span>
          </label>
          <button
            type="button"
            disabled={!consent}
            onClick={enable}
            className="w-full py-3 rounded-xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#fff)] font-semibold disabled:opacity-50"
          >
            {t('partner.enable')}
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-mono break-all p-2 rounded-lg bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] border border-[var(--tg-theme-hint-color,#d1d5db)]/25">
            {link}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCopy?.(link, t('partner.linkCopied'))}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-[var(--tg-theme-hint-color,#d1d5db)]/30 bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)]"
            >
              <Copy size={14} />
              {t('referral.copy')}
            </button>
            <button
              type="button"
              onClick={refreshSnapshot}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border border-[var(--tg-theme-hint-color,#d1d5db)]/30"
            >
              <Link2 size={14} />
              {t('partner.refresh')}
            </button>
          </div>
          <button type="button" onClick={disable} className="w-full text-xs text-red-600 font-medium py-1">
            {t('partner.disable')}
          </button>
        </div>
      )}
    </div>
  )
}
