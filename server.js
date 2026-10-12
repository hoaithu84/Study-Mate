require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:studymate@example.com';
const PUSH_ENABLED = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORE_PATH)) fs.writeFileSync(STORE_PATH, JSON.stringify({ devices: {}, feedback: [] }, null, 2));
if (PUSH_ENABLED) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
// Do not expose server code, environment files, dependency manifests, or stored user data.
app.use((req, res, next) => {
  let decoded = req.path;
  try { decoded = decodeURIComponent(req.path); } catch (_) {}
  if (/^\/(?:server\.js|setup-vapid\.js|package(?:-lock)?\.json|\.env(?:\.|$)|\.gitignore|data(?:\/|$)|node_modules(?:\/|$))/i.test(decoded)) return res.sendStatus(404);
  next();
});
app.use(express.static(ROOT, { index: 'index.html', dotfiles: 'deny' }));

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch (e) { console.error('Không đọc được kho dữ liệu:', e.message); return { devices: {}, feedback: [] }; }
}
function writeStore(store) {
  const tmp = STORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, STORE_PATH);
}
function validClientId(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value); }
function getDevice(store, clientId) {
  if (!store.devices[clientId]) store.devices[clientId] = { tasks: [], subscription: null, sent: [] };
  return store.devices[clientId];
}
function cleanTask(task) {
  if (!task || (typeof task.id !== 'string' && typeof task.id !== 'number')) return null;
  const deadlineEpoch = Number(task.deadlineEpoch);
  const reminderMinutes = Number(task.reminderMinutes);
  if (!Number.isFinite(deadlineEpoch) || !Number.isFinite(reminderMinutes) || reminderMinutes < 1 || reminderMinutes > 10080) return null;
  return {
    id: String(task.id).slice(0, 100),
    name: String(task.name || 'Bài tập').slice(0, 240),
    subject: String(task.subject || 'Khác').slice(0, 100),
    deadlineEpoch,
    deadlineLabel: String(task.deadlineLabel || '').slice(0, 100),
    reminderMinutes: Math.round(reminderMinutes),
    done: Boolean(task.done)
  };
}

const FEEDBACK_TYPES = new Set(['idea', 'bug', 'good']);
app.get('/api/feedback', (_req, res) => {
  const store = readStore();
  const items = (Array.isArray(store.feedback) ? store.feedback : []).slice(-20).reverse();
  res.json({ ok: true, items });
});
app.post('/api/feedback', (req, res) => {
  const { type, message } = req.body || {};
  if (!FEEDBACK_TYPES.has(type)) return res.status(400).json({ error: 'Loại góp ý không hợp lệ.' });
  if (typeof message !== 'string' || message.trim().length < 3 || message.trim().length > 1000) return res.status(400).json({ error: 'Góp ý cần dài từ 3 đến 1000 ký tự.' });
  const store = readStore();
  store.feedback = Array.isArray(store.feedback) ? store.feedback : [];
  store.feedback.push({ type, message: message.trim(), createdAt: new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) });
  store.feedback = store.feedback.slice(-200);
  writeStore(store);
  res.status(201).json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'StudyMate', pushEnabled: PUSH_ENABLED }));
app.get('/api/config', (_req, res) => res.json({ pushEnabled: PUSH_ENABLED, vapidPublicKey: PUSH_ENABLED ? VAPID_PUBLIC_KEY : null }));

app.post('/api/tasks/sync', (req, res) => {
  const { clientId, tasks } = req.body || {};
  if (!validClientId(clientId)) return res.status(400).json({ error: 'clientId không hợp lệ.' });
  if (!Array.isArray(tasks) || tasks.length > 500) return res.status(400).json({ error: 'Danh sách nhiệm vụ không hợp lệ.' });
  const cleaned = tasks.map(cleanTask).filter(Boolean);
  const store = readStore();
  const device = getDevice(store, clientId);
  device.tasks = cleaned;
  const validKeys = new Set(cleaned.map(t => `${t.id}:${t.deadlineEpoch}:${t.reminderMinutes}`));
  device.sent = (device.sent || []).filter(key => validKeys.has(key)).slice(-1000);
  writeStore(store);
  res.json({ ok: true, synced: cleaned.length });
});

app.post('/api/push/subscribe', (req, res) => {
  if (!PUSH_ENABLED) return res.status(503).json({ error: 'Máy chủ chưa cấu hình VAPID; hãy chạy npm run setup.' });
  const { clientId, subscription } = req.body || {};
  if (!validClientId(clientId)) return res.status(400).json({ error: 'clientId không hợp lệ.' });
  if (!subscription || typeof subscription.endpoint !== 'string' || !subscription.keys) return res.status(400).json({ error: 'Đăng ký push không hợp lệ.' });
  const store = readStore();
  const device = getDevice(store, clientId);
  device.subscription = subscription;
  writeStore(store);
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { clientId } = req.body || {};
  if (!validClientId(clientId)) return res.status(400).json({ error: 'clientId không hợp lệ.' });
  const store = readStore();
  const device = getDevice(store, clientId);
  device.subscription = null;
  writeStore(store);
  res.json({ ok: true });
});

app.post('/api/push/test', async (req, res) => {
  if (!PUSH_ENABLED) return res.status(503).json({ error: 'Máy chủ chưa cấu hình VAPID.' });
  const { clientId } = req.body || {};
  if (!validClientId(clientId)) return res.status(400).json({ error: 'clientId không hợp lệ.' });
  const store = readStore();
  const device = store.devices[clientId];
  if (!device || !device.subscription) return res.status(404).json({ error: 'Thiết bị chưa đăng ký nhận thông báo.' });
  try {
    await webpush.sendNotification(device.subscription, JSON.stringify({ title: 'StudyMate: Thông báo thử', body: 'Thông báo nền đang hoạt động. Bạn có thể tiếp tục kiểm thử deadline.', url: '/index.html', tag: 'studymate-test' }));
    res.json({ ok: true });
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) { device.subscription = null; writeStore(store); }
    res.status(502).json({ error: 'Không gửi được thông báo thử: ' + (err.message || 'lỗi push') });
  }
});

let schedulerRunning = false;
async function checkReminders() {
  if (!PUSH_ENABLED || schedulerRunning) return;
  schedulerRunning = true;
  try {
    const store = readStore();
    const now = Date.now();
    let changed = false;
    for (const [clientId, device] of Object.entries(store.devices || {})) {
      if (!device.subscription || !Array.isArray(device.tasks)) continue;
      device.sent ||= [];
      for (const task of device.tasks) {
        if (task.done || !Number.isFinite(task.deadlineEpoch)) continue;
        const reminderAt = task.deadlineEpoch - task.reminderMinutes * 60000;
        const key = `${task.id}:${task.deadlineEpoch}:${task.reminderMinutes}`;
        if (now < reminderAt || now >= task.deadlineEpoch || device.sent.includes(key)) continue;
        const payload = JSON.stringify({
          title: 'StudyMate: Sắp đến deadline',
          body: `“${task.name}” (${task.subject}) đến hạn ${task.deadlineLabel ? 'lúc ' + task.deadlineLabel : 'sắp tới'}. Còn khoảng ${task.reminderMinutes >= 60 ? `${Math.floor(task.reminderMinutes / 60)} giờ` : `${task.reminderMinutes} phút`}.`,
          url: '/index.html',
          tag: `studymate-${task.id}-${task.deadlineEpoch}`
        });
        try {
          await webpush.sendNotification(device.subscription, payload, { TTL: Math.max(60, Math.min(86400, Math.floor((task.deadlineEpoch - now) / 1000))) });
          device.sent.push(key);
          device.sent = device.sent.slice(-1000);
          changed = true;
          console.log(`Đã gửi nhắc deadline cho thiết bị ${clientId.slice(0, 8)}…, nhiệm vụ ${task.id}`);
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            device.subscription = null;
            changed = true;
          } else {
            console.error('Gửi push thất bại:', err.statusCode || '', err.message);
          }
        }
      }
    }
    if (changed) writeStore(store);
  } catch (err) { console.error('Lỗi bộ lập lịch:', err.message); }
  finally { schedulerRunning = false; }
}

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(ROOT, 'index.html'));
});
app.listen(PORT, () => {
  console.log(`StudyMate đang chạy tại http://localhost:${PORT}`);
  console.log(`Push notifications: ${PUSH_ENABLED ? 'ĐÃ CẤU HÌNH' : 'CHƯA CẤU HÌNH (chạy npm run setup)'}`);
  checkReminders();
  setInterval(checkReminders, 15000);
});
