import { type HTMLAttributes, forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glow?: 'green' | 'gold' | 'none'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover = true, glow = 'none', className = '', children, ...props }, ref) => {
    const glowClass = glow === 'green' ? 'glow-green-sm' : glow === 'gold' ? 'glow-gold' : ''
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`glass rounded-3xl p-4 ${hover ? 'glass-hover cursor-pointer transition-all duration-300' : ''} ${glowClass} ${className}`}
        {...(props as HTMLMotionProps<'div'>)}
      >
        {children}
      </motion.div>
    )
  }
)
Card.displayName = 'Card'
