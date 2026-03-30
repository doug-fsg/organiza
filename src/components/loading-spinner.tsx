import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function LoadingSpinner({ className, size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'app-spinner-sm',
    md: 'app-spinner-md',
    lg: 'app-spinner-lg'
  }

  return (
    <div className={cn('page-loading', className)}>
      <div className={sizeClasses[size]} />
      {text && <p className="state-message">{text}</p>}
    </div>
  )
}