/**
 * Cổng Đặt Lịch Hẹn - Google Apps Script Backend
 * 
 * SETUP:
 * 1. Mở script.google.com -> New Project
 * 2. Paste toàn bộ code này vào Code.gs
 * 3. Sửa CONFIG bên dưới cho đúng thông tin của bạn
 * 4. Deploy -> New deployment -> Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL -> paste vào CONFIG.BACKEND_URL trong app.js
 */

// ── CONFIG ──
const CALENDAR_ID = 'primary'; // hoặc ID calendar riêng
const SHEET_NAME = 'Booking Log';  // Tên sheet log
const OWNER_NAME = 'Minh Đỗ';
const DEFAULT_LOCATION_OFFLINE = 'Liên hệ để xác nhận địa điểm';

// ── Xử lý GET request (lấy khung giờ trống) ──
function doGet(e) {
  const params = e.parameter;
  
  if (params.action === 'getSlots') {
    const result = getAvailableSlots(params.date, parseInt(params.duration) || 60);
    return jsonResponse(result);
  }
  
  return jsonResponse({ error: 'Invalid action' });
}

// ── Xử lý POST request (tạo booking) ──
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'createBooking') {
      const result = createBookingEvent(data);
      return jsonResponse(result);
    }
    
    return jsonResponse({ error: 'Invalid action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── Lấy khung giờ đã bị block ──
function getAvailableSlots(dateStr, duration) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  const date = new Date(dateStr + 'T00:00:00');
  const endOfDay = new Date(dateStr + 'T23:59:59');
  
  const events = calendar.getEvents(date, endOfDay);
  const blocked = [];
  
  events.forEach(function(event) {
    const start = event.getStartTime();
    const end = event.getEndTime();
    
    // Block tất cả slot bị overlap
    for (var h = 9; h < 16; h++) {
      if (h === 11 || h === 12) continue;
      
      for (var m = 0; m < 60; m += 60) {
        var slotStart = new Date(date);
        slotStart.setHours(h, m, 0, 0);
        var slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        // Check overlap
        if (slotStart < end && slotEnd > start) {
          var timeStr = padZero(h) + ':' + padZero(m);
          if (blocked.indexOf(timeStr) === -1) {
            blocked.push(timeStr);
          }
        }
      }
    }
  });
  
  return { success: true, blockedSlots: blocked };
}

// ── Tạo Calendar Event + Gửi Invitation ──
function createBookingEvent(data) {
  const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
  
  // Parse date + time
  const startTime = new Date(data.date + 'T' + data.time + ':00');
  const endTime = new Date(startTime.getTime() + data.duration * 60000);
  
  // Check double booking
  const existing = calendar.getEvents(startTime, endTime);
  if (existing.length > 0) {
    return { success: false, error: 'Khung giờ này đã có người đặt. Vui lòng chọn giờ khác.' };
  }
  
  // Build event description
  var description = 'Cuộc hẹn đặt qua Cổng Đặt Lịch Hẹn\n\n';
  description += 'Tên: ' + data.name + '\n';
  description += 'Email: ' + data.email + '\n';
  description += 'Hình thức: ' + (data.meetingType === 'online' ? 'Họp trực tuyến (Google Meet)' : 'Offline') + '\n';
  if (data.notes) {
    description += '\nLời nhắn: ' + data.notes + '\n';
  }
  
  // Location
  var location = DEFAULT_LOCATION_OFFLINE;
  if (data.meetingType === 'online') {
    location = 'Google Meet';
  }
  
  // Create event
  var title = 'Cuộc hẹn với ' + data.name;
  var event = calendar.createEvent(title, startTime, endTime, {
    description: description,
    location: location,
    guests: data.email,
    sendInvites: true,
  });
  
  // Log booking
  logBooking(data, event.getId());
  
  return { 
    success: true, 
    message: 'Đặt lịch thành công!',
    eventId: event.getId(),
  };
}

// ── Log vào Google Sheet ──
function logBooking(data, eventId) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // Tạo spreadsheet mới nếu chưa có
      ss = SpreadsheetApp.create('Booking Calendar Log');
    }
    
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      // Header row
      sheet.appendRow([
        'Timestamp', 'Tên', 'Email', 'Ngày hẹn', 'Giờ', 
        'Thời lượng (phút)', 'Hình thức', 'Meet Link', 'Lời nhắn', 'Event ID'
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }
    
    sheet.appendRow([
      new Date(),
      data.name,
      data.email,
      data.date,
      data.time,
      data.duration,
      data.meetingType,
      data.notes || '',
      eventId,
    ]);
  } catch (err) {
    // Log error but don't fail the booking
    console.error('Sheet logging failed:', err);
  }
}

// ── Helpers ──
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function padZero(n) {
  return n < 10 ? '0' + n : '' + n;
}
