# SmartCard

## Import đề thi bằng AI

Khi import PDF, DOC hoặc DOCX, ứng dụng tạo bản xem trước để người tạo có thể sửa, xóa hoặc thêm câu hỏi và đáp án trước khi lưu. Nội dung chỉ được lưu vào đề sau khi chọn **Xác nhận và lưu**. Tài liệu được gửi tới OpenRouter để phân tích; không tải lên tài liệu nhạy cảm hoặc chứa thông tin riêng tư.

PDF có văn bản được trích xuất trực tiếp. Với PDF scan, cài Tesseract OCR và dữ liệu ngôn ngữ tiếng Việt/tiếng Anh; cấu hình tùy chọn bằng biến môi trường:

- `TESSERACT_CMD`: đường dẫn tới chương trình Tesseract; mặc định là `tesseract`.
- `TESSERACT_LANGUAGE`: ngôn ngữ OCR; mặc định là `vie+eng`.

OCR giới hạn tối đa 10 trang và 60 giây cho mỗi tài liệu. Tài liệu văn bản dài được chia thành các đoạn để phân tích; giới hạn đầu vào là 120.000 ký tự.

## Quyền riêng tư đề thi

Người tạo đề có thể đổi chế độ công khai/riêng tư từ thẻ đề thi. Đề riêng tư chỉ hiển thị và làm được bởi người tạo; các thay đổi quyền riêng tư chỉ được phép bởi chủ sở hữu.

Người tạo cũng có thể xóa đề của mình. Xóa đề sẽ xóa câu hỏi, đáp án và toàn bộ lịch sử làm bài liên quan; thao tác này không thể hoàn tác.