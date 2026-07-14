import { useEffect, useState } from 'react'
import { getPdfSession, subscribePdfSession } from '../lib/pdfSession'

export function usePdfSession() {
  const [session, setSession] = useState(() => getPdfSession())

  useEffect(() => {
    return subscribePdfSession(setSession)
  }, [])

  return session
}
