/* ═══════════════════════════════════════════════
   Booking Calendar - Application Logic
   ═══════════════════════════════════════════════ */

// ── Configuration ──
const CONFIG = {
  // Google Apps Script Web App URL (paste sau khi deploy)
  BACKEND_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',

  // Thông tin chủ sở hữu
  OWNER_NAME: 'Minh Đỗ',

  // Khung giờ làm việc (0=CN, 1=T2, ..., 6=T7)
  WORKING_DAYS: [1, 2, 3, 4, 5, 6],
  START_HOUR: 9,
  END_HOUR: 16,

  // Bước nhảy slot (phút)
  SLOT_INTERVAL: 60,

  // Durations khả dụng (phút)
  DURATIONS: [
    { value: 30, label: '30 phút' },
    { value: 60, label: '1 giờ (60 phút)' },
    { value: 90, label: '1 giờ 30 phút' },
  ],
};

// ── State ──
const state = {
  selectedDate: null,
  selectedSlot: null,
  duration: 60,
  meetingType: 'online',
  blockedSlots: [],
  isSubmitting: false,
};

// ── DOM References ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initDatePicker();
  initDurationSelect();
  initRadioGroup();
  initForm();
});

// ── Date Picker ──
function initDatePicker() {
  const input = $('#date-picker');
  const today = new Date();
  const minDate = formatDateISO(today);
  const maxDate = formatDateISO(new Date(today.getFullYear(), today.getMonth() + 2, 0));

  input.min = minDate;
  input.max = maxDate;
  input.value = minDate;

  state.selectedDate = minDate;
  generateSlots();

  input.addEventListener('change', (e) => {
    state.selectedDate = e.target.value;
    state.selectedSlot = null;
    generateSlots();
  });
}

// ── Duration Select ──
function initDurationSelect() {
  const select = $('#duration-select');
  select.innerHTML = '';
  CONFIG.DURATIONS.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d.value;
    opt.textContent = d.label;
    if (d.value === 60) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    state.duration = parseInt(e.target.value, 10);
    state.selectedSlot = null;
    generateSlots();
  });
}

// ── Generate Time Slots ──
function generateSlots() {
  const container = $('#slots-container');
  container.innerHTML = '';

  if (!state.selectedDate) {
    container.innerHTML = '<div class="slots-empty">Vui lòng chọn ngày</div>';
    return;
  }

  const date = new Date(state.selectedDate + 'T00:00:00');
  const dayOfWeek = date.getDay();

  if (!CONFIG.WORKING_DAYS.includes(dayOfWeek)) {
    container.innerHTML = '<div class="slots-empty">Ngày này không có lịch trống</div>';
    return;
  }

  const slots = [];
  const now = new Date();
  const isToday = state.selectedDate === formatDateISO(now);

  for (let h = CONFIG.START_HOUR; h < CONFIG.END_HOUR; h++) {
    // Nghỉ trưa từ 11h đến 13h
    if (h === 11 || h === 12) continue;

    for (let m = 0; m < 60; m += CONFIG.SLOT_INTERVAL) {
      const endMinutes = h * 60 + m + state.duration;
      if (endMinutes > CONFIG.END_HOUR * 60) break;

      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // Skip past times if today
      if (isToday) {
        const slotTime = new Date(date);
        slotTime.setHours(h, m, 0, 0);
        if (slotTime <= now) continue;
      }

      const isBlocked = state.blockedSlots.includes(timeStr);
      slots.push({ time: timeStr, blocked: isBlocked });
    }
  }

  if (slots.length === 0) {
    container.innerHTML = '<div class="slots-empty">Không còn khung giờ trống</div>';
    return;
  }

  slots.forEach((slot) => {
    const btn = document.createElement('button');
    btn.className = 'slot-btn';
    btn.textContent = slot.time;
    btn.disabled = slot.blocked;
    btn.type = 'button';

    if (!slot.blocked) {
      btn.addEventListener('click', () => selectSlot(btn, slot.time));
    }

    container.appendChild(btn);
  });

  // Fetch real availability if backend configured
  if (CONFIG.BACKEND_URL) {
    fetchAvailableSlots();
  }
}

function selectSlot(btn, time) {
  $$('.slot-btn.selected').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedSlot = time;
}

// ── Fetch Available Slots from Backend ──
async function fetchAvailableSlots() {
  try {
    const url = `${CONFIG.BACKEND_URL}?action=getSlots&date=${state.selectedDate}&duration=${state.duration}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.blockedSlots) {
      state.blockedSlots = data.blockedSlots;
      generateSlotsUI();
    }
  } catch (err) {
    console.warn('Could not fetch slots from backend:', err);
  }
}

function generateSlotsUI() {
  $$('.slot-btn').forEach((btn) => {
    if (state.blockedSlots.includes(btn.textContent)) {
      btn.disabled = true;
      btn.classList.remove('selected');
      if (state.selectedSlot === btn.textContent) {
        state.selectedSlot = null;
      }
    }
  });
}

// ── Radio Group ──
function initRadioGroup() {
  $$('.radio-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      $$('.radio-option').forEach((o) => o.classList.remove('active'));
      opt.classList.add('active');
      opt.querySelector('input[type="radio"]').checked = true;
      state.meetingType = opt.querySelector('input[type="radio"]').value;
    });
  });

  // Set default
  const defaultRadio = $('.radio-option[data-value="online"]');
  if (defaultRadio) defaultRadio.click();
}

// ── Form Submit ──
function initForm() {
  const form = $('#booking-form');
  form.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();
  if (state.isSubmitting) return;

  // Validate
  const name = $('#input-name').value.trim();
  const email = $('#input-email').value.trim();
  const notes = $('#input-notes').value.trim();

  // Clear errors
  $$('.form-input.error').forEach((el) => el.classList.remove('error'));

  let hasError = false;

  if (!name) {
    $('#input-name').classList.add('error');
    hasError = true;
  }
  if (!email || !isValidEmail(email)) {
    $('#input-email').classList.add('error');
    hasError = true;
  }
  if (!state.selectedDate) {
    showToast('Vui lòng chọn ngày hẹn', 'error');
    return;
  }
  if (!state.selectedSlot) {
    showToast('Vui lòng chọn khung giờ', 'error');
    return;
  }
  if (hasError) {
    showToast('Vui lòng điền đầy đủ thông tin', 'error');
    return;
  }

  const bookingData = {
    name,
    email,
    date: state.selectedDate,
    time: state.selectedSlot,
    duration: state.duration,
    meetingType: state.meetingType,
    notes,
  };

  // If no backend, show demo success
  if (!CONFIG.BACKEND_URL) {
    showDemoSuccess(bookingData);
    return;
  }

  // Submit to backend
  const btn = $('.submit-btn');
  btn.classList.add('loading');
  btn.disabled = true;
  state.isSubmitting = true;

  try {
    const res = await fetch(CONFIG.BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'createBooking', ...bookingData }),
    });
    const data = await res.json();

    if (data.success) {
      showToast('Đặt lịch thành công! Bạn sẽ nhận được email xác nhận.', 'success');
      resetForm();
    } else {
      showToast(data.error || 'Có lỗi xảy ra, vui lòng thử lại', 'error');
    }
  } catch (err) {
    showToast('Không thể kết nối server. Vui lòng thử lại sau.', 'error');
    console.error('Booking error:', err);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    state.isSubmitting = false;
  }
}

function showDemoSuccess(data) {
  const dateFormatted = new Date(data.date).toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric',
  });
  showToast(
    `Demo: ${data.name} - ${dateFormatted}, ${data.time} (${data.duration} phut)`,
    'success'
  );
}

// ── Toast ──
function showToast(message, type = 'success') {
  const existing = $('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  const icon = type === 'success'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

  toast.innerHTML = icon + `<span>${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

// ── Reset Form ──
function resetForm() {
  $('#input-name').value = '';
  $('#input-email').value = '';
  $('#input-notes').value = '';
  state.selectedSlot = null;
  $$('.slot-btn.selected').forEach((b) => b.classList.remove('selected'));
}

// ── Utility ──
function formatDateISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
