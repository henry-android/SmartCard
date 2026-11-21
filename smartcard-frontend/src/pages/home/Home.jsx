import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <p className="eyebrow">SMARTCARD LEARNING</p>
          <h1>Học tập hiệu quả với Flashcard</h1>
          <p>Tạo, quản lý và học tập với các bộ thẻ flashcard của riêng bạn.</p>
          <div className="hero-actions">
            <Link className="btn light" to="/decks">Bắt đầu học</Link>
            <Link className="btn outline" to="/decks">Tạo bộ thẻ mới</Link>
            <Link className="btn warning" to="/exams">Làm bài kiểm tra</Link>
          </div>
        </div>
      </section>
      <section className="container features">
        <div className="section-heading">
          <p className="eyebrow dark">TÍNH NĂNG</p>
          <h2>Tất cả bạn cần để ghi nhớ tốt hơn</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-icon">▦</span>
            <h3>Quản lý bộ thẻ</h3>
            <p>Tạo và tổ chức bộ thẻ theo chủ đề, môn học và mục tiêu.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">◎</span>
            <h3>Học tập thông minh</h3>
            <p>Ôn tập theo lịch trình để ghi nhớ kiến thức lâu hơn.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">↗</span>
            <h3>Theo dõi tiến độ</h3>
            <p>Hiểu rõ kết quả học tập và tập trung vào phần còn yếu.</p>
          </article>
        </div>
      </section>
    </>
  )
}
