import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-full p-6 bg-[var(--tg-theme-bg-color,#ffffff)] text-[var(--tg-theme-text-color,#111827)]">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Что-то пошло не так</h2>
          <p className="text-sm text-[var(--tg-theme-hint-color,#6b7280)] text-center mb-4">
            Попробуй перезагрузить приложение. Если ошибка повторяется, проверь настройки Supabase.
          </p>
          <details className="w-full max-w-sm p-3 rounded-xl bg-[var(--tg-theme-secondary-bg-color,#f3f4f6)] text-xs">
            <summary className="cursor-pointer font-medium">Технические детали</summary>
            <pre className="mt-2 whitespace-pre-wrap break-all text-[var(--tg-theme-hint-color,#6b7280)]">
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 rounded-2xl bg-[var(--tg-theme-button-color,#e11d48)] text-[var(--tg-theme-button-text-color,#ffffff)] font-semibold"
          >
            Перезагрузить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
