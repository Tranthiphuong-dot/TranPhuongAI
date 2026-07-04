# Hero AI Video Creator — Hướng dẫn Deploy lên Vercel

## ĐIỀU QUAN TRỌNG CẦN BIẾT TRƯỚC

Khi chạy trong Claude.ai (artifact), phần gọi AI được Anthropic cấp quyền miễn phí. Khi tách ra chạy độc lập trên Vercel, **bạn cần tự có API Key Anthropic (trả phí theo lượng dùng)**. Dự án này đã được cấu hình để giữ API Key **an toàn ở phía máy chủ** (không lộ ra trình duyệt) thông qua một Serverless Function (`api/claude.js`).

## BƯỚC 1 — Lấy API Key Anthropic

1. Vào https://console.anthropic.com → đăng ký/đăng nhập.
2. Vào mục **API Keys** → **Create Key** → copy key (dạng `sk-ant-...`).
3. Vào mục **Billing** → nạp một khoản nhỏ (ví dụ 5 USD) để có hạn mức sử dụng.

Chi phí rất rẻ theo lượng dùng thực tế (không phải phí cố định hàng tháng).

## BƯỚC 2 — Cài công cụ cần thiết trên máy tính

1. Cài **Node.js** (bản 18 trở lên): https://nodejs.org
2. Cài **Vercel CLI**: mở Terminal/Command Prompt, chạy:
   ```
   npm install -g vercel
   ```

## BƯỚC 3 — Chuẩn bị dự án

1. Giải nén toàn bộ file trong thư mục dự án này ra một thư mục trên máy.
2. Mở Terminal tại đúng thư mục đó, chạy:
   ```
   npm install
   ```

## BƯỚC 4 — Chạy thử trên máy (không bắt buộc, nhưng nên làm)

1. Copy file `.env.example` thành `.env.local`.
2. Mở `.env.local`, dán API Key thật vào:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Chạy:
   ```
   vercel dev
   ```
4. Mở trình duyệt tới địa chỉ hiện ra (thường là `http://localhost:3000`), thử bấm "🎬 Tạo Nội Dung" xem có chạy được không.

## BƯỚC 5 — Deploy lên Vercel

1. Tại thư mục dự án, chạy:
   ```
   vercel
   ```
2. Làm theo các câu hỏi hiện ra (đăng nhập Vercel nếu chưa có tài khoản — miễn phí, dùng email hoặc GitHub).
3. Sau khi deploy xong lần đầu, Vercel sẽ đưa ra một link dạng `https://ten-du-an.vercel.app` — **link này CHƯA hoạt động được phần AI** vì chưa có API Key trên server thật.

## BƯỚC 6 — Thêm API Key vào Vercel (bắt buộc)

1. Vào https://vercel.com/dashboard → chọn đúng project vừa deploy.
2. Vào tab **Settings** → **Environment Variables**.
3. Thêm biến mới:
   - Name: `ANTHROPIC_API_KEY`
   - Value: dán API Key thật của bạn
   - Environment: chọn cả Production, Preview, Development
4. Bấm **Save**.
5. Quay lại Terminal, chạy lệnh deploy lại để áp dụng biến môi trường mới:
   ```
   vercel --prod
   ```

## BƯỚC 7 — Xong! Lấy link chia sẻ

Link Vercel (`https://ten-du-an.vercel.app`) giờ **dùng được ngay, ai có link cũng mở và dùng được, hoàn toàn không cần đăng nhập Claude** — đây chính là điều bạn muốn khi tách khỏi Claude.ai.

## NẾU GẶP LỖI

- **"Thiếu biến môi trường ANTHROPIC_API_KEY"** → làm lại Bước 6, nhớ bấm `vercel --prod` sau khi thêm biến.
- **Lỗi 401 / "Không thể xác thực với AI"** → kiểm tra lại API Key có copy đúng, đủ ký tự không.
- **Lỗi 429** → tài khoản Anthropic chưa nạp tiền hoặc đã hết hạn mức, vào console.anthropic.com kiểm tra Billing.
- Có thể xem log lỗi chi tiết tại Vercel Dashboard → project → tab **Logs**.

## LƯU Ý VỀ CHI PHÍ

Mỗi lần bấm "Tạo Nội Dung" sẽ tốn một khoản phí nhỏ tính theo API Key của bạn (vài trăm đồng đến vài nghìn đồng mỗi lần, tuỳ số cảnh). Nếu chia sẻ link công khai cho nhiều người dùng, hãy theo dõi mục Billing trên console.anthropic.com để tránh phát sinh chi phí ngoài ý muốn — có thể đặt giới hạn chi tiêu (Spend limit) trong phần Billing.
