import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Wraps a card with smooth 3D mouse-move tilt and subtle glare lighting.
 */
export default function Tilt3DCard({
  children,
  className = '',
  maxTilt = 7,
  as = 'article',
  ...motionProps
}) {
  const ref = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })
  const Component = motion[as] || motion.div

  const handleMouseMove = (event) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    setTilt({
      rx: (0.5 - y) * maxTilt * 2,
      ry: (x - 0.5) * maxTilt * 2,
      gx: Math.round(x * 100),
      gy: Math.round(y * 100),
      active: true,
    })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })
  }

  return (
    <div className="tilt-3d-wrapper">
      <Component
        ref={ref}
        className={`tilt-3d-card ${tilt.active ? 'is-tilting' : ''} ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: tilt.rx,
          rotateY: tilt.ry,
          scale: tilt.active ? 1.018 : 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 22,
          mass: 0.6,
        }}
        style={{
          '--glare-x': `${tilt.gx}%`,
          '--glare-y': `${tilt.gy}%`,
          transformStyle: 'preserve-3d',
        }}
        {...motionProps}
      >
        {children}
      </Component>
    </div>
  )
}
