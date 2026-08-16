# Ôn tập C#

PWA tĩnh luyện thi trắc nghiệm C# theo chủ đề. Không backend, không đăng nhập. Tiến độ lưu trong `localStorage` trên từng máy.

## Chạy local

Cần Python 3 (để đồng bộ JSON) và Node.js.

Từ thư mục gốc repo:

```bash
python scripts/prepare_pwa_data.py
cd pwa
npm install
npm run dev
```

Mở địa chỉ Vite in ra (thường `http://localhost:5173`).

`prepare_pwa_data.py` copy `Collected_data/` vào `pwa/public/data/` và tạo `index.json` (chủ đề, bài, số câu).

## Build

```bash
cd pwa
npm run build
```

Output: `pwa/dist`. Xem trước:

```bash
npm run preview
```

## Deploy Cloudflare Pages

1. Đưa repo lên GitHub/GitLab.
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → kết nối repo.
3. Cấu hình build:
   - **Root directory:** `pwa`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Cloudflare cấp HTTPS. File `public/_redirects` giữ routing SPA (`/topic/...`, `/quiz/...`).

Không cần thẻ tín dụng. Mỗi lần `git push` sẽ build lại.

Offline: service worker cache shell app; file JSON bài đã mở được cache, ôn tiếp được khi mất mạng.

## Dữ liệu

Câu hỏi lấy từ HTML Sanfoundry đã extract vào `Collected_data/`. Giao diện tiếng Việt; đề, đáp án và giải thích giữ tiếng Anh như nguồn.
