import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Could log to error reporting service
    void error
    void info
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-bg text-text">
          <div className="max-w-md text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-bold">Terjadi Kesalahan</h1>
            <p className="text-text-muted text-sm">
              Aplikasi mengalami error yang tidak terduga.
            </p>
            {this.state.error && (
              <p className="text-danger text-xs font-mono">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-light transition"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
