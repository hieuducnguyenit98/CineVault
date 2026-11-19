# CineVault — Rạp Phim Cá Nhân

Ứng dụng web xem phim cá nhân được xây dựng với **React 19**, **Vite**, **Tailwind CSS v4** và **Express** backend proxy.

## Tính năng chính

- **Banner tiêu điểm hằng ngày**: Tuyển chọn 10 phim nổi bật mới nhất mỗi ngày với ảnh nền HD, tự động chuyển cảnh mượt mà.
- **Kho phim & Bộ lọc trực quan**: Hỗ trợ Phim chiếu rạp, Phim lẻ, Phim bộ, Hoạt hình, TV Shows, lọc nhanh theo Thể loại / Quốc gia và tab riêng **Phim Thuyết Minh**.
- **Lưu tiến độ & Lịch sử xem**: Ghi nhớ chính xác tập đang xem và thời gian đã xem để mở tiếp tập kế tiếp chỉ với một chạm.
- **Gợi ý theo sở thích cá nhân**: Phân tích thể loại bạn hay xem, danh sách yêu thích và lịch sử để xếp hạng phim phù hợp.
- **Phòng chiếu chuyên nghiệp**: Hỗ trợ phát HLS mượt mà, tự động chuyển tập, danh sách phím tắt bàn phím (`Space`, `←/→`, `J/L`, `M`, `F`, `N`, `?`) và giao diện Sáng / Tối.
- **Đồng bộ đa nền tảng**: Lưu trên trình duyệt (`localStorage`) kết hợp đồng bộ bằng mã hồ sơ riêng qua API backend.

## Yêu cầu môi trường

- **Node.js `>= 22.18.0`** (chạy trực tiếp `node server.ts` không cần bước biên dịch server riêng; với Node 20 có thể dùng `npm run start:tsx`).

## Cài đặt & Chạy trên máy (Development)

```bash
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

## Build & Chạy Production (Khi deploy từ GitHub)

```bash
npm install
npm run build
NODE_ENV=production npm start
```

> Nếu môi trường hosting chạy Node.js `< 22.18.0`, dùng lệnh khởi động `npm run start:tsx` (hoặc cấu hình phiên bản Node `22.x` theo trường `engines.node` trong `package.json`).

## Kiểm thử & Kiểm tra mã nguồn

```bash
npm test      # Chạy unit tests (node:test via tsx)
npm run lint  # Kiểm tra kiểu TypeScript
```
