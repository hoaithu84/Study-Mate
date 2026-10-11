const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('.env đã tồn tại. Không ghi đè khóa hiện tại. Nếu cần tạo lại, hãy sao lưu rồi xóa .env trước.');
  process.exit(0);
}
const keys = webpush.generateVAPIDKeys();
const content = [
  'PORT=3000',
  `VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  'VAPID_SUBJECT=mailto:studymate@example.com',
  ''
].join('\n');
fs.writeFileSync(envPath, content, { mode: 0o600 });
console.log('Đã tạo .env chứa VAPID keys. Không chia sẻ hoặc đăng tải file .env công khai.');
