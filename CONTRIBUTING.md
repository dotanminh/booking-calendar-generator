# 🤝 Hướng dẫn Đóng góp (Contributing Guidelines)

Cảm ơn bạn đã quan tâm đến dự án **Booking Calendar Generator**! Để đảm bảo chất lượng và tính nhất quán của mã nguồn, vui lòng tuân thủ các quy tắc sau khi đóng góp:

## Cách đóng góp
1. **Fork** repository này về tài khoản cá nhân của bạn.
2. Tạo một **Branch mới** cho tính năng hoặc bản vá lỗi của bạn (`git checkout -b feature/tinh-nang-moi`).
3. Thực hiện các thay đổi, tối ưu mã nguồn.
4. **Commit** với thông điệp rõ ràng (`git commit -m 'Feat: Thêm tính năng X'`).
5. **Push** lên branch của bạn (`git push origin feature/tinh-nang-moi`).
6. Tạo một **Pull Request (PR)** từ branch của bạn vào branch `main` của repository gốc.

## Quy tắc Code (Coding Standards)
- **Simplicity First (Tối giản trước):** Viết code dễ hiểu, không over-engineering. Không thêm các thư viện bên ngoài nếu có thể dùng code thuần (Vanilla JS/CSS).
- **Anti-AI Writing:** Trong tài liệu và comment, hạn chế tối đa các dấu hiệu do AI viết (như dùng dấu em-dash). Dùng ngôn từ tự nhiên, ưu tiên tiếng Anh cho thuật ngữ kỹ thuật.
- **Glassmorphism Design:** Bất kỳ thành phần UI mới nào đều phải tuân thủ biến số CSS gốc (`--bg-card`, `--border-glass`) để giữ nguyên triết lý thiết kế Dark Glassmorphism.

## Báo cáo lỗi (Issues)
Nếu bạn phát hiện lỗi hoặc muốn đề xuất tính năng mới, vui lòng tạo một **Issue** mới trên tab Issues của GitHub và mô tả chi tiết:
- Môi trường (Trình duyệt, Hệ điều hành).
- Các bước để tái hiện lỗi.
- Đề xuất giải pháp (nếu có).

Rất mong nhận được sự đóng góp từ bạn!
