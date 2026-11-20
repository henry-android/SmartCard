import { Link } from 'react-router-dom'

export default function Page404() {
  return (
    <section className="container page empty">
      <h1>404</h1>
      <p>Không tìm thấy trang bạn yêu cầu.</p>
      <Link className="btn primary" to="/">Về trang chủ</Link>
    </section>
  )
}
