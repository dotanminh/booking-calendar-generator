---
name: booking-calendar-generator
description: Tự động xây dựng hệ thống Cổng Đặt Lịch Hẹn (Booking Calendar) với giao diện Dark Glassmorphism, tích hợp backend Google Apps Script.
version: 1.0.0
status: active
zone: B
keywords: [booking, calendar, đặt lịch, glassmorphism, vercel, apps script]
created: 2026-05-08
---

# Skill: Booking Calendar Generator

## When to Use (Khi nào dùng)
Kích hoạt skill này khi user yêu cầu "tạo trang đặt lịch", "làm web booking", "hệ thống đặt lịch hẹn", hoặc muốn sao chép một Cổng Đặt Lịch Hẹn cá nhân với phong cách cao cấp.

## Procedure (Quy trình thực hiện)

### 1. Khởi tạo Frontend (Vercel Ready)
- Tạo folder dự án (ví dụ: `booking-calendar`).
- **Giao diện (index.html)**: 
  - Bố cục 2 cột cho Desktop, 1 cột cho Mobile.
  - Bao gồm: Chọn ngày, Thời lượng (mặc định 60 phút), Form thông tin (Tên, Email, Hình thức Online/Offline, Lời nhắn).
  - TUYỆT ĐỐI KHÔNG thêm trường "Link Google Meet" do Google Calendar đã tự động sinh link.
- **CSS (style.css)**: 
  - Áp dụng phong cách **Dark Glassmorphism** (màu nền tối `#0a0e1a`, card trong suốt với backdrop-filter).
  - Sử dụng gradient accent color, bo góc lớn, bóng mờ (shadow).
  - Tích hợp Author Brand "Minh Đỗ" ở góc trên cùng.
- **Logic (app.js)**: 
  - Render các khung giờ trống tự động (Interval: 60 phút).
  - Tự động ẩn khung giờ đã qua trong ngày.
  - Xử lý loại trừ giờ nghỉ trưa (VD: bỏ qua 11h và 12h).
  - Xử lý API gọi đến Google Apps Script bằng `fetch(CONFIG.BACKEND_URL, { method: 'POST', body: JSON.stringify(...) })`.

### 2. Khởi tạo Backend (Google Apps Script)
- Tạo folder `apps-script` và cấu hình qua `clasp`.
- **appsscript.json**:
  - `timeZone` bắt buộc là `Asia/Ho_Chi_Minh`.
  - `webapp.access` bắt buộc là `ANYONE_ANONYMOUS` (quan trọng để tránh lỗi 401/403).
  - `webapp.executeAs` là `USER_DEPLOYING`.
- **Code.gs**:
  - Viết hàm `doPost(e)` để nhận dữ liệu từ Frontend.
  - Lấy sự kiện hiện có bằng `CalendarApp.getEvents()` để block các slot bị trùng.
  - Tạo sự kiện mới: `CalendarApp.createEvent(title, start, end, { guests: email, sendInvites: true })`.
  - Ghi log ra Google Sheets bằng `SpreadsheetApp`.

### 3. Deployment & Integration
1. Đẩy backend: `npx @google/clasp push` -> `npx @google/clasp deploy`.
2. Lấy URL Web App dán vào `CONFIG.BACKEND_URL` trong `app.js`.
3. Đẩy frontend: `npx vercel --prod --yes`.
4. **BƯỚC BẮT BUỘC**: Hướng dẫn user mở trang Script Editor, chọn hàm `doGet` và bấm Run thủ công 1 lần để cấp quyền (Authorize) truy cập Calendar/Sheets. Nếu không có bước này, script sẽ bị lỗi 403 Forbidden.

## Pitfalls (Lỗi thường gặp)
- **Lỗi 403 Forbidden / 401 Unauthorized**: Xảy ra khi `appsscript.json` đặt quyền sai (`ANYONE` thay vì `ANYONE_ANONYMOUS`) hoặc chủ script chưa chạy tay 1 lần để Authorization.
- **Lỗi Fetch bị đổi thành GET**: Trình duyệt sẽ tự động follow lệnh redirect 302 của Apps Script, đổi phương thức từ POST sang GET và làm rỗng tham số. Đừng lo, hàm `doPost` đã được thực thi thành công ở server của Google TRƯỚC KHI lệnh 302 xảy ra. Form vẫn hoạt động bình thường, nhưng nếu dùng `.json()` để đọc kết quả từ URL redirect thì sẽ bị lỗi CORS hoặc lỗi của `doGet`. Để an toàn, trả về `{ "success": true }` từ `doPost` bằng `ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON)`.
- **Lỗi CSS Grid bị bóp méo chữ**: Nếu dùng `<div class="slots-empty">` bên trong một CSS Grid container, phải chắc chắn có thuộc tính `grid-column: 1 / -1;` để div đó trải dài toàn bộ lưới, tránh việc chữ bị ép dọc.

## Verification (Kiểm tra)
- User có thể chọn ngày hôm sau và thấy các slot 60 phút.
- Không có slot nào hiện ra trong giờ nghỉ trưa.
- Bấm gửi sẽ hiển thị Toast báo thành công.
- Kiểm tra trực tiếp trên Google Calendar của chủ phòng xem sự kiện đã xuất hiện và có link Google Meet đính kèm chưa.
