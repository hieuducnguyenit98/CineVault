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

## Hướng dẫn đưa code lên GitHub

### Cách 1: Nhanh nhất — Bấm nút Export ngay trên Google AI Studio
1. Ở thanh công cụ góc trên bên phải giao diện **Google AI Studio**, bấm vào biểu tượng **GitHub** (hoặc menu **Export**).
2. Chọn **Export to GitHub** / **Create Repository**.
3. Đăng nhập tài khoản GitHub và chọn tên repository mới. AI Studio sẽ tự động push toàn bộ code lên GitHub.

### Cách 2: Sử dụng Git trên máy cá nhân
Nếu bạn đã tải mã nguồn dự án về máy:
```bash
git init
git add .
git commit -m "feat: CineVault full-stack cinema app"
git branch -M main
git remote add origin https://github.com/<tài-khoản-của-bạn>/<tên-repo>.git
git push -u origin main
```

---

## Hướng dẫn Deploy Website lên Internet (Miễn phí từ GitHub)

> **Lưu ý quan trọng**: CineVault là ứng dụng **Full-Stack** (React Frontend + Express Backend Server để xác thực mã truy cập bảo mật và proxy stream HLS chống CORS). Do đó **không dùng GitHub Pages thuần static**, mà bạn kết nối repository GitHub với các dịch vụ hosting Full-stack miễn phí bên dưới:

### Cách 1: Deploy lên Render.com (Khuyên dùng nhất — Miễn phí & Tự động Deploy khi git push)

1. Truy cập [Render.com](https://render.com) và đăng nhập bằng tài khoản **GitHub**.
2. Bấm nút **New +** ở góc trên ➔ Chọn **Web Service**.
3. Chọn repository **CineVault** bạn vừa đưa lên GitHub.
4. Điền các mục cấu hình:
   - **Name**: `cinevault` (hoặc tên tùy thích).
   - **Region**: `Singapore (Southeast Asia)` (cho tốc độ load phim nhanh nhất tại Việt Nam).
   - **Runtime**: `Node`.
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`.
5. Tại mục **Environment Variables** (Tùy chọn):
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render tự cấp cổng).
   - `ACCESS_CODE` = (để trống nếu dùng mã mặc định `XARS-1457-9987-OPOR-7786`, hoặc điền mã mới nếu muốn đổi).
6. Bấm **Create Web Service**. Render sẽ tự động clone từ GitHub, build và cấp link web dạng `https://cinevault-xxxx.onrender.com`. Mỗi khi bạn `git push` code mới lên GitHub, Render sẽ tự động cập nhật deploy mới!

---

### Cách 2: Deploy lên Railway.app

1. Truy cập [Railway.app](https://railway.app), đăng nhập bằng tài khoản GitHub.
2. Bấm **New Project** ➔ Chọn **Deploy from GitHub repo** ➔ Chọn repo CineVault.
3. Railway tự động nhận diện Node.js, chạy build và start server.
4. Vào tab **Settings** ➔ Mục **Networking** ➔ Bấm **Generate Domain** để nhận đường link truy cập công khai.

---

### Cách 3: Deploy bằng Docker (VPS, Cloud Run, CapRover, Coolify)

Dự án đã có sẵn file `Dockerfile` chuẩn đa tầng (multi-stage build):
```bash
# Build Docker image
docker build -t cinevault .

# Chạy container trên cổng 3000
docker run -d -p 3000:3000 --name cinevault cinevault
```

---

## Kiểm thử & Kiểm tra mã nguồn

```bash
npm test      # Chạy unit tests (node:test via tsx)
npm run lint  # Kiểm tra cú pháp TypeScript
```

