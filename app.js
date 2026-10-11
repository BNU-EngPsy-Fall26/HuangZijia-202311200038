const canvas = document.getElementById("interviewCanvas");
const ctx = canvas.getContext("2d");
const conceptCanvas = document.getElementById("conceptCanvas");
const conceptCtx = conceptCanvas.getContext("2d");
const resultConceptCanvas = document.getElementById("resultConceptCanvas");
const resultConceptCtx = resultConceptCanvas.getContext("2d");
const leaderboardKey = "sdt-interview-leaderboard";

const state = {
  settings: {
    signalProbability: 0.5,
    difficulty: 1.4,
    timeLimit: 12,
    trialCount: 24
  },
  trialIndex: 0,
  current: null,
  timerId: null,
  nextTrialTimeoutId: null,
  remaining: 0,
  running: false,
  history: [],
  roundSaved: false
};

const els = {
  setupPage: document.getElementById("setupPage"),
  taskPage: document.getElementById("taskPage"),
  signalProbability: document.getElementById("signalProbability"),
  signalProbabilityValue: document.getElementById("signalProbabilityValue"),
  difficulty: document.getElementById("difficulty"),
  difficultyValue: document.getElementById("difficultyValue"),
  conceptDistance: document.getElementById("conceptDistance"),
  conceptDistanceValue: document.getElementById("conceptDistanceValue"),
  resultConceptDistance: document.getElementById("resultConceptDistance"),
  resultConceptDistanceValue: document.getElementById("resultConceptDistanceValue"),
  criterionDemo: document.getElementById("criterionDemo"),
  criterionDemoValue: document.getElementById("criterionDemoValue"),
  resultCriterionDemo: document.getElementById("resultCriterionDemo"),
  resultCriterionDemoValue: document.getElementById("resultCriterionDemoValue"),
  timeLimit: document.getElementById("timeLimit"),
  trialCount: document.getElementById("trialCount"),
  startButton: document.getElementById("startButton"),
  resetButton: document.getElementById("resetButton"),
  backToSetupButton: document.getElementById("backToSetupButton"),
  restartButton: document.getElementById("restartButton"),
  practiceAgainButton: document.getElementById("practiceAgainButton"),
  rejectButton: document.getElementById("rejectButton"),
  hireButton: document.getElementById("hireButton"),
  exportButton: document.getElementById("exportButton"),
  clearLeaderboardButton: document.getElementById("clearLeaderboardButton"),
  stageTitle: document.getElementById("stageTitle"),
  stageSubtitle: document.getElementById("stageSubtitle"),
  timerValue: document.getElementById("timerValue"),
  candidateName: document.getElementById("candidateName"),
  candidateRole: document.getElementById("candidateRole"),
  cueGrid: document.getElementById("cueGrid"),
  feedback: document.getElementById("feedback"),
  resultsPanel: document.getElementById("resultsPanel"),
  liveTrial: document.getElementById("liveTrial"),
  liveHit: document.getElementById("liveHit"),
  liveMiss: document.getElementById("liveMiss"),
  liveFa: document.getElementById("liveFa"),
  liveCr: document.getElementById("liveCr"),
  resultHit: document.getElementById("resultHit"),
  resultMiss: document.getElementById("resultMiss"),
  resultFa: document.getElementById("resultFa"),
  resultCr: document.getElementById("resultCr"),
  resultHitRate: document.getElementById("resultHitRate"),
  resultFaRate: document.getElementById("resultFaRate"),
  resultDPrime: document.getElementById("resultDPrime"),
  resultCriterion: document.getElementById("resultCriterion"),
  resultAccuracy: document.getElementById("resultAccuracy"),
  resultSummary: document.getElementById("resultSummary"),
  leaderboardBody: document.getElementById("leaderboardBody")
};

const names = [
  "林一诺", "陈知远", "周晴", "梁拓", "许明澈", "高舒然",
  "赵予安", "沈以宁", "蒋澜", "顾清和", "何星野", "苏瑾"
];

const roles = [
  "产品运营专员", "数据分析师", "客户成功经理", "前端工程师",
  "市场策划", "项目助理", "人力资源专员", "销售顾问"
];

const cueDefinitions = [
  {
    key: "resume",
    label: "简历匹配度",
    positive: "经历与岗位要求高度贴合",
    neutral: "经历有相关性但不够集中",
    negative: "经历与岗位目标偏离"
  },
  {
    key: "answer",
    label: "结构化面试回答",
    positive: "回答清晰，能用事实支撑",
    neutral: "回答完整但细节一般",
    negative: "回答跳跃，缺少证据"
  },
  {
    key: "task",
    label: "现场任务表现",
    positive: "任务拆解快，结果稳定",
    neutral: "能完成主体任务，有小错误",
    negative: "任务推进慢且多次偏题"
  },
  {
    key: "risk",
    label: "风险信号反向分",
    positive: "未见明显风险",
    neutral: "存在少量不确定点",
    negative: "风险线索较多"
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomNormal() {
  const u1 = Math.max(Math.random(), Number.EPSILON);
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function inverseNormal(p) {
  const a = [
    -39.69683028665376,
    220.9460984245205,
    -275.9285104469687,
    138.357751867269,
    -30.66479806614716,
    2.506628277459239
  ];
  const b = [
    -54.47609879822406,
    161.5858368580409,
    -155.6989798598866,
    66.80131188771972,
    -13.28068155288572
  ];
  const c = [
    -0.007784894002430293,
    -0.3223964580411365,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783
  ];
  const d = [
    0.007784695709041462,
    0.3224671290700398,
    2.445134137142996,
    3.754408661907416
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  let r;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (phigh < p) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
      / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  q = p - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
    / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function normalPdf(x, mean = 0, sd = 1) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

function erf(x) {
  const sign = Math.sign(x);
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(x, mean = 0, sd = 1) {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.sqrt(2))));
}

function readSettings() {
  state.settings.signalProbability = Number(els.signalProbability.value) / 100;
  state.settings.difficulty = Number(els.difficulty.value);
  state.settings.timeLimit = Number(els.timeLimit.value);
  state.settings.trialCount = Number(els.trialCount.value);
  els.signalProbabilityValue.textContent = `${els.signalProbability.value}%`;
  els.difficultyValue.textContent = Number(els.difficulty.value).toFixed(1);
  els.conceptDistance.value = els.difficulty.value;
  els.conceptDistanceValue.textContent = Number(els.difficulty.value).toFixed(1);
  els.resultConceptDistance.value = els.difficulty.value;
  els.resultConceptDistanceValue.textContent = Number(els.difficulty.value).toFixed(1);
  drawConceptCanvas();
}

function showPage(pageName) {
  els.setupPage.classList.toggle("hidden", pageName !== "setup");
  els.taskPage.classList.toggle("hidden", pageName !== "task");
  els.resultsPanel.classList.toggle("hidden", pageName !== "results");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function drawConceptCanvas() {
  const d = Number(els.difficulty.value);
  const criterion = Number(els.criterionDemo.value);
  els.criterionDemoValue.textContent = criterion.toFixed(1);
  els.resultCriterionDemo.value = String(criterion);
  els.resultCriterionDemoValue.textContent = criterion.toFixed(1);
  drawOneConceptCanvas(conceptCtx, conceptCanvas, d, criterion);
  drawOneConceptCanvas(resultConceptCtx, resultConceptCanvas, d, criterion);
}

function syncCriterionFrom(source) {
  els.criterionDemo.value = source.value;
  els.resultCriterionDemo.value = source.value;
  drawConceptCanvas();
}

function syncDistanceFrom(source) {
  els.difficulty.value = source.value;
  els.conceptDistance.value = source.value;
  els.resultConceptDistance.value = source.value;
  readSettings();
}

function drawOneConceptCanvas(plotCtx, targetCanvas, d, criterion) {
  const width = targetCanvas.width;
  const height = targetCanvas.height;
  const noiseMean = -d / 2;
  const signalMean = d / 2;
  const hitRate = 1 - normalCdf(criterion, signalMean, 1);
  const faRate = 1 - normalCdf(criterion, noiseMean, 1);

  plotCtx.clearRect(0, 0, width, height);
  plotCtx.fillStyle = "#ffffff";
  plotCtx.fillRect(0, 0, width, height);

  drawDistributionPlot(plotCtx, { x: 72, y: 134, w: 740, h: 320 }, noiseMean, signalMean, criterion, hitRate, faRate);
  drawRocPlot(plotCtx, { x: 930, y: 134, w: 380, h: 320 }, d, hitRate, faRate);

  plotCtx.fillStyle = "#17213a";
  plotCtx.font = "900 22px sans-serif";
  plotCtx.fillText(`当前参数：d' = ${d.toFixed(1)}    c = ${criterion.toFixed(1)}`, 72, 526);
  plotCtx.fillStyle = "#637089";
  plotCtx.font = "18px sans-serif";
  plotCtx.fillText(`d' 表示当前线索条件下的辨别力；数值越大，S/N 证据分布越容易区分。`, 72, 566);
  plotCtx.fillText(`它受线索质量、任务难度和个体差异影响。当前 P(Hit) = ${formatPercent(hitRate)}，P(FA) = ${formatPercent(faRate)}；c 越右越保守。`, 72, 594);
}

function drawDistributionPlot(plotCtx, area, noiseMean, signalMean, criterion, hitRate, faRate) {
  const xMin = -4;
  const xMax = 4;
  const yMax = 0.42;
  const mapX = (x) => area.x + ((x - xMin) / (xMax - xMin)) * area.w;
  const mapY = (y) => area.y + area.h - (y / yMax) * area.h;

  plotCtx.strokeStyle = "#d9e1ee";
  plotCtx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 1) {
    plotCtx.beginPath();
    plotCtx.moveTo(mapX(i), area.y);
    plotCtx.lineTo(mapX(i), area.y + area.h);
    plotCtx.stroke();
  }

  plotCtx.strokeStyle = "#26334f";
  plotCtx.lineWidth = 3;
  plotCtx.strokeRect(area.x, area.y, area.w, area.h);

  drawNormalCurve(plotCtx, area, noiseMean, "#215fb8", "rgba(33, 95, 184, 0.18)", mapX, mapY, xMin, xMax);
  drawNormalCurve(plotCtx, area, signalMean, "#287a3a", "rgba(40, 122, 58, 0.18)", mapX, mapY, xMin, xMax);

  const cx = mapX(criterion);
  plotCtx.strokeStyle = "#c92a2a";
  plotCtx.lineWidth = 5;
  plotCtx.beginPath();
  plotCtx.moveTo(cx, area.y + 6);
  plotCtx.lineTo(cx, area.y + area.h);
  plotCtx.stroke();

  plotCtx.fillStyle = "#102e63";
  plotCtx.font = "900 24px sans-serif";
  plotCtx.fillText("证据强度分布", area.x, 62);
  drawTag(plotCtx, "噪音 N", mapX(noiseMean) - 50, area.y + 28, "#215fb8");
  drawTag(plotCtx, "信号 S", mapX(signalMean) - 50, area.y + 28, "#287a3a");
  plotCtx.fillStyle = "#c92a2a";
  plotCtx.fillText("c", cx + 8, area.y + 32);
  plotCtx.fillStyle = "#637089";
  plotCtx.font = "18px sans-serif";
  plotCtx.fillText("低证据", area.x, area.y + area.h + 32);
  plotCtx.fillText("高证据", area.x + area.w - 64, area.y + area.h + 32);
  plotCtx.fillText(`命中 ${formatPercent(hitRate)} / 虚报 ${formatPercent(faRate)}`, area.x + 292, area.y + area.h + 32);
}

function drawTag(plotCtx, text, x, y, color) {
  plotCtx.save();
  plotCtx.font = "800 20px sans-serif";
  const metrics = plotCtx.measureText(text);
  plotCtx.fillStyle = "rgba(255, 255, 255, 0.84)";
  plotCtx.fillRect(x - 10, y - 24, metrics.width + 20, 34);
  plotCtx.strokeStyle = "rgba(99, 112, 137, 0.22)";
  plotCtx.strokeRect(x - 10, y - 24, metrics.width + 20, 34);
  plotCtx.fillStyle = color;
  plotCtx.fillText(text, x, y);
  plotCtx.restore();
}

function drawNormalCurve(plotCtx, area, mean, stroke, fill, mapX, mapY, xMin, xMax) {
  plotCtx.beginPath();
  plotCtx.moveTo(mapX(xMin), area.y + area.h);
  for (let i = 0; i <= 180; i += 1) {
    const x = xMin + (i / 180) * (xMax - xMin);
    plotCtx.lineTo(mapX(x), mapY(normalPdf(x, mean, 1)));
  }
  plotCtx.lineTo(mapX(xMax), area.y + area.h);
  plotCtx.closePath();
  plotCtx.fillStyle = fill;
  plotCtx.fill();

  plotCtx.beginPath();
  for (let i = 0; i <= 180; i += 1) {
    const x = xMin + (i / 180) * (xMax - xMin);
    const y = mapY(normalPdf(x, mean, 1));
    if (i === 0) plotCtx.moveTo(mapX(x), y);
    else plotCtx.lineTo(mapX(x), y);
  }
  plotCtx.strokeStyle = stroke;
  plotCtx.lineWidth = 5;
  plotCtx.stroke();
}

function drawRocPlot(plotCtx, area, d, hitRate, faRate) {
  const noiseMean = -d / 2;
  const signalMean = d / 2;
  const mapX = (p) => area.x + p * area.w;
  const mapY = (p) => area.y + area.h - p * area.h;

  plotCtx.strokeStyle = "#d9e1ee";
  plotCtx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const p = i / 5;
    plotCtx.beginPath();
    plotCtx.moveTo(mapX(p), area.y);
    plotCtx.lineTo(mapX(p), area.y + area.h);
    plotCtx.moveTo(area.x, mapY(p));
    plotCtx.lineTo(area.x + area.w, mapY(p));
    plotCtx.stroke();
  }

  plotCtx.strokeStyle = "#b6c4d5";
  plotCtx.lineWidth = 3;
  plotCtx.beginPath();
  plotCtx.moveTo(area.x, area.y + area.h);
  plotCtx.lineTo(area.x + area.w, area.y);
  plotCtx.stroke();

  plotCtx.beginPath();
  for (let i = 0; i <= 220; i += 1) {
    const threshold = 4 - (i / 220) * 8;
    const x = 1 - normalCdf(threshold, noiseMean, 1);
    const y = 1 - normalCdf(threshold, signalMean, 1);
    if (i === 0) plotCtx.moveTo(mapX(x), mapY(y));
    else plotCtx.lineTo(mapX(x), mapY(y));
  }
  plotCtx.strokeStyle = "#16827a";
  plotCtx.lineWidth = 6;
  plotCtx.stroke();

  plotCtx.fillStyle = "#17213a";
  plotCtx.beginPath();
  plotCtx.arc(mapX(faRate), mapY(hitRate), 11, 0, Math.PI * 2);
  plotCtx.fill();
  plotCtx.strokeStyle = "#ffffff";
  plotCtx.lineWidth = 4;
  plotCtx.stroke();

  plotCtx.strokeStyle = "#26334f";
  plotCtx.lineWidth = 3;
  plotCtx.strokeRect(area.x, area.y, area.w, area.h);
  plotCtx.fillStyle = "#102e63";
  plotCtx.font = "900 24px sans-serif";
  plotCtx.fillText("ROC 曲线", area.x, 62);
  plotCtx.fillStyle = "#637089";
  plotCtx.font = "18px sans-serif";
  plotCtx.fillText("P(FA)", area.x + area.w - 56, area.y + area.h + 34);
  plotCtx.save();
  plotCtx.translate(area.x - 44, area.y + 72);
  plotCtx.rotate(-Math.PI / 2);
  plotCtx.fillText("P(Hit)", 0, 0);
  plotCtx.restore();
}

function createCandidate() {
  const isSignal = Math.random() < state.settings.signalProbability;
  const evidenceMean = isSignal ? state.settings.difficulty / 2 : -state.settings.difficulty / 2;
  const evidence = evidenceMean + randomNormal();
  const baseScore = clamp(50 + evidence * 18, 8, 95);
  const cues = cueDefinitions.map((cue, index) => {
    const noise = randomNormal() * 11;
    const bias = cue.key === "risk" ? -3 : 0;
    const value = clamp(baseScore + noise + bias, 4, 98);
    return {
      ...cue,
      value,
      text: value >= 68 ? cue.positive : value >= 43 ? cue.neutral : cue.negative,
      index
    };
  });

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: names[Math.floor(Math.random() * names.length)],
    role: roles[Math.floor(Math.random() * roles.length)],
    isSignal,
    evidence,
    cues
  };
}

function drawCanvas(candidate, progress = 1) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const grd = ctx.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, "#f7fbff");
  grd.addColorStop(0.48, "#e8f0f8");
  grd.addColorStop(1, "#d6e1ed");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#c6d5e8";
  ctx.fillRect(0, 0, width, 18);
  ctx.fillStyle = "#f6fbff";
  ctx.fillRect(584, 48, 290, 148);
  ctx.strokeStyle = "#bfd0e3";
  ctx.lineWidth = 3;
  ctx.strokeRect(584, 48, 290, 148);
  ctx.strokeStyle = "#d9e1ee";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(729, 48);
  ctx.lineTo(729, 196);
  ctx.moveTo(584, 122);
  ctx.lineTo(874, 122);
  ctx.stroke();
  ctx.fillStyle = "#d7e7f6";
  ctx.fillRect(602, 66, 110, 38);
  ctx.fillRect(746, 140, 108, 38);

  ctx.fillStyle = "#cfd9e8";
  ctx.fillRect(0, 370, width, height - 370);
  ctx.fillStyle = "#eef3f8";
  ctx.fillRect(124, 294, 728, 112);
  ctx.strokeStyle = "#aebed1";
  ctx.lineWidth = 3;
  ctx.strokeRect(124, 294, 728, 112);
  ctx.fillStyle = "#d8e0eb";
  ctx.fillRect(164, 406, 52, 76);
  ctx.fillRect(760, 406, 52, 76);

  ctx.fillStyle = "#174276";
  ctx.fillRect(60, 58, 212, 124);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 20px sans-serif";
  ctx.fillText("招聘面试室", 96, 102);
  ctx.font = "14px sans-serif";
  ctx.fillText("有限线索 · 限时判断", 96, 134);
  ctx.fillStyle = "#d9a12f";
  ctx.fillRect(82, 86, 8, 62);

  drawInterviewer(268, 278);
  drawCandidate(700, 276, candidate);

  ctx.strokeStyle = "#6f7d91";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(428, 332);
  ctx.lineTo(548, 332);
  ctx.stroke();

  const avgCue = candidate ? candidate.cues.reduce((sum, cue) => sum + cue.value, 0) / candidate.cues.length : 50;
  drawEvidenceGauge(avgCue, progress);
}

function drawInterviewer(x, y) {
  ctx.fillStyle = "#23324f";
  ctx.fillRect(x - 36, y + 38, 72, 82);
  ctx.fillStyle = "#f0c7a8";
  ctx.beginPath();
  ctx.arc(x, y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2e4b";
  ctx.beginPath();
  ctx.arc(x - 13, y - 4, 4, 0, Math.PI * 2);
  ctx.arc(x + 13, y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1f2e4b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 16);
  ctx.quadraticCurveTo(x, y + 24, x + 14, y + 16);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 76, y + 96, 152, 52);
  ctx.strokeStyle = "#b6c4d5";
  ctx.strokeRect(x - 76, y + 96, 152, 52);
  ctx.fillStyle = "#637089";
  ctx.font = "600 14px sans-serif";
  ctx.fillText("面试记录", x - 34, y + 127);
}

function drawCandidate(x, y, candidate) {
  const avgCue = candidate ? candidate.cues.reduce((sum, cue) => sum + cue.value, 0) / candidate.cues.length : 50;
  ctx.fillStyle = avgCue > 62 ? "#287a3a" : avgCue > 44 ? "#d98d17" : "#c92a2a";
  ctx.fillRect(x - 42, y + 42, 84, 78);
  ctx.fillStyle = "#e9b98d";
  ctx.beginPath();
  ctx.arc(x, y, 39, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a3349";
  ctx.beginPath();
  ctx.arc(x - 14, y - 4, 4, 0, Math.PI * 2);
  ctx.arc(x + 14, y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a3349";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (avgCue > 58) {
    ctx.moveTo(x - 15, y + 14);
    ctx.quadraticCurveTo(x, y + 26, x + 15, y + 14);
  } else {
    ctx.moveTo(x - 15, y + 22);
    ctx.quadraticCurveTo(x, y + 10, x + 15, y + 22);
  }
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 88, y + 96, 176, 52);
  ctx.strokeStyle = "#b6c4d5";
  ctx.strokeRect(x - 88, y + 96, 176, 52);
  ctx.fillStyle = "#1f2e4b";
  ctx.font = "700 15px sans-serif";
  ctx.fillText(candidate ? candidate.name : "候选人", x - 30, y + 126);
}

function drawEvidenceGauge(avgCue, progress) {
  const x = 330;
  const y = 226;
  const width = 300;
  const height = 34;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "#aebed1";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  const filled = clamp(avgCue / 100, 0, 1) * width;
  const cueGradient = ctx.createLinearGradient(x, y, x + width, y);
  cueGradient.addColorStop(0, "#c92a2a");
  cueGradient.addColorStop(0.5, "#d98d17");
  cueGradient.addColorStop(1, "#287a3a");
  ctx.fillStyle = cueGradient;
  ctx.fillRect(x, y, filled, height);

  ctx.fillStyle = "#102e63";
  ctx.font = "700 18px sans-serif";
  ctx.fillText("综合线索强度", x, y - 14);

  ctx.fillStyle = "#215fb8";
  ctx.fillRect(x, y + height + 18, width * progress, 10);
  ctx.fillStyle = "#637089";
  ctx.font = "13px sans-serif";
  ctx.fillText("倒计时进度", x, y + height + 48);
}

function renderCandidate(candidate) {
  els.candidateName.textContent = candidate.name;
  els.candidateRole.textContent = `应聘岗位：${candidate.role}`;
  els.cueGrid.innerHTML = candidate.cues.map((cue) => `
    <article class="cue">
      <strong>${cue.label}<span>${Math.round(cue.value)}/100</span></strong>
      <meter min="0" max="100" value="${cue.value}"></meter>
      <p>${cue.text}</p>
    </article>
  `).join("");
}

function setDecisionEnabled(enabled) {
  els.hireButton.disabled = !enabled;
  els.rejectButton.disabled = !enabled;
}

function startExperiment() {
  readSettings();
  clearInterval(state.timerId);
  clearTimeout(state.nextTrialTimeoutId);
  state.trialIndex = 0;
  state.history = [];
  state.running = true;
  state.roundSaved = false;
  showPage("task");
  els.feedback.className = "feedback";
  els.feedback.textContent = "请根据候选人线索做出判断。没有唯一显性答案，系统会在背后记录真实状态。";
  updateLiveStats();
  nextTrial();
}

function nextTrial() {
  clearInterval(state.timerId);
  if (state.trialIndex >= state.settings.trialCount) {
    finishExperiment();
    return;
  }

  state.trialIndex += 1;
  state.current = createCandidate();
  state.remaining = state.settings.timeLimit;
  els.stageTitle.textContent = `第 ${state.trialIndex} / ${state.settings.trialCount} 位候选人`;
  els.stageSubtitle.textContent = "在倒计时结束前判断是否录用。键盘可按 A=不录用，L=录用。";
  els.timerValue.textContent = state.remaining;
  els.feedback.className = "feedback";
  els.feedback.textContent = "观察简历、回答、现场任务和风险线索，然后做出招聘判断。";
  renderCandidate(state.current);
  drawCanvas(state.current, 1);
  setDecisionEnabled(true);
  updateLiveStats();

  state.timerId = setInterval(() => {
    state.remaining -= 1;
    els.timerValue.textContent = state.remaining;
    drawCanvas(state.current, state.remaining / state.settings.timeLimit);
    if (state.remaining <= 0) {
      makeDecision(false, true);
    }
  }, 1000);
}

function makeDecision(hire, timedOut = false) {
  if (!state.current || !state.running) return;
  clearInterval(state.timerId);
  setDecisionEnabled(false);

  const candidate = state.current;
  let outcome;
  if (candidate.isSignal && hire) outcome = "H";
  if (candidate.isSignal && !hire) outcome = "M";
  if (!candidate.isSignal && hire) outcome = "FA";
  if (!candidate.isSignal && !hire) outcome = "CR";

  const record = {
    trial: state.trialIndex,
    name: candidate.name,
    role: candidate.role,
    actual: candidate.isSignal ? "Signal" : "Noise",
    response: hire ? "Hire" : "Reject",
    outcome,
    timedOut,
    cueAverage: Math.round(candidate.cues.reduce((sum, cue) => sum + cue.value, 0) / candidate.cues.length)
  };
  state.history.push(record);

  const resultText = {
    H: "命中：这位候选人确实是高绩效员工，你选择录用。",
    M: "漏报：这位候选人其实是高绩效员工，但被拒绝了。",
    FA: "虚报：这位候选人并非高绩效员工，但被误录用。",
    CR: "正确拒绝：这位候选人并非高绩效员工，你选择不录用。"
  };
  els.feedback.className = `feedback ${outcome === "H" || outcome === "CR" ? "good" : "bad"}`;
  els.feedback.textContent = `${timedOut ? "超时，系统按“不录用”记录。" : ""}${resultText[outcome]}`;
  updateLiveStats();

  state.nextTrialTimeoutId = setTimeout(nextTrial, 1150);
}

function countOutcomes() {
  return state.history.reduce((acc, item) => {
    acc[item.outcome] += 1;
    return acc;
  }, { H: 0, M: 0, FA: 0, CR: 0 });
}

function calculateResults() {
  const counts = countOutcomes();
  const signalTrials = counts.H + counts.M;
  const noiseTrials = counts.FA + counts.CR;
  const hitRateRaw = signalTrials ? counts.H / signalTrials : 0;
  const faRateRaw = noiseTrials ? counts.FA / noiseTrials : 0;
  const hitRate = (counts.H + 0.5) / (signalTrials + 1);
  const faRate = (counts.FA + 0.5) / (noiseTrials + 1);
  const zHit = inverseNormal(hitRate);
  const zFa = inverseNormal(faRate);
  const dPrime = zHit - zFa;
  const criterion = -0.5 * (zHit + zFa);
  const accuracy = state.history.length ? (counts.H + counts.CR) / state.history.length : 0;

  return {
    counts,
    hitRateRaw,
    faRateRaw,
    hitRate,
    faRate,
    dPrime,
    criterion,
    accuracy
  };
}

function updateLiveStats() {
  const counts = countOutcomes();
  els.liveTrial.textContent = `${state.history.length}/${state.settings.trialCount}`;
  els.liveHit.textContent = counts.H;
  els.liveMiss.textContent = counts.M;
  els.liveFa.textContent = counts.FA;
  els.liveCr.textContent = counts.CR;
}

function finishExperiment() {
  state.running = false;
  state.current = null;
  clearInterval(state.timerId);
  clearTimeout(state.nextTrialTimeoutId);
  setDecisionEnabled(false);
  els.timerValue.textContent = "--";
  els.stageTitle.textContent = "实验完成";
  els.stageSubtitle.textContent = "下方展示完整信号检测论指标。你可以再次开始练习、调整参数或导出 CSV。";
  els.feedback.className = "feedback good";
  els.feedback.textContent = "实验结束，结果已经计算完成。";

  const results = calculateResults();
  els.resultHit.textContent = results.counts.H;
  els.resultMiss.textContent = results.counts.M;
  els.resultFa.textContent = results.counts.FA;
  els.resultCr.textContent = results.counts.CR;
  els.resultHitRate.textContent = formatPercent(results.hitRateRaw);
  els.resultFaRate.textContent = formatPercent(results.faRateRaw);
  els.resultDPrime.textContent = results.dPrime.toFixed(2);
  els.resultCriterion.textContent = results.criterion.toFixed(2);
  els.resultAccuracy.textContent = formatPercent(results.accuracy);
  els.resultSummary.textContent = buildSummary(results);
  saveRoundResult(results);
  renderLeaderboard();
  drawConceptCanvas();
  showPage("results");
}

function buildSummary(results) {
  const sensitivity = results.dPrime >= 1.5
    ? "你的辨别力较高，能比较稳定地区分高绩效候选人与普通候选人"
    : results.dPrime >= 0.7
      ? "你的辨别力中等，能抓住部分有效线索，但仍会受噪音干扰"
      : "你的辨别力偏低，当前线索条件下信号与噪音容易混淆";
  const bias = results.criterion > 0.25
    ? "判断标准偏保守，更倾向于拒绝候选人"
    : results.criterion < -0.25
      ? "判断标准偏宽松，更倾向于录用候选人"
      : "判断标准接近中性";
  return `${sensitivity}；${bias}。本轮准确率为 ${formatPercent(results.accuracy)}，P(Hit)=${formatPercent(results.hitRateRaw)}，P(FA)=${formatPercent(results.faRateRaw)}。`;
}

function resetData() {
  clearInterval(state.timerId);
  clearTimeout(state.nextTrialTimeoutId);
  state.trialIndex = 0;
  state.current = null;
  state.running = false;
  state.history = [];
  state.roundSaved = false;
  els.stageTitle.textContent = "等待开始";
  els.stageSubtitle.textContent = "设置参数后点击开始，系统会随机生成候选人。";
  els.timerValue.textContent = "--";
  els.candidateName.textContent = "候选人档案";
  els.candidateRole.textContent = "尚未开始";
  els.cueGrid.innerHTML = "";
  els.feedback.className = "feedback";
  els.feedback.textContent = "面试开始后，请在倒计时内做出判断。";
  setDecisionEnabled(false);
  readSettings();
  updateLiveStats();
  drawCanvas(null, 1);
  drawConceptCanvas();
  renderLeaderboard();
  showPage("setup");
}

function restoreDefaultSettings() {
  els.signalProbability.value = "50";
  els.difficulty.value = "1.4";
  els.conceptDistance.value = "1.4";
  els.resultConceptDistance.value = "1.4";
  els.criterionDemo.value = "0";
  els.resultCriterionDemo.value = "0";
  els.timeLimit.value = "12";
  els.trialCount.value = "24";
  resetData();
}

function exportCsv() {
  if (!state.history.length) return;
  const rows = [
    ["trial", "name", "role", "actual", "response", "outcome", "timedOut", "cueAverage"],
    ...state.history.map((item) => [
      item.trial,
      item.name,
      item.role,
      item.actual,
      item.response,
      item.outcome,
      item.timedOut ? "yes" : "no",
      item.cueAverage
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sdt_interview_results.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(leaderboardKey) || "[]");
  } catch {
    return [];
  }
}

function saveLeaderboard(records) {
  try {
    localStorage.setItem(leaderboardKey, JSON.stringify(records.slice(0, 12)));
  } catch {
    // 本地存储不可用时不影响单局实验结果展示。
  }
}

function saveRoundResult(results) {
  if (state.roundSaved || !state.history.length) return;
  const records = loadLeaderboard();
  records.push({
    id: Date.now(),
    date: new Date().toLocaleString("zh-CN", { hour12: false }),
    accuracy: results.accuracy,
    dPrime: results.dPrime,
    criterion: results.criterion,
    counts: results.counts,
    trialCount: state.settings.trialCount,
    signalProbability: state.settings.signalProbability,
    difficulty: state.settings.difficulty,
    timeLimit: state.settings.timeLimit
  });
  records.sort((a, b) => b.accuracy - a.accuracy || b.dPrime - a.dPrime || Math.abs(a.criterion) - Math.abs(b.criterion));
  saveLeaderboard(records);
  state.roundSaved = true;
}

function renderLeaderboard() {
  const records = loadLeaderboard();
  if (!records.length) {
    els.leaderboardBody.innerHTML = `<tr><td colspan="7">暂无历史记录。完成一局后会自动保存到本机浏览器。</td></tr>`;
    return;
  }
  els.leaderboardBody.innerHTML = records.map((record, index) => {
    const counts = record.counts;
    const params = `P(S) ${formatPercent(record.signalProbability)} / d' ${record.difficulty.toFixed(1)} / ${record.timeLimit}s / ${record.trialCount}次`;
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${record.date}</td>
        <td>${formatPercent(record.accuracy)}</td>
        <td>${record.dPrime.toFixed(2)}</td>
        <td>${record.criterion.toFixed(2)}</td>
        <td>${counts.H}/${counts.M}/${counts.FA}/${counts.CR}</td>
        <td>${params}</td>
      </tr>
    `;
  }).join("");
}

function clearLeaderboard() {
  try {
    localStorage.removeItem(leaderboardKey);
  } catch {
    // 忽略浏览器本地存储限制。
  }
  renderLeaderboard();
}

els.signalProbability.addEventListener("input", readSettings);
els.difficulty.addEventListener("input", readSettings);
els.conceptDistance.addEventListener("input", () => syncDistanceFrom(els.conceptDistance));
els.resultConceptDistance.addEventListener("input", () => syncDistanceFrom(els.resultConceptDistance));
els.criterionDemo.addEventListener("input", () => syncCriterionFrom(els.criterionDemo));
els.resultCriterionDemo.addEventListener("input", () => syncCriterionFrom(els.resultCriterionDemo));
els.timeLimit.addEventListener("change", readSettings);
els.trialCount.addEventListener("change", readSettings);
els.startButton.addEventListener("click", startExperiment);
els.resetButton.addEventListener("click", restoreDefaultSettings);
els.backToSetupButton.addEventListener("click", resetData);
els.restartButton.addEventListener("click", resetData);
els.practiceAgainButton.addEventListener("click", startExperiment);
els.clearLeaderboardButton.addEventListener("click", clearLeaderboard);
els.hireButton.addEventListener("click", () => makeDecision(true));
els.rejectButton.addEventListener("click", () => makeDecision(false));
els.exportButton.addEventListener("click", exportCsv);

window.addEventListener("keydown", (event) => {
  if (els.hireButton.disabled || els.rejectButton.disabled) return;
  if (event.key.toLowerCase() === "l") makeDecision(true);
  if (event.key.toLowerCase() === "a") makeDecision(false);
});

resetData();
