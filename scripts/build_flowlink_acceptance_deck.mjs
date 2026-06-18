import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "file:///C:/Users/sikad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const root = "C:/Users/sikad/Desktop/FlowLink";
const outputDir = path.join(root, "outputs");
const qaDir = path.join(root, "outputs", "qa-flowlink-materials");
const finalPptx = path.join(outputDir, "FlowLink即时通讯系统项目展示与验收答辩_新版.pptx");

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(qaDir, { recursive: true });

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

const C = {
  ink: "#16202A",
  muted: "#667085",
  soft: "#F4F7FA",
  line: "#DDE5EC",
  white: "#FFFFFF",
  green: "#07C160",
  greenDark: "#059B4F",
  blue: "#2F80ED",
  violet: "#7C3AED",
  orange: "#F97316",
  red: "#F04438",
  navy: "#132236",
  mint: "#E8F7EF",
  blueSoft: "#E8F1FF",
  amberSoft: "#FFF4D8"
};

const page = { left: 58, top: 46, width: 1164, height: 628 };

function addText(slide, text, x, y, w, h, style = {}) {
  const box = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 }
  });
  box.text = text;
  box.text.style = {
    typeface: style.typeface || "Aptos",
    fontSize: style.fontSize ?? 20,
    bold: style.bold ?? false,
    color: style.color || C.ink,
    ...style
  };
  return box;
}

function addRect(slide, x, y, w, h, fill = C.white, line = C.line, radius = "rounded-lg") {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: 1 },
    borderRadius: radius
  });
}

function addPill(slide, text, x, y, w, fill, color = C.ink) {
  addRect(slide, x, y, w, 32, fill, fill, "rounded-full");
  addText(slide, text, x + 12, y + 6, w - 24, 20, { fontSize: 12, bold: true, color });
}

function addTitle(slide, kicker, title, subtitle = "") {
  addText(slide, kicker, page.left, 42, 560, 24, { fontSize: 12, bold: true, color: C.greenDark });
  addText(slide, title, page.left, 78, 760, 86, { fontSize: 38, bold: true, color: C.ink, typeface: "Aptos Display" });
  if (subtitle) addText(slide, subtitle, page.left, 158, 860, 50, { fontSize: 18, color: C.muted });
}

function addFooter(slide, index) {
  addText(slide, "FlowLink 即时通讯系统 · 项目验收答辩", page.left, 690, 420, 18, { fontSize: 10, color: "#98A2B3" });
  addText(slide, String(index).padStart(2, "0"), 1180, 688, 40, 20, { fontSize: 12, bold: true, color: "#98A2B3" });
}

function addBullets(slide, items, x, y, w, gap = 48) {
  items.forEach((item, i) => {
    const title = Array.isArray(item) ? item[0] : item.title;
    const desc = Array.isArray(item) ? item[1] : item.desc;
    const top = y + i * gap;
    addRect(slide, x, top + 2, 28, 28, C.mint, C.mint, "rounded-md");
    addText(slide, String(i + 1), x, top + 8, 28, 18, { fontSize: 12, bold: true, color: C.greenDark, align: "center" });
    addText(slide, title, x + 42, top, w - 42, 24, { fontSize: 17, bold: true, color: C.ink });
    if (desc) addText(slide, desc, x + 42, top + 25, w - 42, 34, { fontSize: 13, color: C.muted });
  });
}

function screenshotSlot(slide, x, y, w, h, label = "实际效果截图占位") {
  addRect(slide, x, y, w, h, "#FBFCFE", "#C9D5E1", "rounded-lg");
  slide.shapes.add({
    geometry: "rect",
    position: { left: x + 14, top: y + 14, width: w - 28, height: h - 28 },
    fill: "none",
    line: { style: "dash", fill: "#B8C4D2", width: 1 }
  });
  addText(slide, label, x + 28, y + h / 2 - 18, w - 56, 36, { fontSize: 18, bold: true, color: "#8A98A8", align: "center" });
}

function slideCover() {
  const s = deck.slides.add();
  s.background.fill = C.navy;
  addRect(s, 770, 92, 360, 500, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.14)", "rounded-xl");
  for (let i = 0; i < 6; i++) {
    const y = 132 + i * 68;
    addRect(s, 806 + (i % 2) * 44, y, 232, 42, i % 2 ? C.green : "#F2F6FA", i % 2 ? C.green : "#F2F6FA", "rounded-lg");
    addRect(s, 1054 - (i % 2) * 278, y + 4, 34, 34, i % 2 ? "#DDF8E8" : C.blue, "none", "rounded-md");
  }
  addPill(s, "项目验收 · 课程设计 · 新版功能展示", 68, 62, 260, "rgba(7,193,96,0.14)", "#8FF0BD");
  addText(s, "FlowLink", 68, 160, 620, 78, { fontSize: 66, bold: true, color: C.white, typeface: "Aptos Display" });
  addText(s, "即时通讯系统项目展示与验收答辩", 72, 246, 760, 52, { fontSize: 32, bold: true, color: "#D9E7F4" });
  addText(s, "从基础聊天 Demo 演进到支持群管理、通知中心、文件能力、语音/视频通话、AI 助手、移动端 APK 与个性化主题的综合通信平台。", 72, 324, 650, 88, { fontSize: 20, color: "#BFD0E0" });
  addRect(s, 70, 470, 160, 76, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
  addText(s, "Vue 3", 92, 488, 120, 22, { fontSize: 20, bold: true, color: C.white });
  addText(s, "+ Pinia", 92, 516, 120, 18, { fontSize: 13, color: "#BFD0E0" });
  addRect(s, 248, 470, 190, 76, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
  addText(s, "Spring Boot", 270, 488, 150, 22, { fontSize: 20, bold: true, color: C.white });
  addText(s, "+ Netty + MySQL", 270, 516, 150, 18, { fontSize: 13, color: "#BFD0E0" });
  addRect(s, 456, 470, 190, 76, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
  addText(s, "Android APK", 478, 488, 150, 22, { fontSize: 20, bold: true, color: C.white });
  addText(s, "+ WebRTC", 478, 516, 150, 18, { fontSize: 13, color: "#BFD0E0" });
  addText(s, "答辩人：项目小组    日期：2026 年 6 月", 72, 650, 560, 22, { fontSize: 15, color: "#9FB2C7" });
}

function slideAgenda(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "AGENDA", "汇报结构", "围绕“需求-架构-功能-亮点-反思”展开，突出项目从 Demo 到可演示系统的演进过程。");
  const items = [
    { title: "项目定位与需求目标", desc: "在线聊天平台、移动端可用、群聊协作、文件与通知管理" },
    { title: "系统架构与数据库设计", desc: "Vue 3 + Spring Boot + Netty + MySQL/Redis/MinIO 的分层实现" },
    { title: "核心功能与新增亮点", desc: "群管理、AI 助手、语音/视频、个性化主题、Android APK" },
    { title: "测试验证与项目反思", desc: "启动、构建、同步 APK、权限问题与后续优化方向" }
  ];
  addBullets(s, items, 96, 245, 930, 82);
  addFooter(s, i);
}

function slidePositioning(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "PROJECT", "项目定位：面向课程验收的在线即时通讯平台", "FlowLink 的目标不是停留在页面原型，而是形成可登录、可聊天、可管理、可移动端演示的综合系统。");
  const cards = [
    ["基础通信", "私聊、群聊、历史消息、未读提醒、右键消息操作"],
    ["群组协作", "建群、邀人、群公告、群主/管理员、禁言、退群/解散"],
    ["多媒体能力", "图片/文件上传、预览下载、语音消息、局域网视频通话"],
    ["体验升级", "通知中心、个人中心、头像上传、主题色、聊天背景"]
  ];
  cards.forEach(([title, desc], idx) => {
    const x = 78 + (idx % 2) * 570;
    const y = 250 + Math.floor(idx / 2) * 150;
    addRect(s, x, y, 520, 116, idx === 0 ? C.mint : idx === 1 ? C.blueSoft : idx === 2 ? "#F3EAFE" : "#FFF4E8", "none");
    addText(s, title, x + 26, y + 24, 210, 28, { fontSize: 23, bold: true, color: C.ink });
    addText(s, desc, x + 26, y + 62, 448, 36, { fontSize: 15, color: C.muted });
  });
  addFooter(s, i);
}

function slideArchitecture(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "ARCHITECTURE", "总体架构：前后端分层 + 实时网关 + 数据持久化", "项目按照设计方案逐步从单文件 Demo 迁移到清晰的服务端分层和可扩展前端结构。");
  const layers = [
    ["客户端层", "Vue 3 + Pinia\nWeb / Android APK\n响应式布局与个性化主题", C.mint],
    ["接口服务层", "Spring Boot Controller\nAuth / Message / Group / File / AI Service\n统一响应与业务校验", C.blueSoft],
    ["实时通信层", "Netty 4.1 WebSocket 网关\n在线状态、消息推送、视频通话信令", "#F3EAFE"],
    ["数据与存储层", "MySQL Mapper/DAO\nRedis 在线状态/未读数/会话令牌\nMinIO 对象存储", "#FFF4E8"]
  ];
  layers.forEach(([title, desc, fill], idx) => {
    const x = 78 + idx * 292;
    addRect(s, x, 258, 250, 235, fill, "none");
    addText(s, title, x + 22, 282, 206, 30, { fontSize: 22, bold: true, color: C.ink });
    addText(s, desc, x + 22, 334, 206, 118, { fontSize: 15, color: C.muted });
    if (idx < layers.length - 1) addText(s, "→", x + 262, 352, 38, 40, { fontSize: 34, bold: true, color: "#98A2B3", align: "center" });
  });
  addFooter(s, i);
}

function slideDatabase(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "DATA MODEL", "数据库与存储：围绕会话、成员、文件和通知建模", "数据库设计从简单演示数据升级为可持久化、可扩展的业务数据结构。");
  const tables = [
    ["user", "账号、昵称、头像、邮箱、状态"],
    ["friendship", "好友关系、拉黑与删除"],
    ["chat_group", "群资料、公告、群主、全员禁言"],
    ["group_member", "成员角色、群昵称、禁言状态"],
    ["message", "私聊/群聊消息、撤回、已读、文件引用"],
    ["file_record", "文件元数据、访问地址、对象存储路径"],
    ["notification", "好友申请、群邀请、禁言/管理员通知"],
    ["Redis", "在线状态、未读数、会话令牌"]
  ];
  tables.forEach(([name, desc], idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const x = 76 + col * 285;
    const y = 262 + row * 132;
    addRect(s, x, y, 242, 96, row === 0 ? "#F8FBF9" : "#F7F9FD", C.line);
    addText(s, name, x + 18, y + 16, 200, 22, { fontSize: 20, bold: true, color: col === 3 ? C.orange : C.greenDark });
    addText(s, desc, x + 18, y + 50, 200, 30, { fontSize: 13, color: C.muted });
  });
  addFooter(s, i);
}

function slideFeatureMap(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "FEATURES", "功能矩阵：从基础聊天到完整协作体验", "当前版本已经覆盖课程需求中的核心链路，并在体验与演示效果上做了多轮增强。");
  const rows = [
    ["账号体系", "登录、注册、退出登录、可选自动登录、个人资料修改"],
    ["聊天体验", "消息发送、引用回复、撤回/删除、搜索高亮、历史分页"],
    ["群聊管理", "群公告、邀请/移除、管理员、禁言、全员禁言、退群/解散"],
    ["通知中心", "好友申请、入群邀请、管理员变更、禁言通知、快速处理"],
    ["文件与媒体", "图片/文件上传、预览下载、语音消息、图片缩略图"],
    ["移动与视频", "Android APK、局域网 WebRTC 视频通话、相机/麦克风权限处理"]
  ];
  rows.forEach(([a, b], idx) => {
    const y = 230 + idx * 62;
    addRect(s, 86, y, 220, 44, idx % 2 ? C.blueSoft : C.mint, "none");
    addText(s, a, 106, y + 12, 160, 20, { fontSize: 17, bold: true, color: C.ink });
    addRect(s, 324, y, 820, 44, C.white, C.line);
    addText(s, b, 344, y + 12, 780, 20, { fontSize: 15, color: C.muted });
  });
  addFooter(s, i);
}

function slideChatExperience(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "CHAT UX", "聊天体验：更接近真实 IM 的操作细节", "消息区、输入区、右键菜单和会话列表都围绕高频使用场景持续打磨。");
  screenshotSlot(s, 714, 212, 430, 330, "插入聊天界面截图");
  addBullets(s, [
    { title: "消息右键菜单", desc: "撤回、回复、删除集中在右键菜单，降低界面噪声" },
    { title: "会话管理", desc: "支持置顶、隐藏、未读提示，消息栏与通讯录职责分离" },
    { title: "群昵称显示规则", desc: "群昵称只影响群聊消息与群成员列表，不污染私聊和通讯录" },
    { title: "输入区优化", desc: "表情、语音、文件、图片与发送按钮位置更清晰" }
  ], 88, 232, 560, 72);
  addFooter(s, i);
}

function slideGroup(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "GROUP", "群聊能力：从“能聊天”到“能管理”", "群聊模块围绕课程需求补齐成员治理、角色区分、禁言与群资料维护。");
  screenshotSlot(s, 76, 230, 470, 330, "插入群管理面板截图");
  const items = [
    ["角色标识", "群主/管理员在成员列表与聊天消息中显示身份徽标"],
    ["群昵称", "仅作用于当前群聊消息与群成员列表，账号昵称保持独立"],
    ["成员治理", "邀请成员、移除成员、设置管理员、转让群主"],
    ["发言控制", "成员禁言、解除禁言、全员禁言，并联动发送校验"]
  ];
  items.forEach(([t, d], idx) => {
    const y = 238 + idx * 78;
    addRect(s, 604, y, 510, 58, idx === 0 ? C.amberSoft : C.white, idx === 0 ? C.amberSoft : C.line);
    addText(s, t, 626, y + 12, 120, 22, { fontSize: 18, bold: true, color: C.ink });
    addText(s, d, 760, y + 14, 320, 22, { fontSize: 14, color: C.muted });
  });
  addFooter(s, i);
}

function slideMedia(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "MEDIA", "文件、语音与视频：增强课程项目的演示完整度", "媒体能力让 FlowLink 不只是文字聊天，也能展示更完整的即时通信体验。");
  const cards = [
    ["文件能力", "文件上传、元数据保存、预览、下载、图片缩略图", C.blueSoft],
    ["语音消息", "浏览器/Android 麦克风授权、录音、上传、播放", C.mint],
    ["局域网视频", "WebRTC 建连，Netty 转发信令，视频流点对点传输", "#F3EAFE"]
  ];
  cards.forEach(([t, d, fill], idx) => {
    const x = 86 + idx * 372;
    addRect(s, x, 260, 320, 210, fill, "none");
    addText(s, t, x + 28, 292, 260, 34, { fontSize: 26, bold: true, color: C.ink });
    addText(s, d, x + 28, 348, 250, 70, { fontSize: 16, color: C.muted });
    addPill(s, idx === 2 ? "LAN Demo" : "可演示", x + 28, 430, 100, C.white, C.greenDark);
  });
  addFooter(s, i);
}

function slideAI(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "AI ASSISTANT", "AI 助手：默认进入通讯录的智能对话对象", "AI 功能让系统从传统 IM 扩展到“辅助答疑、总结、开发协作”的智能通信场景。");
  addRect(s, 96, 244, 480, 310, C.white, C.line);
  addText(s, "AI 助手接入方式", 128, 274, 260, 30, { fontSize: 25, bold: true, color: C.ink });
  addBullets(s, [
    { title: "默认联系人", desc: "所有用户通讯录中默认存在 AI 助手" },
    { title: "后端服务封装", desc: "通过 AiAssistantService 调用外部模型接口" },
    { title: "消息链路复用", desc: "私聊发送后自动生成 AI 回复消息" }
  ], 128, 326, 380, 66);
  addRect(s, 650, 244, 430, 310, "#111827", "#111827");
  addText(s, "AI", 696, 292, 86, 72, { fontSize: 64, bold: true, color: C.green });
  addText(s, "可用于：\n- 课程答辩问题准备\n- 功能说明润色\n- Bug 定位思路\n- 项目总结反思", 800, 296, 220, 170, { fontSize: 20, color: "#D9E7F4" });
  addFooter(s, i);
}

function slidePersonalization(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "PERSONALIZATION", "个性化体验：让项目更像真实产品", "新增主题色、头像、本地上传、聊天背景和手机端布局优化，提升项目展示的完成度。");
  screenshotSlot(s, 708, 216, 420, 330, "插入个人中心/主题设置截图");
  const chips = [
    ["主题色", C.green], ["头像上传", C.blue], ["聊天背景", C.violet], ["手机端适配", C.orange], ["APK 权限处理", C.red]
  ];
  chips.forEach(([t, color], idx) => {
    const x = 96 + (idx % 2) * 250;
    const y = 248 + Math.floor(idx / 2) * 82;
    addRect(s, x, y, 220, 54, "#F8FAFC", C.line);
    addRect(s, x + 18, y + 15, 24, 24, color, color, "rounded-full");
    addText(s, t, x + 54, y + 16, 140, 22, { fontSize: 17, bold: true, color: C.ink });
  });
  addFooter(s, i);
}

function slideMobile(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "MOBILE", "Android APK：把 Web 项目推进到真实手机演示", "通过 Capacitor 将 Vue 前端打包为 Android 应用，并处理局域网访问、摄像头/麦克风权限和退出登录入口。");
  const steps = [
    ["1", "npm run build", "构建 Vue 前端"],
    ["2", "npx cap sync android", "同步到 Android 工程"],
    ["3", "Android Studio Build APK", "生成安装包"],
    ["4", "同一局域网使用", "连接本机后端服务"]
  ];
  steps.forEach(([n, cmd, desc], idx) => {
    const y = 232 + idx * 78;
    addRect(s, 104, y, 68, 52, C.green, C.green);
    addText(s, n, 104, y + 12, 68, 26, { fontSize: 24, bold: true, color: C.white, align: "center" });
    addRect(s, 190, y, 880, 52, C.white, C.line);
    addText(s, cmd, 216, y + 12, 330, 22, { fontSize: 19, bold: true, color: C.ink });
    addText(s, desc, 568, y + 15, 420, 20, { fontSize: 15, color: C.muted });
  });
  addFooter(s, i);
}

function slideTesting(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "VALIDATION", "测试验证：围绕可运行、可持久化、可演示进行检查", "项目迭代过程中持续使用构建、编译、前后端联调和手机端安装验证来降低演示风险。");
  const checks = [
    ["前端构建", "npm.cmd run build 多次通过"],
    ["后端编译", "Maven compile 验证 Spring Boot 代码"],
    ["实时通信", "Netty WebSocket 心跳、消息推送、通话信令"],
    ["数据持久化", "MySQL 保存用户、消息、群成员、文件元数据"],
    ["对象存储", "MinIO 保存文件内容，消息表只存元数据与地址"],
    ["移动端", "APK 安装、服务器地址配置、运行时权限授权"]
  ];
  checks.forEach(([a, b], idx) => {
    const x = 86 + (idx % 2) * 540;
    const y = 230 + Math.floor(idx / 2) * 96;
    addRect(s, x, y, 486, 70, "#F8FAFC", C.line);
    addText(s, "✓", x + 20, y + 20, 28, 26, { fontSize: 24, bold: true, color: C.green });
    addText(s, a, x + 64, y + 14, 160, 22, { fontSize: 18, bold: true, color: C.ink });
    addText(s, b, x + 64, y + 40, 360, 18, { fontSize: 13, color: C.muted });
  });
  addFooter(s, i);
}

function slideDifficulties(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "CHALLENGES", "重点难点：项目不止写页面，更要打通完整链路", "难点集中在实时性、权限、状态同步、群聊规则和移动端差异。");
  const items = [
    ["实时消息去重", "发送方本地回显与 WebSocket 推送需要通过 clientId/id 合并，避免一条消息显示两次。"],
    ["禁言实际生效", "不能只做 UI 开关，后端发送接口必须检查群成员禁言与全员禁言状态。"],
    ["群昵称边界", "群昵称只影响当前群，不应污染通讯录、私聊和账号资料。"],
    ["视频通话权限", "Android WebView 需要 CAMERA、RECORD_AUDIO、MODIFY_AUDIO_SETTINGS 共同满足。"],
    ["移动端布局", "桌面端三栏结构需要在手机端自动切换为底部导航和单页视图。"]
  ];
  addBullets(s, items, 92, 218, 990, 82);
  addFooter(s, i);
}

function slideReflection(i) {
  const s = deck.slides.add();
  s.background.fill = C.white;
  addTitle(s, "REFLECTION", "项目总结反思：从“功能堆叠”走向“产品闭环”", "本项目最大的收获，是把需求分析、设计方案、数据库、后端服务、前端体验和移动端打包串成一条完整工程链路。");
  const cols = [
    ["项目优势", ["功能覆盖较完整", "前后端分层清晰", "支持移动端真实安装", "具备个性化与 AI 亮点"]],
    ["不足与改进", ["部分旧页面文本仍需继续清理", "群视频与 TURN 中继尚未完成", "自动化测试覆盖仍可提高", "权限和部署说明需继续标准化"]],
    ["后续方向", ["完善接口测试与单元测试", "增加生产部署脚本", "加入推送通知与消息加密", "扩展多人音视频会议"]]
  ];
  cols.forEach(([title, arr], idx) => {
    const x = 80 + idx * 382;
    addRect(s, x, 248, 330, 310, idx === 0 ? C.mint : idx === 1 ? "#FFF4E8" : C.blueSoft, "none");
    addText(s, title, x + 26, 278, 240, 28, { fontSize: 24, bold: true, color: C.ink });
    arr.forEach((line, j) => {
      addText(s, "•", x + 30, 332 + j * 45, 18, 20, { fontSize: 18, bold: true, color: C.greenDark });
      addText(s, line, x + 54, 332 + j * 45, 230, 22, { fontSize: 15, color: C.ink });
    });
  });
  addFooter(s, i);
}

function slideDemo(i) {
  const s = deck.slides.add();
  s.background.fill = C.soft;
  addTitle(s, "DEMO FLOW", "建议演示路径：7 分钟展示项目完成度", "答辩时建议按一条清晰链路演示，避免在细节页面来回跳转。");
  const flow = ["登录/注册", "私聊发消息", "群聊管理", "文件与语音", "视频通话", "AI 助手", "个人中心"];
  flow.forEach((text, idx) => {
    const x = 74 + idx * 158;
    addRect(s, x, 300, 126, 74, idx === 0 ? C.green : C.white, idx === 0 ? C.green : C.line);
    addText(s, text, x + 12, 326, 102, 22, { fontSize: 16, bold: true, color: idx === 0 ? C.white : C.ink, align: "center" });
    if (idx < flow.length - 1) addText(s, "→", x + 130, 318, 28, 30, { fontSize: 24, bold: true, color: "#98A2B3" });
  });
  addText(s, "演示提醒：先确保 Docker/MySQL/Redis/MinIO 与后端已启动；手机端需填写电脑局域网 IP；视频通话双方需在同一 Wi-Fi。", 126, 450, 980, 46, { fontSize: 18, color: C.muted, align: "center" });
  addFooter(s, i);
}

function slideEnd(i) {
  const s = deck.slides.add();
  s.background.fill = C.navy;
  addText(s, "THANKS", 76, 70, 220, 28, { fontSize: 13, bold: true, color: "#8FF0BD" });
  addText(s, "FlowLink", 76, 188, 500, 74, { fontSize: 64, bold: true, color: C.white, typeface: "Aptos Display" });
  addText(s, "一个从课程需求出发、逐步演进为可运行、可演示、可扩展的即时通讯系统。", 80, 286, 690, 58, { fontSize: 24, color: "#D9E7F4" });
  addRect(s, 80, 420, 260, 88, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.12)");
  addText(s, "项目特点", 106, 442, 180, 22, { fontSize: 18, bold: true, color: C.white });
  addText(s, "完整链路 · 真实移动端 · 实时通信 · 可扩展架构", 106, 470, 210, 28, { fontSize: 12, color: "#BFD0E0" });
  addText(s, "欢迎老师和同学提问", 80, 620, 400, 34, { fontSize: 26, bold: true, color: C.green });
  addFooter(s, i);
}

[
  slideCover,
  slideAgenda,
  slidePositioning,
  slideArchitecture,
  slideDatabase,
  slideFeatureMap,
  slideChatExperience,
  slideGroup,
  slideMedia,
  slideAI,
  slidePersonalization,
  slideMobile,
  slideTesting,
  slideDifficulties,
  slideReflection,
  slideDemo,
  slideEnd
].forEach((fn, idx) => fn(idx + 1));

for (const [index, slide] of deck.slides.items.entries()) {
  const stem = `flowlink-slide-${String(index + 1).padStart(2, "0")}`;
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(qaDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(qaDir, `${stem}.layout.json`), await layout.text());
}
const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(path.join(qaDir, "flowlink-deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(finalPptx);

await fs.writeFile(
  path.join(qaDir, "source-notes.txt"),
  [
    "FlowLink project acceptance deck source notes",
    "Sources: current local FlowLink repository implementation and user-described feature requirements in this Codex thread.",
    "No external statistics or third-party copyrighted assets used.",
    "Screenshot slots are editable placeholders for the user to insert real app screenshots.",
    "Generated with editable text boxes, shapes, and layout elements via @oai/artifact-tool."
  ].join("\n")
);

console.log(finalPptx);
