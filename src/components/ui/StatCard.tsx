import { Card } from './Card'
import { motion } from 'framer-motion'

interface StatCardProps {
  label: string
  value: number | string
  color: 'green' | 'gold' | 'red' | 'white'
  icon?: React.ReactNode
  delay?: number
}

const colorMap = {
  green: 'text-success',
  gold: 'text-secondary',
  red: 'text-danger',
  white: 'text-white',
}

export function StatCard({ label, value, color, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card hover={false} className="text-center">
        {icon && <div className="mb-1 text-lg opacity-60">{icon}</div>}
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: delay + 0.1 }}
          className={`text-3xl font-heading font-bold ${colorMap[color]}`}
        >
          {value}
        </motion.div>
        <p className="text-xs text-text-secondary mt-1 font-medium">{label}</p>
      </Card>
    </motion.div>
  )
}
