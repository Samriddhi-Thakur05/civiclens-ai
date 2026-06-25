const STORAGE_KEY = "civiclens_reports_v1";
const GEMINI_MODEL = "gemini-2.5-flash";

const seedReports = [
  {
    id: crypto.randomUUID(),
    title: "Overflowing waste near market entrance",
    category: "Waste management",
    area: "Indiranagar Market Road",
    landmark: "beside bus stop",
    severity: "Medium",
    priorityScore: 72,
    status: "Verified",
    department: "Solid Waste Management",
    duplicateRisk: "Low",
    confirmations: 18,
    reasoning: "Pedestrian pathway is partially blocked and the issue is in a high-footfall market area.",
    nextActions: ["Dispatch sanitation crew within 24 hours.", "Add temporary bin capacity.", "Notify ward supervisor with photo evidence."],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: "Damaged streetlight on service road",
    category: "Streetlight",
    area: "HSR Layout Sector 2",
    landmark: "near 17th Cross",
    severity: "High",
    priorityScore: 86,
    status: "Assigned",
    department: "Electrical Maintenance",
    duplicateRisk: "Medium",
    confirmations: 27,
    reasoning: "The report affects nighttime pedestrian safety and has repeated confirmations from residents.",
    nextActions: ["Assign electrical inspection.", "Check outage cluster in nearby poles.", "Post expected repair window publicly."],
    createdAt: new Date(Date.now() - 172800000).toISOString()
  }
];

const state = {
  reports: loadReports(),
  latestAnalysis: null,
  latestImageData: null,
  currentFilter: "all"
};

const elements = {
  apiKey: document.querySelector("#apiKey"),
  form: document.querySelector("#reportForm"),
  imageInput: document.querySelector("#imageInput"),
  imagePreview: document.querySelector("#imagePreview"),
  emptyPreview: document.querySelector("#emptyPreview"),
  modeChip: document.querySelector("#modeChip"),
  areaInput: document.querySelector("#areaInput"),
  landmarkInput: document.querySelector("#landmarkInput"),
  notesInput: document.querySelector("#notesInput"),
  sampleBtn: document.querySelector("#sampleBtn"),
  saveCaseBtn: document.querySelector("#saveCaseBtn"),
  analyzeBtn: document.querySelector("#analyzeBtn"),
  analysisTitle: document.querySelector("#analysisTitle"),
  severityPill: document.querySelector("#severityPill"),
  categoryValue: document.querySelector("#categoryValue"),
  departmentValue: document.querySelector("#departmentValue"),
  priorityValue: document.querySelector("#priorityValue"),
  duplicateValue: document.querySelector("#duplicateValue"),
  reasoningValue: document.querySelector("#reasoningValue"),
  actionsList: document.querySelector("#actionsList"),
  issueList: document.querySelector("#issueList"),
  openMetric: document.querySelector("#openMetric"),
  highMetric: document.querySelector("#highMetric"),
  confirmMetric: document.querySelector("#confirmMetric"),
  resolvedMetric: document.querySelector("#resolvedMetric"),
  mapGrid: document.querySelector("#mapGrid"),
  categoryBars: document.querySelector("#categoryBars")
};

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.currentFilter = button.dataset.filter;
    renderReports();
  });
});

elements.imageInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.latestImageData = await fileToGenerativePart(file);
  elements.imagePreview.src = state.latestImageData.previewUrl;
  elements.imagePreview.style.display = "block";
  elements.emptyPreview.style.display = "none";
});

elements.sampleBtn.addEventListener("click", loadSample);
elements.saveCaseBtn.addEventListener("click", saveLatestCase);
elements.form.addEventListener("submit", analyzeReport);

renderReports();
renderDashboard();

function loadReports() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedReports;
  try {
    return JSON.parse(saved);
  } catch {
    return seedReports;
  }
}

function persistReports() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reports));
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewId}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
}

async function analyzeReport(event) {
  event.preventDefault();
  elements.analyzeBtn.disabled = true;
  elements.analyzeBtn.textContent = "Analyzing...";
  elements.modeChip.textContent = elements.apiKey.value.trim() ? "Gemini analysis running" : "Demo analysis running";

  const context = {
    area: elements.areaInput.value.trim(),
    landmark: elements.landmarkInput.value.trim(),
    notes: elements.notesInput.value.trim(),
    existingReports: state.reports.slice(0, 8).map(({ title, category, area, status }) => ({ title, category, area, status }))
  };

  try {
    const analysis = elements.apiKey.value.trim()
      ? await analyzeWithGemini(elements.apiKey.value.trim(), context, state.latestImageData)
      : createDemoAnalysis(context);
    state.latestAnalysis = normalizeAnalysis(analysis, context);
    renderAnalysis(state.latestAnalysis);
    elements.saveCaseBtn.disabled = false;
    elements.modeChip.textContent = elements.apiKey.value.trim() ? "Gemini case generated" : "Demo case generated";
  } catch (error) {
    console.error(error);
    state.latestAnalysis = normalizeAnalysis(createDemoAnalysis(context), context);
    renderAnalysis(state.latestAnalysis);
    elements.saveCaseBtn.disabled = false;
    elements.modeChip.textContent = "Fallback case generated";
  } finally {
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.textContent = "Analyze & create case";
  }
}

async function analyzeWithGemini(apiKey, context, imageData) {
  const prompt = `You are CivicLens AI, an agentic civic issue triage assistant.
Analyze the citizen report and optional image. Return only valid JSON with these keys:
title, category, severity, priorityScore, department, duplicateRisk, reasoning, nextActions.

Rules:
- category must be one of: Pothole, Water leakage, Streetlight, Waste management, Road damage, Public safety, Other.
- severity must be Low, Medium, High, or Critical.
- priorityScore must be 1-100.
- duplicateRisk must be Low, Medium, or High by comparing with existingReports.
- department should name the likely responsible civic department.
- reasoning should explain visible evidence, impact, urgency, and confidence in 2 concise sentences.
- nextActions must contain exactly 3 practical actions for officials/community volunteers.

Citizen context:
${JSON.stringify(context, null, 2)}`;

  const parts = [{ text: prompt }];
  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: imageData.mimeType,
        data: imageData.base64
      }
    });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.35
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no analysis text");
  return JSON.parse(text);
}

function createDemoAnalysis(context) {
  const notes = `${context.notes} ${context.area} ${context.landmark}`.toLowerCase();
  const category = notes.includes("light") ? "Streetlight" : notes.includes("water") || notes.includes("leak") ? "Water leakage" : notes.includes("waste") || notes.includes("garbage") ? "Waste management" : "Pothole";
  const departmentMap = {
    Streetlight: "Electrical Maintenance",
    "Water leakage": "Water Supply Board",
    "Waste management": "Solid Waste Management",
    Pothole: "Road Maintenance"
  };
  const highSignal = ["accident", "school", "hospital", "main road", "night", "blocked"].some((word) => notes.includes(word));
  const duplicateRisk = state.reports.some((report) => report.area.toLowerCase().includes(context.area.toLowerCase().slice(0, 8))) ? "Medium" : "Low";
  return {
    title: `${category} issue at ${context.area || "reported location"}`,
    category,
    severity: highSignal ? "High" : "Medium",
    priorityScore: highSignal ? 88 : 67,
    department: departmentMap[category] || "Ward Office",
    duplicateRisk,
    reasoning: `The report indicates a ${category.toLowerCase()} concern with local disruption around ${context.area || "the selected area"}. Priority is based on public safety risk, footfall, and the chance of repeated citizen impact.`,
    nextActions: [
      "Verify the issue with one additional nearby citizen confirmation.",
      `Route the case to ${departmentMap[category] || "the ward office"} with photo and landmark context.`,
      "Publish the expected inspection window and keep the status visible to residents."
    ]
  };
}

function normalizeAnalysis(analysis, context) {
  return {
    id: crypto.randomUUID(),
    title: analysis.title || `Civic issue at ${context.area}`,
    category: analysis.category || "Other",
    area: context.area || "Unknown area",
    landmark: context.landmark || "No landmark provided",
    severity: analysis.severity || "Medium",
    priorityScore: Number(analysis.priorityScore || 60),
    status: "Reported",
    department: analysis.department || "Ward Office",
    duplicateRisk: analysis.duplicateRisk || "Low",
    confirmations: 1,
    reasoning: analysis.reasoning || "The issue needs field verification and routing to the responsible authority.",
    nextActions: Array.isArray(analysis.nextActions) ? analysis.nextActions.slice(0, 3) : ["Verify the report.", "Assign a department.", "Publish updates."],
    createdAt: new Date().toISOString()
  };
}

function renderAnalysis(analysis) {
  elements.analysisTitle.textContent = analysis.title;
  elements.severityPill.textContent = analysis.severity;
  elements.severityPill.style.color = severityColor(analysis.severity);
  elements.categoryValue.textContent = analysis.category;
  elements.departmentValue.textContent = analysis.department;
  elements.priorityValue.textContent = `${analysis.priorityScore}/100`;
  elements.duplicateValue.textContent = analysis.duplicateRisk;
  elements.reasoningValue.textContent = analysis.reasoning;
  elements.actionsList.innerHTML = analysis.nextActions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function saveLatestCase() {
  if (!state.latestAnalysis) return;
  state.reports.unshift(state.latestAnalysis);
  persistReports();
  renderReports();
  renderDashboard();
  elements.saveCaseBtn.disabled = true;
  elements.modeChip.textContent = "Case added to tracker";
  switchView("queueView");
}

function renderReports() {
  const filtered = state.reports.filter((report) => {
    if (state.currentFilter === "high") return report.severity === "High" || report.severity === "Critical" || report.priorityScore >= 80;
    if (state.currentFilter === "verified") return report.status === "Verified" || report.confirmations >= 5;
    return true;
  });

  elements.issueList.innerHTML = filtered.map((report) => `
    <article class="issue-card">
      <div>
        <p class="eyebrow">${escapeHtml(report.category)} · ${escapeHtml(report.area)}</p>
        <h3>${escapeHtml(report.title)}</h3>
        <p>${escapeHtml(report.reasoning)}</p>
        <div class="issue-meta">
          <span class="tag">${escapeHtml(report.severity)} severity</span>
          <span class="tag">${report.priorityScore}/100 priority</span>
          <span class="tag">${escapeHtml(report.department)}</span>
          <span class="tag">${report.confirmations} confirmations</span>
          <span class="tag">${escapeHtml(report.status)}</span>
        </div>
      </div>
      <div class="card-actions">
        <button class="ghost-btn" type="button" data-confirm="${report.id}">Confirm</button>
        <button class="ghost-btn" type="button" data-advance="${report.id}">Advance</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-confirm]").forEach((button) => {
    button.addEventListener("click", () => updateReport(button.dataset.confirm, "confirm"));
  });
  document.querySelectorAll("[data-advance]").forEach((button) => {
    button.addEventListener("click", () => updateReport(button.dataset.advance, "advance"));
  });
}

function updateReport(id, action) {
  const report = state.reports.find((item) => item.id === id);
  if (!report) return;
  if (action === "confirm") {
    report.confirmations += 1;
    if (report.confirmations >= 5 && report.status === "Reported") report.status = "Verified";
  }
  if (action === "advance") {
    const statuses = ["Reported", "Verified", "Assigned", "In Progress", "Resolved"];
    report.status = statuses[Math.min(statuses.indexOf(report.status) + 1, statuses.length - 1)];
  }
  persistReports();
  renderReports();
  renderDashboard();
}

function renderDashboard() {
  elements.openMetric.textContent = state.reports.filter((report) => report.status !== "Resolved").length;
  elements.highMetric.textContent = state.reports.filter((report) => report.severity === "High" || report.severity === "Critical").length;
  elements.confirmMetric.textContent = state.reports.reduce((sum, report) => sum + report.confirmations, 0);
  elements.resolvedMetric.textContent = state.reports.filter((report) => report.status === "Resolved").length;

  elements.mapGrid.innerHTML = Array.from({ length: 48 }, (_, index) => {
    const heat = Math.min(4, Math.max(0, state.reports.filter((_, reportIndex) => (reportIndex * 7 + index) % 19 === 0).length));
    return `<div class="map-cell hot-${heat}"></div>`;
  }).join("");

  const counts = state.reports.reduce((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {});
  const max = Math.max(1, ...Object.values(counts));
  elements.categoryBars.innerHTML = Object.entries(counts).map(([category, count]) => `
    <div class="bar-row">
      <strong>${escapeHtml(category)}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
      <span>${count}</span>
    </div>
  `).join("");
}

function loadSample() {
  elements.areaInput.value = "Koramangala 80 Feet Road";
  elements.landmarkInput.value = "near school crossing";
  elements.notesInput.value = "Large pothole on the main road. Two-wheelers are swerving suddenly and parents say it becomes dangerous at night after rain.";
  elements.modeChip.textContent = "Sample report loaded";
}

function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve({
        previewUrl: result,
        mimeType: file.type || "image/jpeg",
        base64: result.split(",")[1]
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function severityColor(severity) {
  if (severity === "Critical" || severity === "High") return "var(--red)";
  if (severity === "Medium") return "var(--amber)";
  return "var(--green-strong)";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
