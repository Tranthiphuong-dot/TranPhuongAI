import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, X, Sparkles, BookOpen, Layers, Shirt, Ratio, Copy, Check,
  ChevronDown, ChevronUp, Loader2, ImageIcon, Video, Download, AlertCircle,
  RefreshCw, Info, HelpCircle, Save, Users, Sun, Moon, Wand2, Film,
} from "lucide-react";

/* ============================================================
   CONSTANTS
   ============================================================ */

const MODEL = "claude-sonnet-5"; // real Anthropic API model string — change here if you want a different Claude model

const RELATIONSHIP_OPTIONS = [
  { value: "father-son", label: "Cha và Con trai", roleA: "Cha", roleB: "Con trai" },
  { value: "father-daughter", label: "Cha và Con gái", roleA: "Cha", roleB: "Con gái" },
  { value: "mother-son", label: "Mẹ và Con trai", roleA: "Mẹ", roleB: "Con trai" },
  { value: "mother-daughter", label: "Mẹ và Con gái", roleA: "Mẹ", roleB: "Con gái" },
  { value: "teacher-student", label: "Giáo viên và Học sinh", roleA: "Giáo viên", roleB: "Học sinh" },
  { value: "sibling-older-younger", label: "Anh/Chị và Em", roleA: "Anh/Chị", roleB: "Em" },
];

const COSTUME_MODES = [
  { value: "context", label: "Phù hợp bối cảnh (tự đổi theo từng cảnh)" },
  { value: "lock", label: "Giữ nguyên trang phục toàn bộ" },
  { value: "custom", label: "Tôi tự quy định trang phục" },
];

const TOPIC_LIST = [
  "Động vật", "Đồ ăn", "Trái cây", "Rau củ", "Gia đình", "Trường học",
  "Phương tiện giao thông", "Nghề nghiệp", "Bộ phận cơ thể", "Màu sắc",
  "Số đếm", "Thời tiết", "Thiên nhiên", "Sinh hoạt hàng ngày", "Quần áo",
  "Đồ chơi", "Cảm xúc", "Hình khối", "Phòng tắm", "Nhà bếp",
];

const SCENE_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];
const TOPIC_WORD_COUNT_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const ASPECT_OPTIONS = [
  { value: "9:16", label: "9:16 (Dọc)", ratio: "9/16", editSize: "1024x1536" },
  { value: "16:9", label: "16:9 (Ngang)", ratio: "16/9", editSize: "1536x1024" },
  { value: "1:1", label: "1:1 (Vuông)", ratio: "1/1", editSize: "1024x1024" },
];

const VIDEO_STYLE_OPTIONS = [
  { value: "cinematic", label: "🎬 Điện ảnh (Cinematic)", desc: "smooth cinematic camera moves (slow push-in, gentle pan), shallow depth of field, warm professional color grading, film-quality lighting" },
  { value: "playful", label: "🎈 Vui nhộn, năng động (Playful)", desc: "bouncy energetic camera movement, bright saturated colors, quick playful framing, upbeat cheerful energy" },
  { value: "slowmo", label: "🌤️ Chậm rãi, ấm áp (Gentle)", desc: "gentle slow-paced camera, soft dreamy lighting, tender heartwarming pacing, cozy atmosphere" },
  { value: "documentary", label: "📷 Chân thực, tự nhiên (Documentary)", desc: "natural handheld-style camera, realistic everyday lighting, candid authentic home-video feel" },
  { value: "closeup", label: "💛 Cận cảnh cảm xúc (Close-up)", desc: "intimate close-up framing on faces and expressions, soft blurred background, emotional warm connection" },
];

/* ============================================================
   HELPERS
   ============================================================ */

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fileToImageObj(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.match(/data:(.*);base64/)?.[1] || "image/png";
      resolve({ id: uid(), name: file.name, dataUrl, base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractJson(text, stageLabel) {
  let t = (text || "").trim();
  t = t.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1);
  try {
    return JSON.parse(t);
  } catch (e) {
    const err = new Error(`AI trả về dữ liệu không đúng định dạng ở bước "${stageLabel || "xử lý"}".`);
    err.stage = "parse";
    throw err;
  }
}

async function callClaudeOnce({ system, content, maxTokens = 1000 }) {
  let response;
  try {
    response = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
    });
  } catch (networkErr) {
    const err = new Error("Không thể kết nối tới AI. Vui lòng kiểm tra kết nối mạng và thử lại.");
    err.stage = "network";
    throw err;
  }
  if (!response.ok) {
    let bodyText = "";
    try { bodyText = await response.text(); } catch (e) { /* ignore */ }
    let serverMsg = "";
    try { serverMsg = JSON.parse(bodyText)?.error?.message || ""; } catch (e) { /* not JSON */ }
    let err;
    if (response.status === 401 || response.status === 403) err = new Error(serverMsg || "Không thể xác thực với AI (lỗi quyền truy cập API).");
    else if (response.status === 429) err = new Error(serverMsg || "AI đang bị giới hạn tần suất yêu cầu. Vui lòng đợi rồi thử lại.");
    else if (response.status >= 500) err = new Error(serverMsg || "Máy chủ AI đang gặp sự cố. Vui lòng thử lại sau.");
    else err = new Error(`Lỗi AI API (mã ${response.status}): ${serverMsg || bodyText.slice(0, 200)}`);
    err.stage = "api"; err.status = response.status;
    throw err;
  }
  let data;
  try { data = await response.json(); } catch (e) {
    const err = new Error("Không đọc được phản hồi từ AI (dữ liệu JSON không hợp lệ).");
    err.stage = "parse"; throw err;
  }
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) { const err = new Error("AI không trả về nội dung văn bản."); err.stage = "empty"; throw err; }
  return textBlock.text;
}

async function callClaude({ system, content, maxTokens = 1000, retry = true }) {
  try {
    return await callClaudeOnce({ system, content, maxTokens });
  } catch (e) {
    const retryable = retry && (e.stage === "network" || e.status === 429 || e.status >= 500);
    if (!retryable) throw e;
    await new Promise((r) => setTimeout(r, 900));
    return await callClaudeOnce({ system, content, maxTokens });
  }
}

function friendlyError(e, stageLabel) {
  if (e?.message) return e.message;
  return `Đã xảy ra lỗi không xác định ở bước "${stageLabel || "xử lý"}". Vui lòng thử lại.`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      return true;
    } catch (e2) { return false; }
  }
}

/* ============================================================
   SMALL UI PIECES
   ============================================================ */

function SectionCard({ icon, title, subtitle, children, right }) {
  return (
    <div className="hai-card">
      <div className="hai-card-head">
        <div className="hai-card-icon">{icon}</div>
        <div style={{ flex: 1 }}>
          <h3 className="hai-card-title">{title}</h3>
          {subtitle && <p className="hai-card-subtitle">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="hai-card-body">{children}</div>
    </div>
  );
}

function CopyButton({ text, label = "Sao chép" }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  };
  return (
    <button className={`hai-copy-btn ${copied ? "is-copied" : ""}`} onClick={onClick}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Đã sao chép" : label}
    </button>
  );
}

function UploadBox({ label, image, onPick, onRemove, inputRef }) {
  return (
    <div className="hai-upload-box" onClick={() => inputRef.current?.click()}>
      {image ? (
        <>
          <img src={image.dataUrl} alt={label} />
          <button className="hai-upload-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}><X size={13} /></button>
        </>
      ) : (
        <div className="hai-upload-empty">
          <Upload size={20} />
          <span>{label}</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  const [theme, setTheme] = useState("light");

  const [relationship, setRelationship] = useState(RELATIONSHIP_OPTIONS[0].value);
  const [childName, setChildName] = useState("");
  const [costumeMode, setCostumeMode] = useState("context");
  const [customCostume, setCustomCostume] = useState("");

  const [imageA, setImageA] = useState(null);
  const [imageB, setImageB] = useState(null);
  const inputARef = useRef(null);
  const inputBRef = useRef(null);

  const [contentMode, setContentMode] = useState("topic"); // 'topic' | 'custom'
  const [topic, setTopic] = useState(TOPIC_LIST[0]);
  const [topicWords, setTopicWords] = useState([]); // [{en, ipa, vi}] — từ xem trước cho chủ đề ngẫu nhiên
  const [topicWordCount, setTopicWordCount] = useState(12); // số từ muốn lấy, 8-20
  const [topicWordsLoading, setTopicWordsLoading] = useState(false);
  const [topicWordsError, setTopicWordsError] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [sceneCount, setSceneCount] = useState(1);
  const [aspect, setAspect] = useState("9:16");
  const [videoStyle, setVideoStyle] = useState(VIDEO_STYLE_OPTIONS[0].value);

  const [isGenerating, setIsGenerating] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ images: false, customContent: false });
  const [showGuide, setShowGuide] = useState(true);

  const [scenes, setScenes] = useState([]);
  const [genStage, setGenStage] = useState("idle"); // idle | skeleton | dialogue | imagePrompts | veoPrompts | done
  const [hasResult, setHasResult] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const imagesBlockRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hero-ai:last-lesson");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.relationship) setRelationship(s.relationship);
        if (s.childName) setChildName(s.childName);
        if (s.topic) setTopic(s.topic);
        if (s.contentMode) setContentMode(s.contentMode);
        if (s.customContent) setCustomContent(s.customContent);
        if (s.sceneCount) setSceneCount(s.sceneCount);
        if (s.aspect) setAspect(s.aspect);
      }
    } catch (e) {
      /* no saved settings yet */
    }
  }, []);

  const relOpt = RELATIONSHIP_OPTIONS.find((r) => r.value === relationship) || RELATIONSHIP_OPTIONS[0];
  const aspectOpt = ASPECT_OPTIONS.find((a) => a.value === aspect) || ASPECT_OPTIONS[0];
  const customWordList = customContent.split("\n").map((w) => w.trim()).filter(Boolean);
  const effectiveSceneCount = sceneCount;

  async function fetchTopicWords() {
    setTopicWordsLoading(true);
    setTopicWordsError("");
    try {
      const ageLabelForWords = "trẻ em học tiếng Anh cơ bản";
      const sys = "You reply with ONLY a valid JSON object, no markdown fences, no commentary.";
      const userText = `Suggest exactly ${topicWordCount} common English vocabulary words for the topic "${topic}", appropriate for a ${ageLabelForWords} learner. Order them from simplest to slightly more advanced, no duplicates. For each word give: the English word, a simple IPA phonetic spelling, and its accurate Vietnamese meaning. Return ONLY: {"words":[{"en":"...","ipa":"...","vi":"..."}]} with exactly ${topicWordCount} items.`;
      const raw = await callClaude({ system: sys, content: [{ type: "text", text: userText }] });
      const parsed = extractJson(raw, `Lấy ${topicWordCount} từ vựng theo chủ đề`);
      const words = Array.isArray(parsed.words) ? parsed.words.slice(0, topicWordCount) : [];
      if (words.length === 0) throw new Error("AI không trả về từ vựng nào. Vui lòng thử lại.");
      setTopicWords(words);
    } catch (e) {
      setTopicWordsError(friendlyError(e, `Lấy ${topicWordCount} từ vựng theo chủ đề`));
      setTopicWords([]);
    } finally {
      setTopicWordsLoading(false);
    }
  }

  // Tự động lấy từ vựng mỗi khi đổi chủ đề hoặc đổi số lượng từ (chỉ khi đang ở chế độ "Chủ đề ngẫu nhiên")
  useEffect(() => {
    if (contentMode === "topic") {
      fetchTopicWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, contentMode, topicWordCount]);

  // Chia đúng 12 từ vào đúng số cảnh, GIỮ NGUYÊN THỨ TỰ (chia bằng code, không nhờ AI quyết để tránh bị xáo trộn)
  function groupWordsIntoScenes(words, sceneCountTarget) {
    const total = words.length;
    const n = Math.max(1, sceneCountTarget);
    const base = Math.floor(total / n);
    const extra = total % n;
    const groups = [];
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const count = base + (i < extra ? 1 : 0);
      groups.push(words.slice(idx, idx + count));
      idx += count;
    }
    return groups;
  }

  function toggleTheme() { setTheme((t) => (t === "light" ? "dark" : "light")); }

  async function pickImage(setter, file) {
    if (!file) return;
    const obj = await fileToImageObj(file);
    setter(obj);
    setFieldErrors((p) => ({ ...p, images: false }));
  }

  function describeCostumeRule() {
    if (costumeMode === "lock") return "Keep every character in exactly ONE identical outfit from the first scene to the last. Never change any clothing item.";
    if (costumeMode === "custom") return `Use exactly these teacher-specified outfits, unchanged in every scene: ${customCostume || "(no custom costume provided — keep one consistent outfit)"}`;
    return "You may change each character's outfit to naturally fit each scene's setting, but always keep the same face, hairstyle, hair color, and identifying features.";
  }

  function itemsLabel(items) {
    return (items || []).map((it) => `${it.vi} / ${it.en}`).join(", ");
  }

  async function generateDialogue(scene, index) {
    const sys = "You are a warm bilingual Vietnamese-English teacher writing a scene narration for a teaching video. You always reply with ONLY one valid JSON object — no markdown fences, no commentary.";
    const items = scene.items || [];
    const itemLines = items
      .map((it, k) => `${k + 1}) Vietnamese: "${it.vi}", English: "${it.en}"`)
      .join("\n");
    const userText = `
Scene ${index + 1} — Location: "${scene.setting}". Characters: ${relOpt.roleA} and ${relOpt.roleB}${childName ? ` (tên: ${childName})` : ""}.
Vocabulary items taught in this scene, in this EXACT order (do not skip, add, or reorder any of them):
${itemLines}

Write "dialogueVi" (Vietnamese narration for this exact scene, roughly ${Math.max(80, items.length * 35)}-${Math.max(140, items.length * 50)} words depending on how many items are listed). Start by describing where the characters stand and what is in front of them. Then, for EACH item above, in order, write this exact quiz pattern: "${relOpt.roleA} chỉ vào [vật] và hỏi: \\"[Vật] tiếng Anh là gì con?\\" Con nhìn [vật] và trả lời: \\"[English word]!\\"" (for the very first item), and for every following item use a natural transition first — e.g. "Ngay cạnh đó là...", "Kế bên đó là...", "Ngay phía trên là...", "Cạnh đó còn có..." — then: "${relOpt.roleA} chỉ vào [vật tiếp theo] và hỏi: \\"Thế còn [vật tiếp theo] thì sao con?\\" Con trả lời: \\"[English word]!\\"". Repeat this pattern for every single item listed above, in the same order, without skipping any. Keep quoted dialogue natural and exactly in this style.

Return ONLY: {"dialogueVi":"..."}
`.trim();
    const raw = await callClaude({ system: sys, content: [{ type: "text", text: userText }] });
    const parsed = extractJson(raw, `Kịch bản — Cảnh ${index + 1}`);
    return parsed.dialogueVi?.trim() || "";
  }

  async function generateImagePromptFor(scene, index, profileText, costumeRule) {
    const sys = "You are a senior AI prompt engineer for children's educational animation. You always reply with ONLY one valid JSON object — no markdown fences, no commentary.";
    const userText = `
Character Profiles (must be followed exactly — do not redesign, do not change identity, face, hairstyle, hair color, skin tone, or body proportions):
${profileText}

Costume rule: ${costumeRule}
Image aspect ratio: ${aspectOpt.value}.
Scene ${index + 1} — Setting: "${scene.setting}". Objects that must be visible: ${itemsLabel(scene.items)}.

Write "imagePrompt" (120-150 words, in English): a highly detailed text-to-image prompt. MUST start verbatim with: "Use the character reference exactly as defined in the Character Profiles above. Do not create a new character. Do not change any character's face or identity. Maintain identical face, hairstyle, hair color, skin tone, body proportions, and illustration style for every character present." Then continue with: characters present, costumes per costume rule, setting/background, the specific objects listed above clearly visible, camera angle, lighting, composition, mood, ending with quality tags: high resolution, vibrant colors, 3D animated film style, children's educational illustration, ${aspectOpt.value} aspect ratio.

Return ONLY: {"imagePrompt":"..."}
`.trim();
    const raw = await callClaude({ system: sys, content: [{ type: "text", text: userText }] });
    const parsed = extractJson(raw, `Prompt ảnh — Cảnh ${index + 1}`);
    return parsed.imagePrompt?.trim() || "";
  }

  async function generateVeoPromptFor(scene, index, styleValue) {
    const styleOpt = VIDEO_STYLE_OPTIONS.find((v) => v.value === styleValue) || VIDEO_STYLE_OPTIONS[0];
    const sys = "You are a senior AI prompt engineer for Veo 3 children's educational animation. You always reply with ONLY one valid JSON object — no markdown fences, no commentary.";
    const userText = `
Scene ${index + 1} — Setting: "${scene.setting}". Objects: ${itemsLabel(scene.items)}. Scene narration (must match exactly): "${scene.dialogueVi}"
Visual/directing style requested: ${styleOpt.desc}.

Write "veoPrompt" (150-190 words, in English): a Veo 3 video prompt 100% consistent with this scene (same setting, same objects, same dialogue). Describe: actions, facial expressions, body/hand/head/eye movement, camera angle and movement reflecting the "${styleOpt.label}" style described above, lighting, atmosphere, accurate lip-sync, and the exact spoken dialogue lines (translate the Vietnamese narration's quoted lines into natural spoken English captions for lip-sync timing, keeping the same Q&A structure).

Return ONLY: {"veoPrompt":"..."}
`.trim();
    const raw = await callClaude({ system: sys, content: [{ type: "text", text: userText }] });
    const parsed = extractJson(raw, `Prompt video — Cảnh ${index + 1}`);
    return parsed.veoPrompt?.trim() || "";
  }

  async function retryScene(i) {
    setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: true, failed: false, errorMessage: "" } : s)));
    try {
      const costumeRule = describeCostumeRule();
      const profileText = `${relOpt.roleA} (${imageA ? "có ảnh" : "chưa có ảnh"}), ${relOpt.roleB} (${imageB ? "có ảnh" : "chưa có ảnh"})`;
      const scene = scenes[i];
      const dialogueVi = await generateDialogue(scene, i);
      const sceneWithDialogue = { ...scene, dialogueVi };
      const imagePrompt = await generateImagePromptFor(sceneWithDialogue, i, profileText, costumeRule);
      const veoPrompt = await generateVeoPromptFor({ ...sceneWithDialogue, imagePrompt }, i, videoStyle);
      setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, dialogueVi, imagePrompt, veoPrompt, loading: false, failed: false, errorMessage: "" } : s)));
    } catch (e) {
      setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: false, failed: true, errorMessage: friendlyError(e, `Cảnh ${i + 1}`) } : s)));
    }
  }

  async function generateContent() {
    setError("");
    const hasImages = !!imageA && !!imageB;
    const needsCustomContent = contentMode === "custom" && customWordList.length === 0;
    const needsTopicWords = contentMode === "topic" && topicWords.length !== topicWordCount;
    setFieldErrors({ images: !hasImages, customContent: needsCustomContent });
    if (!hasImages || needsCustomContent || needsTopicWords) {
      const missing = [];
      if (!hasImages) missing.push("ảnh nhân vật");
      if (needsCustomContent) missing.push("nội dung bài học tự nhập");
      if (needsTopicWords) missing.push(topicWordsLoading ? `đợi tải xong ${topicWordCount} từ vựng` : `${topicWordCount} từ vựng cho chủ đề (bấm 'Lấy từ khác')`);
      setError(`Vui lòng bổ sung: ${missing.join(", ")} (được đánh dấu đỏ phía trên).`);
      imagesBlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsGenerating(true);
    setHasResult(false);
    setScenes([]);

    let currentStage = "Chuẩn bị dữ liệu";
    try {
      /* STEP 1: character profiles */
      currentStage = "Phân tích nhân vật";
      setStepLabel("Đang phân tích nhân vật...");
      const content = [
        { type: "text", text: `Character A — Role: "${relOpt.roleA}". Photo:` },
        { type: "image", source: { type: "base64", media_type: imageA.mediaType, data: imageA.base64 } },
        { type: "text", text: `Character B — Role: "${relOpt.roleB}"${childName ? `, Name: "${childName}"` : ""}. Photo:` },
        { type: "image", source: { type: "base64", media_type: imageB.mediaType, data: imageB.base64 } },
        {
          type: "text",
          text: `For EACH character above, write a detailed English "Character Profile" paragraph (70-100 words) to be reused verbatim in every future prompt for identity lock. Describe: face shape/features, hairstyle, hair color, skin tone, body proportions, illustration style, unique identifying features. Return ONLY: {"profiles":[{"role":"...","profile":"..."}]}`,
        },
      ];
      const sysProfiles = "You are an expert character designer. You always reply with ONLY one valid JSON object — no markdown fences, no commentary.";
      const rawProfiles = await callClaude({ system: sysProfiles, content });
      const parsedProfiles = extractJson(rawProfiles, currentStage);
      const profiles = Array.isArray(parsedProfiles.profiles) ? parsedProfiles.profiles : [];
      if (profiles.length === 0) throw Object.assign(new Error("AI không tạo được Character Profile từ ảnh đã tải. Vui lòng thử ảnh khác rõ mặt hơn."), { stage: "empty" });
      const profileText = profiles.map((p) => `${p.role}: ${p.profile}`).join("\n");

      /* STEP 2: scene skeleton — setting + 1-2 vocabulary items per scene (kept lightweight so it never gets truncated, regardless of scene count) */
      currentStage = "Lên khung kịch bản";
      setGenStage("skeleton");
      setStepLabel("Đang lên khung kịch bản...");
      const costumeRule = describeCostumeRule();
      const sysStory = "You are a warm bilingual Vietnamese-English teacher planning a short quiz-style teaching video. You always reply with ONLY one valid JSON object — no markdown fences, no commentary. Keep every field very short so the whole response stays compact no matter how many scenes are requested.";

      let sceneList;

      if (contentMode === "topic") {
        /* Topic mode: word→scene assignment is done in JS (deterministic, order preserved).
           AI is only asked for a short setting label per scene — nothing about word choice/order. */
        if (topicWords.length !== topicWordCount) {
          throw Object.assign(
            new Error(`Chưa có đủ ${topicWordCount} từ vựng cho chủ đề này. Vui lòng đợi tải xong (hoặc bấm 'Lấy từ khác') rồi thử lại.`),
            { stage: "empty" }
          );
        }
        const groups = groupWordsIntoScenes(topicWords, effectiveSceneCount);
        const groupsDescription = groups
          .map((g, i) => `Scene ${i + 1} words: ${g.map((w) => w.en).join(", ")}`)
          .join("\n");

        const userSettings = `
Characters: ${relOpt.roleA} and ${relOpt.roleB}${childName ? ` (tên: ${childName})` : ""}.
The vocabulary words for each scene are ALREADY FIXED below, in order — do NOT change, add, remove, or reorder them.

${groupsDescription}

For each scene, write ONLY a short Vietnamese location/setting label (max 6 words) for a natural everyday place where these exact words would appear together (e.g. "Khu vực bồn rửa mặt").

Return ONLY: {"settings": ["...", "...", ...]} — exactly ${effectiveSceneCount} items, same order as listed above.
`.trim();
        const rawSettings = await callClaude({ system: sysStory, content: [{ type: "text", text: userSettings }] });
        const parsedSettings = extractJson(rawSettings, currentStage);
        const settings = Array.isArray(parsedSettings.settings) ? parsedSettings.settings : [];

        sceneList = groups.map((g, i) => ({
          setting: settings[i] || `Cảnh học từ vựng ${i + 1}`,
          items: g.map((w) => ({ vi: w.vi, en: w.en, ipa: w.ipa })),
        }));
      } else {
        const words = customWordList.map((w, i) => `${i + 1}) "${w}"`).join(", ");
        let topicOrContentRule;
        if (customWordList.length === effectiveSceneCount * 2) {
          topicOrContentRule = `The lesson content is FIXED by the teacher. Use ONLY these exact words/phrases, in this exact order, TWO per scene — do NOT add, substitute, or invent any other vocabulary word under any circumstance: ${words}.`;
        } else {
          topicOrContentRule = `The lesson content is FIXED by the teacher — do NOT add, substitute, or invent any other vocabulary word under any circumstance. You MUST teach ALL of these words across the ${effectiveSceneCount} scene(s), grouping 1-3 related words per scene as needed so every single word below ends up taught in some scene (reuse/review a word again in an extra scene only if there simply aren't enough words to fill every scene): ${words}.`;
        }
        topicOrContentRule += ` If a listed item is already in English, keep it as the English answer directly; if it is Vietnamese, translate it naturally to teach as the English answer. Keep the words in the exact order given, scene by scene, from first to last — do not shuffle or reorder them.`;

        const userStory = `
Characters: ${relOpt.roleA} and ${relOpt.roleB}${childName ? ` (tên: ${childName})` : ""}.
${topicOrContentRule}
Costume rule: ${costumeRule}

Plan EXACTLY ${effectiveSceneCount} scene(s) for a bilingual Vietnamese-English quiz-style teaching video. Each scene is set in ONE natural everyday location and should naturally contain the words assigned to it.

For each scene return ONLY these short fields:
- "setting": short Vietnamese label for the location/area, e.g. "Khu vực bồn rửa mặt" (max 6 words)
- "items": array of 1-3 objects {"vi": Vietnamese word, "en": English translation, "ipa": simple IPA phonetic spelling e.g. "/tuːθbrʌʃ/"}

Return ONLY: {"scenes":[{"setting":"...","items":[{"vi":"...","en":"...","ipa":"..."}]}]}
The "scenes" array MUST contain exactly ${effectiveSceneCount} items — this is mandatory.
`.trim();
        const rawStory = await callClaude({ system: sysStory, content: [{ type: "text", text: userStory }] });
        const parsedStory = extractJson(rawStory, currentStage);
        sceneList = Array.isArray(parsedStory.scenes) ? parsedStory.scenes : [];
        if (sceneList.length === 0) throw Object.assign(new Error("AI không trả về cảnh nào. Vui lòng thử lại."), { stage: "empty" });
        if (sceneList.length > effectiveSceneCount) sceneList = sceneList.slice(0, effectiveSceneCount);
        while (sceneList.length < effectiveSceneCount) {
          sceneList.push({ setting: "", items: [] });
        }
        sceneList = sceneList.map((s) => ({ setting: s.setting || "", items: Array.isArray(s.items) ? s.items : [] }));
      }

      setScenes(
        sceneList.map((s) => ({
          ...s, dialogueVi: "", imagePrompt: "", veoPrompt: "",
          loading: true, failed: false, errorMessage: "",
        }))
      );
      setHasResult(true);

      /* STEP 3: Kịch bản — dialogue for every scene, in order (first result box) */
      currentStage = "Viết kịch bản song ngữ";
      setGenStage("dialogue");
      for (let i = 0; i < sceneList.length; i++) {
        setStepLabel(`Đang viết kịch bản — Cảnh ${i + 1}/${sceneList.length}...`);
        try {
          const dialogueVi = await generateDialogue(sceneList[i], i);
          sceneList[i] = { ...sceneList[i], dialogueVi };
          setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, dialogueVi } : s)));
        } catch (e) {
          setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: false, failed: true, errorMessage: friendlyError(e, `Cảnh ${i + 1}`) } : s)));
        }
      }

      /* STEP 4: Prompt tạo ảnh — for every scene (second result box) */
      currentStage = "Tạo Prompt ảnh";
      setGenStage("imagePrompts");
      for (let i = 0; i < sceneList.length; i++) {
        if (!sceneList[i].dialogueVi) continue; // skip scenes that failed in the previous stage
        setStepLabel(`Đang tạo Prompt ảnh — Cảnh ${i + 1}/${sceneList.length}...`);
        try {
          const imagePrompt = await generateImagePromptFor(sceneList[i], i, profileText, costumeRule);
          sceneList[i] = { ...sceneList[i], imagePrompt };
          setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, imagePrompt } : s)));
        } catch (e) {
          setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: false, failed: true, errorMessage: friendlyError(e, `Cảnh ${i + 1}`) } : s)));
        }
      }

      /* STEP 5: Prompt tạo video — for every scene, using the selected video style (third result box) */
      currentStage = "Tạo Prompt video";
      setGenStage("veoPrompts");
      for (let i = 0; i < sceneList.length; i++) {
        if (!sceneList[i].imagePrompt) continue;
        setStepLabel(`Đang tạo Prompt video — Cảnh ${i + 1}/${sceneList.length}...`);
        try {
          const veoPrompt = await generateVeoPromptFor(sceneList[i], i, videoStyle);
          sceneList[i] = { ...sceneList[i], veoPrompt };
          setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, veoPrompt, loading: false } : s)));
        } catch (e) {
          setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, loading: false, failed: true, errorMessage: friendlyError(e, `Cảnh ${i + 1}`) } : s)));
        }
      }
      setScenes((prev) => prev.map((s) => (s.failed ? s : { ...s, loading: false })));

      setGenStage("done");
      setStepLabel("Hoàn thành.");
    } catch (e) {
      console.error(`[Lỗi ở bước: ${currentStage}]`, e);
      setError(`Không thể hoàn tất bước "${currentStage}": ${friendlyError(e, currentStage)}`);
    } finally {
      setIsGenerating(false);
    }
  }

  /* ---------- result action bar ---------- */
  function buildScriptText() {
    return scenes.map((s, i) => `Scene ${i + 1} – ${s.setting}\n${s.dialogueVi}`).join("\n\n");
  }
  function buildVocabText() {
    return scenes
      .map((s, i) => `Cảnh ${i + 1}\n${(s.items || []).map((it) => `Từ tiếng Việt: ${it.vi}\nTiếng Anh: ${it.en}\nPhiên âm: ${it.ipa}`).join("\n")}`)
      .join("\n\n");
  }
  function buildImagePromptText() {
    return scenes.map((s, i) => `Cảnh ${i + 1}:\n${s.imagePrompt}`).join("\n\n");
  }
  function buildVideoPromptText() {
    return scenes.map((s, i) => `Cảnh ${i + 1}:\n${s.veoPrompt}`).join("\n\n");
  }
  async function saveData() {
    try {
      const lightScenes = scenes;
      localStorage.setItem(
        "hero-ai:last-lesson",
        JSON.stringify({ relationship, childName, topic, contentMode, customContent, sceneCount, aspect, videoStyle, scenes: lightScenes })
      );
    } catch (e) { /* ignore storage errors (e.g. quota exceeded) */ }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  }
  async function applyVideoStyle() {
    setIsGenerating(true);
    setStepLabel("Đang tạo lại Prompt video theo phong cách mới...");
    for (let i = 0; i < scenes.length; i++) {
      if (!scenes[i].imagePrompt) continue;
      setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, veoLoading: true } : s)));
      try {
        const veoPrompt = await generateVeoPromptFor(scenes[i], i, videoStyle);
        setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, veoPrompt, veoLoading: false } : s)));
      } catch (e) {
        setScenes((prev) => prev.map((s, idx) => (idx === i ? { ...s, veoLoading: false } : s)));
      }
    }
    setIsGenerating(false);
    setStepLabel("");
  }
  function buildFullExportText() {
    let out = `HERO AI VIDEO CREATOR — NỘI DUNG BÀI HỌC\n`;
    out += `Nhân vật: ${relOpt.roleA} & ${relOpt.roleB}${childName ? ` (${childName})` : ""}\n`;
    out += `Nội dung: ${contentMode === "custom" ? "Tự nhập" : `Chủ đề "${topic}"`} | Số cảnh: ${sceneCount} | Khổ ảnh: ${aspect}\n\n`;
    out += `===== KỊCH BẢN =====\n${buildScriptText()}\n\n`;
    out += `===== TỪ VỰNG =====\n${buildVocabText()}\n\n`;
    out += `===== PROMPT ẢNH =====\n${buildImagePromptText()}\n\n`;
    out += `===== PROMPT VIDEO =====\n${buildVideoPromptText()}\n`;
    return out;
  }
  function downloadAllText() {
    const blob = new Blob([buildFullExportText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bai-hoc.txt";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="hai-root" data-theme={theme}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .hai-root[data-theme="light"] {
          --bg:#F2F5FF; --bg-soft:#E9EEFF; --surface:#FFFFFF; --ink:#1E2145; --ink-soft:#5C6082; --ink-faint:#8C90AE;
          --primary:#7C5CFC; --primary-dark:#6544E0; --accent-yellow:#FFC145; --accent-coral:#FF6F91; --accent-mint:#2FBF71;
          --border:#E2E6FA; --shadow:0 10px 30px -12px rgba(60,60,130,0.18);
        }
        .hai-root[data-theme="dark"] {
          --bg:#12132A; --bg-soft:#1B1D3D; --surface:#1A1C3B; --ink:#F1F2FF; --ink-soft:#B7BADB; --ink-faint:#7C7FA8;
          --primary:#9B85FF; --primary-dark:#7C5CFC; --accent-yellow:#FFC145; --accent-coral:#FF7FA3; --accent-mint:#3FE08C;
          --border:#2C2E56; --shadow:0 10px 30px -12px rgba(0,0,0,0.5);
        }
        .hai-root { font-family:'Inter',system-ui,sans-serif; background: radial-gradient(circle at 8% 0%, rgba(124,92,252,0.10), transparent 45%), radial-gradient(circle at 95% 15%, rgba(255,193,69,0.12), transparent 40%), var(--bg); color:var(--ink); min-height:100vh; padding-bottom:100px; }
        .hai-root * { box-sizing: border-box; }

        .hai-header { padding:24px 20px 18px; text-align:center; position:relative; }
        .hai-theme-toggle { position:absolute; top:20px; right:16px; width:38px; height:38px; border-radius:50%; background:var(--surface); border:1px solid var(--border); color:var(--primary-dark); display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:var(--shadow); }
        .hai-badge { display:inline-flex; align-items:center; gap:6px; background:var(--surface); border:1px solid var(--border); color:var(--primary-dark); font-size:12px; font-weight:600; padding:5px 12px; border-radius:999px; margin-bottom:12px; box-shadow:var(--shadow); }
        .hai-title { font-family:'Baloo 2',sans-serif; font-weight:800; font-size:clamp(24px,5vw,36px); margin:0; background:linear-gradient(100deg,var(--primary) 10%,var(--accent-coral) 60%,var(--accent-yellow) 100%); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .hai-subtitle { color:var(--ink-soft); font-size:14px; margin:8px auto 0; max-width:560px; line-height:1.5; }

        .hai-container { max-width:820px; margin:0 auto; padding:0 16px; display:flex; flex-direction:column; gap:16px; }

        .hai-card { background:var(--surface); border:1px solid var(--border); border-radius:20px; box-shadow:var(--shadow); overflow:hidden; }
        .hai-card-head { display:flex; align-items:flex-start; gap:12px; padding:16px 18px 4px; }
        .hai-card-icon { flex-shrink:0; width:32px; height:32px; border-radius:9px; background:var(--bg-soft); color:var(--primary-dark); display:flex; align-items:center; justify-content:center; }
        .hai-card-title { font-family:'Baloo 2',sans-serif; font-weight:700; font-size:16px; margin:0; color:var(--ink); }
        .hai-card-subtitle { font-size:12px; color:var(--ink-faint); margin:2px 0 0; }
        .hai-card-body { padding:12px 18px 18px; }

        .hai-label { font-size:12.5px; font-weight:600; color:var(--ink-soft); margin-bottom:6px; display:block; }
        .hai-required { color:var(--accent-coral); margin-left:2px; }
        .hai-pill-group { display:flex; gap:8px; flex-wrap:wrap; }
        .hai-pill { border:1.5px solid var(--border); background:var(--bg); border-radius:999px; padding:8px 14px; font-size:12.5px; font-weight:600; cursor:pointer; color:var(--ink-soft); }
        .hai-pill.is-active { border-color:transparent; background:linear-gradient(135deg,var(--accent-coral),var(--primary)); color:white; }

        .hai-vocab-preview-box { border:1px solid var(--border); border-radius:12px; padding:11px 13px; background:var(--bg); margin-top:10px; }
        .hai-vocab-preview-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:8px; }
        .hai-vocab-preview-head b { font-family:'Baloo 2',sans-serif; font-size:12.5px; color:var(--primary-dark); }
        .hai-vocab-refresh-btn { display:inline-flex; align-items:center; gap:5px; background:var(--bg-soft); color:var(--primary-dark); border:none; font-size:11px; font-weight:600; padding:5px 10px; border-radius:999px; cursor:pointer; flex-shrink:0; }
        .hai-vocab-preview-list { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:5px; }
        .hai-vocab-preview-list li { font-size:12.5px; color:var(--ink); line-height:1.5; }
        .hai-vocab-ipa { color:var(--ink-faint); font-family:'JetBrains Mono',monospace; font-size:11.5px; }
        .hai-input, .hai-textarea, .hai-select { width:100%; border:1.5px solid var(--border); background:var(--bg); border-radius:11px; padding:9px 12px; font-size:14px; font-family:inherit; color:var(--ink); outline:none; }
        .hai-input:focus, .hai-textarea:focus, .hai-select:focus { border-color:var(--primary); box-shadow:0 0 0 3px rgba(124,92,252,0.15); background:var(--surface); }
        .hai-textarea { resize:vertical; min-height:70px; line-height:1.5; }
        .hai-field { margin-bottom:12px; }
        .hai-field:last-child { margin-bottom:0; }
        .hai-row2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .hai-row3 { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px; }
        @media (max-width:600px) { .hai-row2, .hai-row3 { grid-template-columns:1fr 1fr; } }
        .hai-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235C6082' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:30px; }
        .hai-hint { display:flex; gap:5px; align-items:flex-start; font-size:11px; color:var(--ink-faint); margin-top:5px; line-height:1.5; }
        .hai-field-error-text { display:flex; gap:5px; align-items:center; font-size:12px; color:#E0574A; font-weight:600; margin-top:6px; }
        .hai-input-error { border-color:#FF8A73 !important; box-shadow:0 0 0 3px rgba(255,111,145,0.15) !important; }

        .hai-upload-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media (max-width:480px) { .hai-upload-row { grid-template-columns:1fr; } }
        .hai-upload-box { position:relative; aspect-ratio:1/1; border:2px dashed var(--border); border-radius:14px; background:var(--bg); cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center; }
        .hai-upload-box:hover { border-color:var(--primary); }
        .hai-upload-box img { width:100%; height:100%; object-fit:cover; }
        .hai-upload-empty { display:flex; flex-direction:column; align-items:center; gap:6px; color:var(--ink-faint); font-size:12.5px; font-weight:600; }
        .hai-upload-remove { position:absolute; top:6px; right:6px; width:22px; height:22px; border-radius:50%; background:rgba(20,20,40,0.75); color:white; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; }

        .hai-guide-box { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); overflow:hidden; }
        .hai-guide-head { display:flex; align-items:center; gap:10px; padding:13px 16px; cursor:pointer; }
        .hai-guide-head strong { font-family:'Baloo 2',sans-serif; font-size:14px; flex:1; }
        .hai-guide-body { padding:0 16px 14px; font-size:12.5px; color:var(--ink-soft); line-height:1.7; }

        .hai-tip-box { display:flex; gap:8px; align-items:flex-start; background:var(--bg-soft); border:1px solid var(--border); color:var(--ink-soft); border-radius:11px; padding:9px 11px; font-size:12px; line-height:1.55; margin-top:10px; }

        .hai-generate-bar { position:sticky; bottom:0; left:0; right:0; padding:14px 16px calc(14px + env(safe-area-inset-bottom)); background:linear-gradient(to top, var(--bg) 55%, rgba(0,0,0,0)); margin-top:6px; }
        .hai-generate-inner { max-width:820px; margin:0 auto; }
        .hai-generate-btn { width:100%; border:none; border-radius:15px; padding:14px; font-family:'Baloo 2',sans-serif; font-weight:700; font-size:15px; color:white; background:linear-gradient(135deg,var(--primary),var(--accent-coral)); box-shadow:0 12px 24px -8px rgba(124,92,252,0.55); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
        .hai-generate-btn:disabled { opacity:.55; cursor:not-allowed; }

        .hai-error-banner { display:flex; gap:8px; align-items:flex-start; background:#3a1f1f22; border:1px solid #E0574A55; color:#E0574A; border-radius:11px; padding:10px 12px; font-size:13px; line-height:1.5; }
        .hai-progress { display:flex; align-items:center; gap:10px; font-size:13px; color:var(--primary-dark); font-weight:600; padding:10px 14px; background:var(--bg-soft); border-radius:11px; }
        .hai-spin { animation:hai-spin .9s linear infinite; }
        @keyframes hai-spin { to { transform:rotate(360deg); } }

        .hai-section-divider { display:flex; align-items:center; gap:10px; margin:4px 4px -2px; }
        .hai-section-divider .line { flex:1; height:1px; background:var(--border); }
        .hai-section-divider span { font-family:'Baloo 2',sans-serif; font-weight:700; font-size:12.5px; color:var(--ink-faint); text-transform:uppercase; letter-spacing:.04em; }

        .hai-result-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .hai-action-btn { display:inline-flex; align-items:center; gap:6px; border:none; font-size:12.5px; font-weight:700; padding:9px 14px; border-radius:999px; cursor:pointer; color:white; }
        .hai-action-btn.save { background:var(--accent-mint); }
        .hai-action-btn.download { background:#3AA0FF; }
        .hai-action-btn.vocab { background:var(--primary); }
        .hai-action-btn.imgprompt { background:var(--primary-dark); }
        .hai-action-btn.vidprompt { background:var(--accent-coral); }
        .hai-action-btn.is-copied, .hai-action-btn.is-saved { background:var(--accent-mint) !important; }

        .hai-script-text { font-size:13.5px; line-height:1.8; color:var(--ink); white-space:pre-wrap; }

        .hai-scene-card { border:1px solid var(--border); border-radius:16px; overflow:hidden; background:var(--surface); }
        .hai-scene-head { padding:12px 16px; display:flex; align-items:center; gap:10px; background:var(--bg-soft); }
        .hai-scene-num { flex-shrink:0; width:26px; height:26px; border-radius:9px; background:linear-gradient(135deg,var(--accent-coral),var(--primary)); color:white; font-family:'Baloo 2',sans-serif; font-weight:700; font-size:12px; display:flex; align-items:center; justify-content:center; }
        .hai-scene-title { font-weight:700; font-size:13.5px; }
        .hai-scene-body { padding:14px 16px; display:flex; flex-direction:column; gap:12px; }

        .hai-vocab-card { border:1px solid var(--border); border-radius:12px; padding:11px 13px; background:var(--bg); }
        .hai-vocab-card-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
        .hai-vocab-card-head b { font-family:'Baloo 2',sans-serif; font-size:12.5px; color:var(--primary-dark); }
        .hai-vocab-row { font-size:12.5px; line-height:1.7; }
        .hai-vocab-row b { color:var(--ink-soft); font-weight:600; }

        .hai-generate-image-btn { display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:white; border:none; font-size:12.5px; font-weight:700; padding:9px 16px; border-radius:999px; cursor:pointer; }

        .hai-prompt-block { background:var(--bg); border-radius:12px; padding:11px 13px; }
        .hai-prompt-block-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
        .hai-prompt-block-label { display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.03em; }
        .hai-prompt-text { font-family:'JetBrains Mono',monospace; font-size:11.5px; line-height:1.6; white-space:pre-wrap; word-break:break-word; color:var(--ink); margin:0; }
        .hai-skeleton-text { display:flex; align-items:center; gap:8px; color:var(--ink-faint); font-size:12px; padding:4px 0; }

        .hai-copy-btn { display:inline-flex; align-items:center; gap:6px; background:var(--bg-soft); color:var(--primary-dark); border:none; font-size:12px; font-weight:600; padding:6px 11px; border-radius:999px; cursor:pointer; }
        .hai-copy-btn.is-copied { background:var(--accent-mint); color:white; }

        .hai-scene-retry-box { display:flex; align-items:center; justify-content:space-between; gap:10px; background:#E0574A22; border:1px solid #E0574A55; color:#E0574A; border-radius:11px; padding:10px 12px; font-size:12px; }
        .hai-scene-retry-btn { display:inline-flex; align-items:center; gap:6px; flex-shrink:0; background:#E0574A; color:white; border:none; font-size:11.5px; font-weight:600; padding:6px 11px; border-radius:999px; cursor:pointer; }

        .hai-empty-hint { text-align:center; color:var(--ink-faint); font-size:12.5px; padding:26px 10px; }
      `}</style>

      <header className="hai-header">
        <button className="hai-theme-toggle" onClick={toggleTheme} title="Đổi giao diện sáng/tối">
          {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <span className="hai-badge"><Sparkles size={13} /> Công cụ tạo video giáo dục song ngữ</span>
        <h1 className="hai-title">Hero AI Video Creator</h1>
        <p className="hai-subtitle">Tải ảnh Cha/Con (hoặc Giáo viên/Học sinh), chọn chủ đề — AI viết kịch bản song ngữ, tạo Prompt ảnh/video cho từng cảnh.</p>
      </header>

      <div className="hai-container">
        <div className="hai-guide-box">
          <div className="hai-guide-head" onClick={() => setShowGuide((v) => !v)}>
            <HelpCircle size={17} color="var(--primary)" />
            <strong>Hướng dẫn nhanh</strong>
            {showGuide ? <ChevronUp size={17} color="var(--ink-faint)" /> : <ChevronDown size={17} color="var(--ink-faint)" />}
          </div>
          {showGuide && (
            <div className="hai-guide-body">
              <b>Bước 1.</b> Chọn mối quan hệ (Cha - Con trai, Giáo viên - Học sinh...) và tải lên ảnh của 2 nhân vật (mỗi người 1 ảnh rõ mặt).<br /><br />
              <b>Bước 2.</b> Chọn cách vào nội dung: bấm <b>"🎲 Chủ đề ngẫu nhiên"</b> để AI tự chọn từ vựng theo chủ đề, hoặc bấm <b>"✍️ Tự nhập nội dung"</b> nếu bạn muốn tự gõ đúng các từ mình cần dạy.<br /><br />
              <b>Bước 3.</b> Chọn Số cảnh, Khổ ảnh và Phong cách video mong muốn.<br /><br />
              <b>Bước 4.</b> Nhấn nút <b>"🎬 Tạo Nội Dung"</b> ở cuối trang và chờ AI xử lý (vài chục giây).<br /><br />
              <b>Bước 5.</b> Kết quả sẽ hiện lần lượt theo thứ tự: <b>Kịch bản</b> → <b>Prompt tạo ảnh</b> → <b>Prompt tạo video</b>. Với mỗi phần, bấm nút <b>"Sao chép"</b> rồi dán sang một công cụ AI tạo ảnh/video khác (ví dụ Midjourney, Veo 3) để tạo ra ảnh và video thật — app này chỉ soạn nội dung và prompt, không tự vẽ ảnh hay dựng video.
            </div>
          )}
        </div>

        {/* NHÂN VẬT */}
        <SectionCard icon={<Users size={16} />} title="Nhân vật" subtitle="Chọn mối quan hệ và tải ảnh 2 nhân vật">
          <div className="hai-row2">
            <div className="hai-field">
              <span className="hai-label">Mối quan hệ</span>
              <select className="hai-select" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {RELATIONSHIP_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="hai-field">
              <span className="hai-label">Tên bé</span>
              <input className="hai-input" placeholder="VD: Bi" value={childName} onChange={(e) => setChildName(e.target.value)} />
            </div>
          </div>
          <div className="hai-field">
            <span className="hai-label"><Shirt size={12} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} /> Trang phục</span>
            <select className="hai-select" value={costumeMode} onChange={(e) => setCostumeMode(e.target.value)}>
              {COSTUME_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {costumeMode === "custom" && (
            <div className="hai-field">
              <textarea className="hai-textarea" style={{ minHeight: 60 }} placeholder={`${relOpt.roleA}: ...\n${relOpt.roleB}: ...`} value={customCostume} onChange={(e) => setCustomCostume(e.target.value)} />
            </div>
          )}
          <div ref={imagesBlockRef} className={fieldErrors.images ? "hai-input-error" : ""} style={{ borderRadius: 14 }}>
            <div className="hai-upload-row">
              <UploadBox label={`Tải ảnh ${relOpt.roleA}`} image={imageA} inputRef={inputARef} onPick={(f) => pickImage(setImageA, f)} onRemove={() => setImageA(null)} />
              <UploadBox label={`Tải ảnh ${relOpt.roleB}`} image={imageB} inputRef={inputBRef} onPick={(f) => pickImage(setImageB, f)} onRemove={() => setImageB(null)} />
            </div>
          </div>
          {fieldErrors.images && (
            <div className="hai-field-error-text"><AlertCircle size={13} /> Vui lòng tải đủ ảnh cho cả 2 nhân vật.</div>
          )}
        </SectionCard>

        {/* THIẾT LẬP */}
        <SectionCard icon={<BookOpen size={16} />} title="Thiết lập nội dung">
          <div className="hai-field">
            <span className="hai-label">Nguồn nội dung</span>
            <div className="hai-pill-group">
              <div className={`hai-pill ${contentMode === "topic" ? "is-active" : ""}`} onClick={() => setContentMode("topic")}>🎲 Chủ đề ngẫu nhiên</div>
              <div className={`hai-pill ${contentMode === "custom" ? "is-active" : ""}`} onClick={() => setContentMode("custom")}>✍️ Tự nhập nội dung</div>
            </div>
          </div>

          {contentMode === "topic" ? (
            <div className="hai-field">
              <div className="hai-row2">
                <div>
                  <span className="hai-label">Chủ đề</span>
                  <select className="hai-select" value={topic} onChange={(e) => setTopic(e.target.value)}>
                    {TOPIC_LIST.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <span className="hai-label">Số từ vựng</span>
                  <select className="hai-select" value={topicWordCount} onChange={(e) => setTopicWordCount(Number(e.target.value))}>
                    {TOPIC_WORD_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n} từ</option>)}
                  </select>
                </div>
              </div>
              <div className="hai-hint"><Info size={11} /><span>AI sẽ chọn đúng {topicWordCount} từ vựng theo chủ đề này, hiển thị bên dưới. Kịch bản sẽ dùng đúng các từ này, theo đúng thứ tự.</span></div>

              <div className="hai-vocab-preview-box">
                <div className="hai-vocab-preview-head">
                  <b>📋 {topicWordCount} từ vựng — {topic}</b>
                  <button className="hai-vocab-refresh-btn" onClick={fetchTopicWords} disabled={topicWordsLoading}>
                    <RefreshCw size={11} className={topicWordsLoading ? "hai-spin" : ""} /> Lấy từ khác
                  </button>
                </div>
                {topicWordsLoading ? (
                  <div className="hai-skeleton-text"><Loader2 className="hai-spin" size={14} />Đang lấy từ vựng...</div>
                ) : topicWordsError ? (
                  <div className="hai-field-error-text"><AlertCircle size={13} /> {topicWordsError}</div>
                ) : topicWords.length > 0 ? (
                  <ol className="hai-vocab-preview-list">
                    {topicWords.map((w, i) => (
                      <li key={i}>
                        <b>{w.en}</b> <span className="hai-vocab-ipa">{w.ipa}</span> — {w.vi}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="hai-hint"><Info size={11} /><span>Chưa có từ vựng — bấm "Lấy từ khác" để tải.</span></div>
                )}
              </div>
            </div>
          ) : (
            <div className={`hai-field ${fieldErrors.customContent ? "hai-input-error" : ""}`} style={{ borderRadius: 12 }}>
              <span className="hai-label">
                Nội dung bài học của bạn <span className="hai-required">*</span>
              </span>
              <textarea
                className="hai-textarea"
                style={{ minHeight: 100, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
                placeholder={"bàn chải đánh răng\nkem đánh răng\nkhăn tắm\nxà phòng"}
                value={customContent}
                onChange={(e) => { setCustomContent(e.target.value); setFieldErrors((p) => ({ ...p, customContent: false })); }}
              />
              {fieldErrors.customContent ? (
                <div className="hai-field-error-text"><AlertCircle size={13} /> Vui lòng nhập ít nhất 1 từ/nội dung, mỗi dòng một từ.</div>
              ) : (
                <div className="hai-hint"><Info size={11} /><span>Mỗi dòng một từ (tiếng Việt hoặc tiếng Anh đều được). <b>AI chỉ dùng đúng các từ này, tuyệt đối không thêm nội dung khác.</b> Bạn tự chọn số cảnh ở ô bên dưới.</span></div>
              )}
            </div>
          )}

          <div className="hai-row3">
            <div className="hai-field">
              <span className="hai-label"><Layers size={12} style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} /> Số cảnh</span>
              <select className="hai-select" value={sceneCount} onChange={(e) => setSceneCount(Number(e.target.value))}>
                {SCENE_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {contentMode === "custom" && customWordList.length > 0 && customWordList.length !== sceneCount && (
                <div className="hai-hint">
                  <Info size={11} />
                  <span>
                    Bạn nhập {customWordList.length} từ, chọn {sceneCount} cảnh —{" "}
                    {customWordList.length > sceneCount
                      ? `AI sẽ gộp nhiều từ vào cùng 1 cảnh khi cần để dạy đủ cả ${customWordList.length} từ, không bỏ từ nào.`
                      : `AI sẽ thêm cảnh ôn tập bằng cách lặp lại các từ đã có (không thêm từ mới).`}
                  </span>
                </div>
              )}
            </div>
            <div className="hai-field">
              <span className="hai-label"><Ratio size={12} style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} /> Khổ ảnh</span>
              <select className="hai-select" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                {ASPECT_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="hai-field">
              <span className="hai-label"><Film size={12} style={{ display: "inline", marginRight: 3, verticalAlign: -2 }} /> Phong cách video</span>
              <select className="hai-select" value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)}>
                {VIDEO_STYLE_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="hai-hint"><Info size={11} /><span>"Khổ ảnh" được ghi vào Prompt tạo ảnh để bạn dán sang công cụ tạo ảnh AI khác. "Phong cách video" ảnh hưởng tới cách viết Prompt video — có thể đổi và tạo lại sau khi đã có kết quả.</span></div>
        </SectionCard>

        {error && <div className="hai-error-banner"><AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /><span>{error}</span></div>}
        {isGenerating && <div className="hai-progress"><Loader2 className="hai-spin" size={16} />{stepLabel}</div>}

        {hasResult && (
          <>
            <div className="hai-section-divider"><div className="line" /><span>Kết quả</span><div className="line" /></div>

            <div className="hai-card" style={{ padding: 16 }}>
              <div className="hai-result-actions">
                <button className={`hai-action-btn save ${savedFlash ? "is-saved" : ""}`} onClick={saveData}>
                  {savedFlash ? <Check size={13} /> : <Save size={13} />} {savedFlash ? "Đã lưu" : "Lưu Data"}
                </button>
                <CopyBucketButton className="hai-action-btn vocab" icon={<BookOpen size={13} />} label="Copy Vocabulary" text={buildVocabText()} />
                <CopyBucketButton className="hai-action-btn imgprompt" icon={<ImageIcon size={13} />} label="Copy Image Prompt" text={buildImagePromptText()} />
                <CopyBucketButton className="hai-action-btn vidprompt" icon={<Video size={13} />} label="Copy Video Prompt" text={buildVideoPromptText()} />
                <button className="hai-action-btn download" onClick={downloadAllText}><Download size={13} /> Tải Toàn Bộ (.txt)</button>
              </div>
              {isGenerating && (
                <div className="hai-hint" style={{ marginTop: 10 }}>
                  <Info size={11} />
                  <span>AI vẫn đang tạo nội dung — các nút sao chép/tải phía trên có thể chưa đầy đủ cho tới khi hoàn tất.</span>
                </div>
              )}
            </div>

            {/* KHỐI 1: KỊCH BẢN */}
            <SectionCard icon={<Film size={16} />} title="1️⃣ Kịch bản" subtitle="Chia theo cảnh, kèm hội thoại song ngữ" right={<CopyButton text={buildScriptText()} />}>
              {scenes.map((scene, i) => (
                <div key={i} style={{ marginBottom: i < scenes.length - 1 ? 14 : 0 }}>
                  <div className="hai-scene-title" style={{ marginBottom: 4 }}>Scene {i + 1} – {scene.setting}</div>
                  {scene.failed ? (
                    <div className="hai-scene-retry-box">
                      <span>{scene.errorMessage || "Không tạo được kịch bản cho cảnh này."}</span>
                      <button className="hai-scene-retry-btn" onClick={() => retryScene(i)}><RefreshCw size={11} /> Thử lại</button>
                    </div>
                  ) : scene.dialogueVi ? (
                    <p className="hai-script-text">{scene.dialogueVi}</p>
                  ) : (
                    <div className="hai-skeleton-text"><Loader2 className="hai-spin" size={14} />Đang viết kịch bản...</div>
                  )}
                </div>
              ))}
            </SectionCard>

            {/* KHỐI 2: PROMPT TẠO ẢNH */}
            {genStage !== "skeleton" && genStage !== "dialogue" && (
              <SectionCard icon={<ImageIcon size={16} />} title="2️⃣ Prompt tạo ảnh" subtitle="Một prompt chi tiết cho mỗi cảnh — dán sang công cụ tạo ảnh AI khác" right={<CopyButton text={buildImagePromptText()} />}>
                {scenes.map((scene, i) => (
                  <div className="hai-prompt-block" key={i} style={{ marginBottom: i < scenes.length - 1 ? 10 : 0 }}>
                    <div className="hai-prompt-block-head">
                      <span className="hai-prompt-block-label">Cảnh {i + 1}</span>
                      {scene.imagePrompt && <CopyButton text={scene.imagePrompt} />}
                    </div>
                    {scene.failed ? (
                      <span style={{ fontSize: 12, color: "#E0574A" }}>{scene.errorMessage}</span>
                    ) : scene.imagePrompt ? (
                      <pre className="hai-prompt-text">{scene.imagePrompt}</pre>
                    ) : (
                      <div className="hai-skeleton-text"><Loader2 className="hai-spin" size={14} />Đang tạo...</div>
                    )}
                  </div>
                ))}
              </SectionCard>
            )}

            {/* KHỐI 3: PROMPT TẠO VIDEO */}
            {genStage !== "skeleton" && genStage !== "dialogue" && genStage !== "imagePrompts" && (
              <SectionCard
                icon={<Video size={16} />}
                title="3️⃣ Prompt tạo video"
                subtitle="Một prompt Veo 3 cho mỗi cảnh, theo phong cách đã chọn"
                right={<CopyButton text={buildVideoPromptText()} />}
              >
                <div className="hai-field" style={{ marginBottom: 14 }}>
                  <span className="hai-label">Phong cách video</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <select className="hai-select" style={{ flex: 1, minWidth: 180 }} value={videoStyle} onChange={(e) => setVideoStyle(e.target.value)}>
                      {VIDEO_STYLE_OPTIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                    <button className="hai-generate-image-btn" onClick={applyVideoStyle} disabled={isGenerating}>
                      <Wand2 size={13} /> Tạo lại theo phong cách này
                    </button>
                  </div>
                </div>
                {scenes.map((scene, i) => (
                  <div className="hai-prompt-block" key={i} style={{ marginBottom: i < scenes.length - 1 ? 10 : 0 }}>
                    <div className="hai-prompt-block-head">
                      <span className="hai-prompt-block-label">Cảnh {i + 1}</span>
                      {scene.veoPrompt && <CopyButton text={scene.veoPrompt} />}
                    </div>
                    {scene.failed ? (
                      <span style={{ fontSize: 12, color: "#E0574A" }}>{scene.errorMessage}</span>
                    ) : scene.veoLoading ? (
                      <div className="hai-skeleton-text"><Loader2 className="hai-spin" size={14} />Đang tạo lại...</div>
                    ) : scene.veoPrompt ? (
                      <pre className="hai-prompt-text">{scene.veoPrompt}</pre>
                    ) : (
                      <div className="hai-skeleton-text"><Loader2 className="hai-spin" size={14} />Đang tạo...</div>
                    )}
                  </div>
                ))}
              </SectionCard>
            )}
          </>
        )}

        {!hasResult && !isGenerating && <div className="hai-empty-hint">Điền thông tin phía trên rồi nhấn <strong>"🎬 Tạo Nội Dung"</strong>.</div>}
      </div>

      <div className="hai-generate-bar">
        <div className="hai-generate-inner">
          <button className="hai-generate-btn" disabled={isGenerating} onClick={generateContent}>
            {isGenerating ? <Loader2 className="hai-spin" size={18} /> : <Sparkles size={18} />}
            {isGenerating ? "Đang tạo..." : "🎬 Tạo Nội Dung"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyBucketButton({ className, icon, label, text }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const ok = await copyToClipboard(text);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  };
  return (
    <button className={`${className} ${copied ? "is-copied" : ""}`} onClick={onClick}>
      {copied ? <Check size={13} /> : icon} {copied ? "Đã sao chép" : label}
    </button>
  );
}
