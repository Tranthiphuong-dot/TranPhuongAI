// api/claude.js
// Vercel Serverless Function — chạy ở server, KHÔNG chạy trong trình duyệt.
// Nhiệm vụ: nhận request từ app, gắn API Key bí mật (lưu trong biến môi trường
// trên Vercel, không nằm trong code), rồi chuyển tiếp sang Anthropic.
// Nhờ vậy API Key không bao giờ lộ ra cho người dùng cuối.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Method not allowed" } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: {
        message:
          "Thiếu biến môi trường ANTHROPIC_API_KEY trên Vercel. Vào Project Settings → Environment Variables để thêm, rồi Redeploy.",
      },
    });
    return;
  }

  try {
    const { model, max_tokens, system, messages } = req.body || {};

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-5",
        max_tokens: max_tokens || 1000,
        system,
        messages,
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: "Lỗi máy chủ proxy: " + (e?.message || String(e)) } });
  }
}
