STUDYMATE PWA – BẢN TÍCH HỢP THÔNG BÁO ĐẨY
================================================

BẢN NÀY CÓ GÌ?
- Giao diện StudyMate: tổng quan, bài tập, lịch deadline, thống kê tiến độ.
- Biểu đồ vòng tổng thể: tỷ lệ hoàn thành, số việc đã xong, còn lại và quá hạn.
- Biểu đồ thanh theo môn học để so sánh tiến độ hoàn thành từng môn.
- Mục góp ý ẩn danh được lưu chung trên máy chủ, để người thử nghiệm gửi ý tưởng/lỗi và xem góp ý gần đây.
- Thêm/xóa nhiệm vụ, đánh dấu hoàn thành, tìm kiếm/lọc, chọn mức ưu tiên.
- Đính kèm một file PDF/Word/ảnh/TXT tối đa 1,5 MB. File đính kèm chỉ lưu trên trình duyệt hiện tại; không tải lên máy chủ.
- Tùy chỉnh thời gian nhắc theo phút/giờ/ngày hoặc nhập số giờ tùy chỉnh.
- PWA: manifest, service worker, cache khung trang, biểu tượng ứng dụng và nút cài đặt khi trình duyệt hỗ trợ.
- Tích hợp Web Push thực tế: backend lưu lịch deadline và subscription, bộ lập lịch kiểm tra mỗi 15 giây, service worker hiển thị push khi được trình duyệt đánh thức.
- Nút “Thử thông báo” giúp kiểm tra kết nối push sau khi bật.
- Mỗi trình duyệt có mã thiết bị riêng; dữ liệu nhiệm vụ không tự đồng bộ giữa các trình duyệt/thiết bị.

YÊU CẦU
- Node.js 18 trở lên.
- Trình duyệt hiện đại hỗ trợ Service Worker và Push API (Chrome/Edge là lựa chọn dễ thử).
- Push cần HTTPS khi chạy trên mạng. localhost được xem là môi trường an toàn để phát triển.

CHẠY THỬ TRÊN MÁY TÍNH WINDOWS
1. Cài Node.js LTS từ trang chính thức nodejs.org nếu máy chưa có.
2. Giải nén toàn bộ ZIP vào một thư mục, ví dụ StudyMate_PWA_full.
3. Mở thư mục đó trong File Explorer.
4. Nhấp thanh địa chỉ của thư mục, gõ cmd rồi nhấn Enter để mở Command Prompt ngay tại thư mục.
5. Chạy lần lượt:
       npm install
       npm run setup
       npm start
6. Giữ cửa sổ terminal mở để máy chủ tiếp tục chạy.
7. Mở Chrome/Edge tại địa chỉ:
       http://localhost:3000
8. Nhấn “Bật thông báo nền” và cho phép quyền thông báo.
9. Nhấn “Thử thông báo”. Nếu thông báo xuất hiện, push cơ bản đã hoạt động.
10. Thêm một nhiệm vụ thử có deadline ít nhất 20 phút trong tương lai. Chọn nhắc trước 15 phút (nhập 0,25 giờ trong mục Tùy chỉnh). Để bộ lập lịch hoạt động, không tắt cửa sổ terminal.

CẤU HÌNH VAPID
- `npm run setup` tạo file .env với cặp khóa VAPID cần cho Web Push.
- Không chia sẻ file .env, không đưa file này lên kho mã công khai.
- Nếu .env đã tồn tại, lệnh setup sẽ không ghi đè khóa cũ.

ĐƯA LÊN INTERNET / CÀI TRÊN ĐIỆN THOẠI
1. Chọn dịch vụ hosting có chạy được ứng dụng Node.js và hỗ trợ HTTPS.
2. Đưa các file dự án lên hosting, cài dependencies bằng `npm install`, khởi động bằng `npm start`.
3. Trong phần biến môi trường của hosting, khai báo VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (lấy giá trị từ .env đã tạo). Không tải .env công khai.
4. Bảo đảm thư mục `data/` được lưu bền vững qua các lần khởi động lại (persistent disk/volume), vì máy chủ lưu subscription và lịch nhắc ở `data/store.json`.
5. Máy chủ phải chạy liên tục và không được ngủ khi đến giờ gửi thông báo. Hosting miễn phí có thể ngủ, khởi động lại hoặc giới hạn thời gian chạy; trong trường hợp đó thông báo có thể trễ hoặc không đến.
6. Mở URL HTTPS bằng điện thoại, thêm StudyMate vào màn hình chính nếu trình duyệt cung cấp tùy chọn, bật thông báo và thử nút “Thử thông báo”.

CÁCH THÔNG BÁO DEADLINE HOẠT ĐỘNG
- Trình duyệt gửi subscription cho máy chủ sau khi người dùng cấp quyền.
- Mỗi khi nhiệm vụ/thời gian nhắc thay đổi, trình duyệt đồng bộ metadata nhiệm vụ lên máy chủ.
- Bộ lập lịch ở máy chủ kiểm tra định kỳ và gửi push khi đến thời điểm deadline trừ đi khoảng nhắc đã chọn.
- Service worker hiển thị thông báo. Trình duyệt/hệ điều hành vẫn có thể trì hoãn hoặc chặn thông báo tùy cài đặt tiết kiệm pin, quyền thông báo, trạng thái thiết bị và hỗ trợ của nền tảng.

LƯU Ý VỀ DỮ LIỆU VÀ AN TOÀN
- Đây là nguyên mẫu STEM dành cho thử nghiệm. Chưa có tài khoản/đăng nhập; mã thiết bị trong trình duyệt chỉ tách dữ liệu theo từng trình duyệt, không phải cơ chế xác thực bảo mật.
- Góp ý gửi qua website được hiển thị cho người truy cập khác. Không nhập tên đầy đủ, thông tin liên hệ, mật khẩu hoặc dữ liệu cá nhân; phần góp ý hiện chưa có công cụ kiểm duyệt/chống spam.
- Không dùng cho dữ liệu riêng tư/nhạy cảm hoặc triển khai công khai cho nhiều người dùng khi chưa bổ sung xác thực và giới hạn truy cập.
- File bài tập vẫn nằm trong localStorage của trình duyệt trên thiết bị hiện tại, không được gửi lên máy chủ. Xóa dữ liệu trình duyệt có thể làm mất file và nhiệm vụ cục bộ.
- Push khi đóng tab phụ thuộc trình duyệt/hệ điều hành; để gửi được, máy chủ cần hoạt động đúng giờ. Nếu tắt hẳn máy tính đang chạy máy chủ hoặc hosting ngừng chạy, bộ lập lịch không thể gửi đúng giờ.
- Nếu sửa mã, kiểm tra lại trên thiết bị thật và ghi kết quả vào báo cáo STEM; không ghi tính năng là đã hoạt động nếu chưa kiểm thử.

KIỂM TRA BẢN NÀY
- Đã kiểm tra cú pháp JavaScript bằng `node --check` cho script.js, server.js, service-worker.js và setup-vapid.js.
- Chưa xác nhận Web Push đầu-cuối trong môi trường này vì dependencies chưa cài thành công và chưa có khóa VAPID/HTTPS công khai. Sau khi chạy theo hướng dẫn, phải tự thử nút “Thử thông báo” và ghi kết quả thật.
- Biểu đồ được tính từ danh sách nhiệm vụ hiện có trong trình duyệt; góp ý mới được lưu trên máy chủ khi server/API hoạt động.

CẤU TRÚC CHÍNH
- index.html, style.css, script.js: giao diện và logic phía trình duyệt.
- manifest.webmanifest, service-worker.js, icons/: thành phần PWA và thông báo push.
- server.js: API, lưu subscription, đồng bộ metadata deadline và bộ lập lịch gửi push.
- setup-vapid.js: tạo khóa VAPID.
- package.json: dependencies và lệnh chạy.
- data/store.json: được tạo tự động khi chạy server, không đưa dữ liệu này lên kho công khai.
