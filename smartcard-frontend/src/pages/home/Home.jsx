import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, Layers, RotateCw, Sparkles, TrendingUp } from 'lucide-react'
import Tilt3DCard from '../../components/ui/Tilt3DCard'
import { staggerContainer, staggerItem } from '../../components/ui/PageTransition'

const demoCards = [
  {
    subject: 'Tiếng Anh',
    term: 'Spaced Repetition',
    definition: 'Phương pháp lặp lại ngắt quãng giúp não bộ ghi nhớ kiến thức dài hạn.',
  },
  {
    subject: 'Công nghệ',
    term: 'Active Recall',
    definition: 'Chủ động gợi nhớ thông tin thay vì chỉ đọc lại thụ động.',
  },
  {
    subject: 'Khoa học',
    term: 'Neuroplasticity',
    definition: 'Khả năng não bộ tự tái cấu trúc và hình thành kết nối mới khi học tập.',
  },
]

export default function Home() {
  const [sampleIndex, setSampleIndex] = useState(0)
  const [sampleFlipped, setSampleFlipped] = useState(false)
  const sample = demoCards[sampleIndex]

  const nextSample = (event) => {
    event.stopPropagation()
    setSampleFlipped(false)
    setSampleIndex((prev) => (prev + 1) % demoCards.length)
  }

  return (
    <>
      <section className="hero">
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />
        <div className="container hero-grid">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">
              <Sparkles size={13} />
              <span>SMARTCARD LEARNING 3D</span>
            </p>
            <h1>Học tập hiệu quả với Flashcard 3D</h1>
            <p>
              Tạo, quản lý và tương tác với các bộ thẻ flashcard sống động cùng bài kiểm tra thông minh.
            </p>
            <div className="hero-actions">
              <Link className="btn light" to="/decks">
                <span>Bắt đầu học</span>
                <ArrowRight size={16} />
              </Link>
              <Link className="btn outline" to="/decks?create=1">Tạo bộ thẻ mới</Link>
              <Link className="btn warning" to="/exams">Làm bài kiểm tra</Link>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="hero-float-wrapper"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="hero-card-shadow-layer layer-2" aria-hidden="true" />
              <div className="hero-card-shadow-layer layer-1" aria-hidden="true" />
              <Tilt3DCard className="hero-demo-tilt" maxTilt={9}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`hero-demo-card ${sampleFlipped ? 'is-flipped' : ''}`}
                  onClick={() => setSampleFlipped((prev) => !prev)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSampleFlipped((prev) => !prev)
                    }
                  }}
                >
                  <div className="hero-demo-face hero-demo-front">
                    <div className="hero-demo-top">
                      <span className="hero-demo-pill">{sample.subject}</span>
                      <span className="hero-demo-flip-hint"><RotateCw size={13} /> Chạm để lật</span>
                    </div>
                    <h3>{sample.term}</h3>
                    <div className="hero-demo-bottom">
                      <span>Thẻ mẫu {sampleIndex + 1}/{demoCards.length}</span>
                      <button type="button" className="hero-demo-next" onClick={nextSample}>
                        Thẻ khác ›
                      </button>
                    </div>
                  </div>
                  <div className="hero-demo-face hero-demo-back">
                    <div className="hero-demo-top">
                      <span className="hero-demo-pill is-back">Định nghĩa</span>
                      <span className="hero-demo-flip-hint"><RotateCw size={13} /> Lật lại</span>
                    </div>
                    <p>{sample.definition}</p>
                    <div className="hero-demo-bottom">
                      <span>Thẻ mẫu {sampleIndex + 1}/{demoCards.length}</span>
                      <button type="button" className="hero-demo-next" onClick={nextSample}>
                        Thẻ khác ›
                      </button>
                    </div>
                  </div>
                </div>
              </Tilt3DCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="container features">
        <div className="section-heading">
          <p className="eyebrow dark">TÍNH NĂNG</p>
          <h2>Tất cả bạn cần để ghi nhớ tốt hơn</h2>
        </div>
        <motion.div
          className="feature-grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <Tilt3DCard className="feature-card" variants={staggerItem}>
            <span className="feature-icon"><Layers size={22} /></span>
            <h3>Quản lý bộ thẻ</h3>
            <p>Tạo và tổ chức bộ thẻ theo chủ đề, môn học và mục tiêu học tập rõ ràng.</p>
          </Tilt3DCard>
          <Tilt3DCard className="feature-card" variants={staggerItem}>
            <span className="feature-icon"><BrainCircuit size={22} /></span>
            <h3>Lật thẻ 3D trực quan</h3>
            <p>Học tập trung từng thẻ với thao tác kéo/vuốt và phím tắt nhanh nhạy.</p>
          </Tilt3DCard>
          <Tilt3DCard className="feature-card" variants={staggerItem}>
            <span className="feature-icon"><TrendingUp size={22} /></span>
            <h3>Kiểm tra & theo dõi tiến độ</h3>
            <p>Làm đề thi trắc nghiệm, xem lịch sử và tập trung vào phần kiến thức còn yếu.</p>
          </Tilt3DCard>
        </motion.div>
      </section>
    </>
  )
}
