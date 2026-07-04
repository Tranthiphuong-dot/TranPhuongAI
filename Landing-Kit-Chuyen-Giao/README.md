# 🎨 Landing Kit — Tạo trang bán hàng đẹp bằng Claude Code

Bộ này giúp bạn tạo **landing page / sales page đẹp như studio làm** mà **không cần biết code hay thiết kế**.
Bạn chỉ trả lời vài câu hỏi, Claude lo phần còn lại.

---

## Cần gì trước

1. **Claude Code** (bản terminal, hoặc app desktop / VS Code).
   Chưa có? Tải ở: https://claude.com/claude-code
2. **Python** (để skill thiết kế tra cứu dữ liệu) — đa số máy đã có sẵn. Kiểm tra: gõ `python --version`.
3. Bộ kit này (thư mục `Landing-Kit-Chuyen-Giao`).

> Không cần biết HTML. Kết quả là **1 file mở bằng trình duyệt là xem được**.

---

## Dùng trong 3 bước

**Bước 1 — Mở thư mục này bằng Claude Code.**
Mở terminal trong thư mục `Landing-Kit-Chuyen-Giao` rồi gõ:
```
claude
```
(Hoặc trong app/VS Code: "Open folder" → chọn thư mục này.)

**Bước 2 — Gọi skill.** Gõ vào Claude:
```
/lam-landing
```
*(hoặc chỉ cần nói: "làm cho tôi một trang đăng ký webinar", "tạo sales page bán khoá học"…)*

**Bước 3 — Trả lời vài câu hỏi.**
Claude sẽ hỏi 2 nhóm:
- **Nội dung:** bán/giới thiệu gì, cho ai, muốn người xem làm gì, có bằng chứng gì, **có muốn khung chat hỏi-đáp trên trang không**.
- **Thiết kế:** vibe, màu sắc (nền + màu nhấn + màu thương hiệu nếu có), kiểu chữ, bố cục, độ "bạo" bạn muốn.

Rồi Claude **tra bộ não thiết kế** (161 bảng màu, 57 cặp font, 50+ phong cách, quy tắc UX thật) để chọn **phong cách + màu + font + bố cục** hợp business của bạn, tóm tắt cho bạn duyệt — đây là bước làm trang ra **có cơ sở, không đổ khuôn, không giống AI**. Duyệt xong → Claude tạo file **`landing.html`** rồi thêm lớp **polish chuyển động** cho trang sống động.

Mở `landing.html` bằng trình duyệt (Chrome/Edge) → xong trang của bạn. 🎉

---

## Đưa trang lên mạng (miễn phí)

File `landing.html` có thể đăng lên internet trong 1 phút:
- **Netlify Drop:** vào https://app.netlify.com/drop → kéo thả file vào → có link ngay.
- **Vercel / GitHub Pages:** cũng được. Cứ bảo Claude "giúp tôi deploy" nếu cần.

---

## Bên trong có gì (không cần đụng tới)

```
Landing-Kit-Chuyen-Giao/
├── README.md                       ← bạn đang đọc
├── .claude/skills/
│   ├── ui-ux-pro-max/              ← BỘ NÃO THIẾT KẾ (161 palette, 57 cặp font,
│   │   ├── SKILL.md                   50+ style, 99 UX rule) — quyết định style/màu/font
│   │   ├── data/  (31 file CSV)
│   │   └── scripts/  (tra cứu)
│   ├── emil-design-eng/            ← LỚP POLISH (animation, easing, micro-interaction)
│   │   └── SKILL.md
│   └── lam-landing/                ← ĐIỀU PHỐI + bản địa hoá VN
│       ├── SKILL.md                ← quy trình 6 bước, ghép 3 skill
│       ├── COPY.md                 ← viết chữ bán hàng tiếng Việt
│       ├── CHATBOT.md              ← widget chat hỏi-đáp (tuỳ chọn)
│       ├── CHECKOUT.md             ← bấm nút đi đâu: thanh toán / form / QR
│       ├── CONCEPT.md / DESIGN.md  ← tham chiếu phụ
└── template/
    └── starter.html                ← 1 ví dụ HTML 1 file
```

Bộ gồm **3 skill** phối hợp: `ui-ux-pro-max` ra **quyết định thiết kế có cơ sở dữ liệu** (hết "AI/đơn điệu"), `emil-design-eng` thêm **lớp polish sống động**, `lam-landing` lo **phỏng vấn + copy tiếng Việt + ráp 1 file**.
Bạn không cần đọc — Claude tự dùng.

---

## Mẹo để ra trang đẹp nhất

- **Đưa nội dung thật:** cảm nhận khách hàng thật, con số thật, tên thật → trang chuyển đổi tốt hơn nhiều. Thiếu thì Claude sẽ đánh dấu "chỗ này điền sau".
- **Biết rõ 1 hành động bạn muốn người xem làm** (mua / đăng ký / để lại SĐT) và **link nút bấm đi đâu**.
- Muốn đổi màu/phong cách sau khi xem thử? Cứ nói: *"đổi sang tông tối, mạnh hơn"* — Claude sửa ngay.
- Muốn sửa câu chữ? Nói thẳng chỗ cần đổi.

---

*Chúc bạn ra trang đẹp. Có gì cứ hỏi Claude — nó hiểu cả bộ kit này.*
