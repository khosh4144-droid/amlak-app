(() => {
  "use strict";

  const STORAGE_KEY = "amlakState";
  const SCHEMA_VERSION = 2;
  const COLLECTIONS = ["properties", "units", "tenants", "contracts", "payments", "maintenance"];
  const emptyState = () => ({
    version: SCHEMA_VERSION,
    properties: [], units: [], tenants: [], contracts: [], payments: [], maintenance: [],
    settings: {companyName:"", taxNumber:"", contactNumber:"", notifyContracts:true, notifyPayments:true, notifyMaintenance:true}
  });

  const $ = id => document.getElementById(id);
  const fmt = value => new Intl.NumberFormat("ar-SA").format(Number(value || 0));
  const uid = prefix => `${prefix}-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`;
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
  const text = value => String(value ?? "").trim();
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
  let state = loadState();
  let activePage = "dashboard";
  let toastTimer;

  function loadState() {
    const clean = emptyState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clean;
      const source = JSON.parse(raw);
      if (!source || typeof source !== "object") return clean;
      COLLECTIONS.forEach(name => clean[name] = Array.isArray(source[name]) ? source[name].filter(item => item && typeof item === "object") : []);
      clean.settings = {...clean.settings, ...(source.settings && typeof source.settings === "object" ? source.settings : {})};
      migrate(clean);
      return clean;
    } catch (error) {
      console.warn("تم تجاهل بيانات محلية تالفة.", error);
      return clean;
    }
  }

  function migrate(data) {
    COLLECTIONS.forEach(name => data[name].forEach(item => { if (!item.id) item.id = uid(name.slice(0, -1)); }));
    data.units.forEach(unit => {
      if (!unit.propertyId && unit.property) unit.propertyId = data.properties.find(item => item.name === unit.property)?.id || "";
      delete unit.property;
    });
    data.tenants.forEach(tenant => {
      if (!tenant.unitId && tenant.unit) tenant.unitId = data.units.find(item => item.name === tenant.unit || `${item.name} - ${propertyNameFrom(data, item)}` === tenant.unit)?.id || "";
      delete tenant.unit;
    });
    data.contracts.forEach(contract => {
      if (!contract.tenantId && contract.tenant) contract.tenantId = data.tenants.find(item => item.name === contract.tenant)?.id || "";
      if (!contract.unitId && contract.unit) contract.unitId = data.units.find(item => item.name === contract.unit)?.id || "";
      delete contract.tenant; delete contract.unit;
    });
    data.payments.forEach(payment => {
      if (!payment.contractId) {
        const tenantId = data.tenants.find(item => item.name === payment.tenant)?.id;
        payment.contractId = data.contracts.find(item => item.tenantId === tenantId)?.id || "";
      }
      delete payment.tenant; delete payment.unit;
    });
    data.maintenance.forEach(item => {
      if (!item.unitId && item.unit) item.unitId = data.units.find(unit => unit.name === item.unit)?.id || "";
      delete item.unit;
    });
    removeOrphans(data);
    data.version = SCHEMA_VERSION;
  }

  function removeOrphans(data) {
    const propertyIds = new Set(data.properties.map(item => item.id));
    data.units = data.units.filter(item => propertyIds.has(item.propertyId));
    const unitIds = new Set(data.units.map(item => item.id));
    data.tenants = data.tenants.filter(item => unitIds.has(item.unitId));
    const tenantById = new Map(data.tenants.map(item => [item.id, item]));
    data.contracts = data.contracts.filter(item =>
      unitIds.has(item.unitId) &&
      tenantById.has(item.tenantId) &&
      tenantById.get(item.tenantId).unitId === item.unitId
    );
    const contractIds = new Set(data.contracts.map(item => item.id));
    data.payments = data.payments.filter(item => contractIds.has(item.contractId));
    data.maintenance = data.maintenance.filter(item => unitIds.has(item.unitId));
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (error) { console.error("تعذر حفظ البيانات:", error); toast("تعذر الحفظ؛ مساحة المتصفح ممتلئة", true); return false; }
  }

  function propertyNameFrom(data, unit) { return data.properties.find(item => item.id === unit.propertyId)?.name || "عقار غير موجود"; }
  const propertyById = id => state.properties.find(item => item.id === id);
  const unitById = id => state.units.find(item => item.id === id);
  const tenantById = id => state.tenants.find(item => item.id === id);
  const contractById = id => state.contracts.find(item => item.id === id);
  const propertyName = unit => propertyById(unit?.propertyId)?.name || "عقار غير موجود";
  const unitLabel = id => { const unit = unitById(id); return unit ? `${unit.name} - ${propertyName(unit)}` : "وحدة غير موجودة"; };
  const tenantName = id => tenantById(id)?.name || "مستأجر غير موجود";
  const contractLabel = id => { const contract = contractById(id); return contract ? `${contract.displayId || contract.id} — ${tenantName(contract.tenantId)} — ${unitLabel(contract.unitId)}` : "عقد غير موجود"; };
  const statusClass = status => ["مدفوع","مشغولة","ساري","مكتمل"].includes(status) ? "paid" : ["متأخر","قريب الانتهاء","عالية","منتهي"].includes(status) ? "late" : ["شاغرة","جديد"].includes(status) ? "vacant" : "service";

  function toast(message, error = false) {
    let node = document.querySelector(".toast");
    if (!node) { node = document.createElement("div"); node.className = "toast"; node.setAttribute("role", "status"); document.body.appendChild(node); }
    clearTimeout(toastTimer); node.textContent = message; node.classList.toggle("error", error); node.classList.add("show");
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  const pageMeta = {
    dashboard:["لوحة التحكم","ملخص شامل لأداء أملاكك"], properties:["العقارات","إدارة جميع العقارات"],
    units:["الوحدات","متابعة حالة الوحدات وإيجاراتها"], tenants:["المستأجرون","بيانات المستأجرين ووحداتهم"],
    contracts:["العقود","إدارة العقود وتواريخها"], payments:["الدفعات","متابعة الإيرادات والمتأخرات"],
    maintenance:["الصيانة","طلبات الصيانة ومتابعتها"], reports:["التقارير","ملخصات مالية وتشغيلية"], settings:["الإعدادات","تخصيص النظام والتنبيهات"]
  };

  function goTo(page) {
    if (!pageMeta[page]) return;
    activePage = page;
    document.querySelectorAll(".page").forEach(node => node.classList.toggle("active", node.id === `${page}Page`));
    document.querySelectorAll("[data-page]").forEach(node => node.classList.toggle("active", node.dataset.page === page));
    $("pageTitle").textContent = pageMeta[page][0]; $("pageSubtitle").textContent = pageMeta[page][1];
    $("moreMenu").hidden = true; renderPage(page); window.scrollTo({top:0, behavior:"smooth"});
  }

  function monthlyExpectedIncome() {
    return state.properties.reduce((total, property) => {
      const units = state.units.filter(unit => unit.propertyId === property.id);
      return total + (units.length ? units.reduce((sum, unit) => sum + Number(unit.rent || 0), 0) : Number(property.income || 0));
    }, 0);
  }

  function renderDashboard() {
    const occupied = state.units.filter(item => item.status === "مشغولة").length;
    const vacant = state.units.filter(item => item.status === "شاغرة").length;
    const service = state.units.filter(item => item.status === "تحت الصيانة").length;
    const latePayments = state.payments.filter(item => item.status === "متأخر");
    const lateAmount = latePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalUnits = state.units.length;
    $("kpiProperties").textContent = fmt(state.properties.length); $("kpiUnits").textContent = fmt(totalUnits);
    $("kpiOccupancy").textContent = `${totalUnits ? Math.round(occupied / totalUnits * 100) : 0}%`;
    $("kpiIncome").textContent = fmt(monthlyExpectedIncome()); $("kpiLate").textContent = fmt(lateAmount);
    $("lateTotal").innerHTML = `${fmt(lateAmount)} <small>ر.س</small>`; $("latePaymentsCount").textContent = fmt(latePayments.length);
    $("occupiedCount").textContent = fmt(occupied); $("vacantCount").textContent = fmt(vacant); $("serviceCount").textContent = fmt(service);
    const occupiedPct = totalUnits ? occupied / totalUnits * 100 : 0; const vacantPct = totalUnits ? vacant / totalUnits * 100 : 0;
    $("donutChart").style.background = totalUnits ? `conic-gradient(var(--blue) 0 ${occupiedPct}%,var(--green) ${occupiedPct}% ${occupiedPct + vacantPct}%,var(--orange) ${occupiedPct + vacantPct}% 100%)` : "#e9eef5";
    renderNotifications(); renderIncomeChart();
    const expiring = state.contracts.filter(item => item.status === "قريب الانتهاء").slice(0, 5);
    $("expiringContracts").innerHTML = expiring.length ? expiring.map(item => `<div class="compact-item"><div class="day-box">${esc(item.end?.slice(-2) || "—")}</div><div><strong>${esc(unitLabel(item.unitId))}</strong><small>${esc(tenantName(item.tenantId))} — ${esc(item.end)}</small></div></div>`).join("") : '<p class="empty-state">لا توجد عقود قريبة من الانتهاء.</p>';
    const recent = [...state.payments].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,4);
    $("recentPaymentsBody").innerHTML = recent.length ? recent.map(payment => { const contract = contractById(payment.contractId); return `<tr><td>${esc(tenantName(contract?.tenantId))}</td><td>${esc(unitLabel(contract?.unitId))}</td><td>${fmt(payment.amount)} ر.س</td><td><span class="status ${statusClass(payment.status)}">${esc(payment.status)}</span></td><td>${esc(payment.date)}</td></tr>`; }).join("") : '<tr><td colspan="5" class="empty-state">لا توجد دفعات مسجلة.</td></tr>';
  }

  function renderNotifications() {
    const total = (state.settings.notifyPayments ? state.payments.filter(item => item.status === "متأخر").length : 0) + (state.settings.notifyContracts ? state.contracts.filter(item => item.status === "قريب الانتهاء").length : 0) + (state.settings.notifyMaintenance ? state.maintenance.filter(item => item.status !== "مكتمل").length : 0);
    $("notificationCount").textContent = fmt(total); $("notificationCount").hidden = total === 0;
  }

  function renderIncomeChart() {
    const year = Number($("yearSelect").value || new Date().getFullYear());
    const today = new Date(); const months = Array.from({length:6}, (_, offset) => new Date(today.getFullYear(), today.getMonth() - 5 + offset, 1));
    const shown = months.filter(date => date.getFullYear() === year);
    const values = shown.map(month => state.payments.filter(item => item.status === "مدفوع" && validDate(item.date) && new Date(`${item.date}T00:00:00`).getFullYear() === year && new Date(`${item.date}T00:00:00`).getMonth() === month.getMonth()).reduce((sum,item) => sum + Number(item.amount || 0), 0));
    const max = Math.max(...values, 1); const width = 510 / Math.max(shown.length - 1, 1); const points = values.map((value,index) => `${55 + width * index},${210 - value / max * 180}`);
    $("incomeChartLine").setAttribute("points", points.join(" ")); $("incomeChartDots").innerHTML = points.map(point => { const [cx,cy] = point.split(","); return `<circle cx="${cx}" cy="${cy}" r="5"/>`; }).join("");
    $("incomeChartLabels").style.gridTemplateColumns = `repeat(${Math.max(shown.length,1)},1fr)`; $("incomeChartLabels").innerHTML = shown.map(date => `<span>${new Intl.DateTimeFormat("ar-SA",{month:"short"}).format(date)}</span>`).join("");
  }

  function renderProperties() {
    const query = text($("propertySearch").value).toLowerCase(); const items = state.properties.filter(item => `${item.name} ${item.city} ${item.district}`.toLowerCase().includes(query));
    $("propertiesGrid").innerHTML = items.length ? items.map(item => { const units = state.units.filter(unit => unit.propertyId === item.id); return `<article class="card property-card"><div class="property-hero"><div class="property-icon">▦</div></div><div class="property-body"><div class="property-title"><div><h3>${esc(item.name)}</h3><span>${esc(item.city)} - ${esc(item.district)}</span></div><span>${esc(item.type)}</span></div><div class="property-meta"><div><strong>${fmt(units.length)}</strong><small>وحدة</small></div><div><strong>${fmt(units.filter(unit => unit.status === "مشغولة").length)}</strong><small>مشغولة</small></div><div><strong>${fmt(item.income)}</strong><small>ر.س تقديريًا</small></div></div><div class="row-actions"><button class="action-btn" data-edit="property" data-id="${item.id}">تعديل</button><button class="action-btn danger" data-delete="property" data-id="${item.id}">حذف</button></div></div></article>`; }).join("") : '<div class="card empty-state">لا توجد عقارات.</div>';
  }

  function renderUnits() {
    const query = text($("unitSearch").value).toLowerCase(); const filter = $("unitStatusFilter").value;
    const items = state.units.filter(item => `${item.name} ${propertyName(item)}`.toLowerCase().includes(query) && (filter === "all" || item.status === filter));
    $("unitsBody").innerHTML = items.length ? items.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(propertyName(item))}</td><td>${esc(item.type)}</td><td>${fmt(item.rent)} ر.س</td><td><span class="status ${statusClass(item.status)}">${esc(item.status)}</span></td><td><div class="row-actions"><button class="action-btn" data-edit="unit" data-id="${item.id}">تعديل</button><button class="action-btn danger" data-delete="unit" data-id="${item.id}">حذف</button></div></td></tr>`).join("") : '<tr><td colspan="6" class="empty-state">لا توجد وحدات.</td></tr>';
  }

  function renderTenants() {
    const query = text($("tenantSearch").value).toLowerCase(); const items = state.tenants.filter(item => `${item.name} ${item.phone} ${unitLabel(item.unitId)}`.toLowerCase().includes(query));
    $("tenantsBody").innerHTML = items.length ? items.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.phone)}</td><td>${esc(unitLabel(item.unitId))}</td><td><span class="status ${statusClass(item.status)}">${esc(item.status)}</span></td><td><div class="row-actions"><button class="action-btn" data-edit="tenant" data-id="${item.id}">تعديل</button><button class="action-btn danger" data-delete="tenant" data-id="${item.id}">حذف</button></div></td></tr>`).join("") : '<tr><td colspan="5" class="empty-state">لا يوجد مستأجرون.</td></tr>';
  }

  function renderContracts() {
    const query = text($("contractSearch").value).toLowerCase(); const items = state.contracts.filter(item => `${item.displayId} ${tenantName(item.tenantId)} ${unitLabel(item.unitId)}`.toLowerCase().includes(query));
    $("contractsBody").innerHTML = items.length ? items.map(item => `<tr><td>${esc(item.displayId || item.id)}</td><td>${esc(tenantName(item.tenantId))}</td><td>${esc(unitLabel(item.unitId))}</td><td>${esc(item.start)}</td><td>${esc(item.end)}</td><td><span class="status ${statusClass(item.status)}">${esc(item.status)}</span></td><td><div class="row-actions"><button class="action-btn" data-edit="contract" data-id="${item.id}">تعديل</button><button class="action-btn danger" data-delete="contract" data-id="${item.id}">حذف</button></div></td></tr>`).join("") : '<tr><td colspan="7" class="empty-state">لا توجد عقود.</td></tr>';
  }

  function renderPayments() {
    const query = text($("paymentSearch").value).toLowerCase(); const items = state.payments.filter(item => { const contract = contractById(item.contractId); return `${tenantName(contract?.tenantId)} ${unitLabel(contract?.unitId)} ${item.status}`.toLowerCase().includes(query); });
    $("paymentsBody").innerHTML = items.length ? items.map(item => { const contract = contractById(item.contractId); return `<tr><td>${esc(tenantName(contract?.tenantId))}</td><td>${esc(unitLabel(contract?.unitId))}</td><td>${fmt(item.amount)} ر.س</td><td><span class="status ${statusClass(item.status)}">${esc(item.status)}</span></td><td>${esc(item.date)}</td><td><div class="row-actions"><button class="action-btn" data-edit="payment" data-id="${item.id}">تعديل</button><button class="action-btn danger" data-delete="payment" data-id="${item.id}">حذف</button></div></td></tr>`; }).join("") : '<tr><td colspan="6" class="empty-state">لا توجد دفعات.</td></tr>';
  }

  function renderMaintenance() {
    $("maintenanceGrid").innerHTML = state.maintenance.length ? state.maintenance.map(item => `<article class="card maintenance-item"><div class="ticket-head"><h3>${esc(item.title)}</h3><span class="status ${statusClass(item.status)}">${esc(item.status)}</span></div><p>${esc(unitLabel(item.unitId))}</p><div class="ticket-foot"><span>الأولوية: ${esc(item.priority)}</span><span>${esc(item.date)}</span></div><div class="row-actions"><button class="action-btn" data-edit="maintenance" data-id="${item.id}">تعديل</button><button class="action-btn danger" data-delete="maintenance" data-id="${item.id}">حذف</button></div></article>`).join("") : '<div class="card empty-state">لا توجد طلبات صيانة.</div>';
  }

  function renderReports() {
    const collected = state.payments.filter(item => item.status === "مدفوع").reduce((sum,item) => sum + Number(item.amount || 0),0); const overdue = state.payments.filter(item => item.status === "متأخر").reduce((sum,item) => sum + Number(item.amount || 0),0);
    $("reportAnnualIncome").textContent = `${fmt(monthlyExpectedIncome() * 12)} ر.س`; $("reportPropertyCount").textContent = `${fmt(state.properties.length)} عقار`;
    $("reportCollected").textContent = `${fmt(collected)} ر.س`; $("reportPaidCount").textContent = `${fmt(state.payments.filter(item => item.status === "مدفوع").length)} دفعة مدفوعة`;
    $("reportNetIncome").textContent = `${fmt(collected)} ر.س`; $("reportOverdue").textContent = `المتأخرات: ${fmt(overdue)} ر.س`;
  }

  function renderPage(page) { ({dashboard:renderDashboard,properties:renderProperties,units:renderUnits,tenants:renderTenants,contracts:renderContracts,payments:renderPayments,maintenance:renderMaintenance,reports:renderReports}[page] || (()=>{}))(); }
  function renderAfterChange() { renderPage(activePage); if (activePage !== "dashboard") renderNotifications(); refreshOptions(); save(); }

  function optionMarkup(items, label) { return items.length ? items.map(item => `<option value="${item.id}">${esc(label(item))}</option>`).join("") : '<option value="">لا توجد خيارات متاحة</option>'; }
  function refreshOptions() {
    $("unitPropertySelect").innerHTML = optionMarkup(state.properties, item => item.name);
    ["tenantUnitSelect","contractUnitSelect","maintenanceUnitSelect"].forEach(id => $(id).innerHTML = optionMarkup(state.units, item => unitLabel(item.id)));
    $("contractTenantSelect").innerHTML = optionMarkup(state.tenants, item => item.name);
    $("paymentContractSelect").innerHTML = optionMarkup(state.contracts, item => contractLabel(item.id));
  }

  const modalFor = {property:"modalBackdrop",unit:"unitModal",tenant:"tenantModal",contract:"contractModal",payment:"paymentModal",maintenance:"maintenanceModal"};
  const formFor = {property:"propertyForm",unit:"unitForm",tenant:"tenantForm",contract:"contractForm",payment:"paymentForm",maintenance:"maintenanceForm"};
  const collectionFor = {property:"properties",unit:"units",tenant:"tenants",contract:"contracts",payment:"payments",maintenance:"maintenance"};
  const titleFor = {property:["إضافة عقار جديد","تعديل العقار"],unit:["إضافة وحدة","تعديل الوحدة"],tenant:["إضافة مستأجر","تعديل المستأجر"],contract:["إنشاء عقد","تعديل العقد"],payment:["تسجيل دفعة","تعديل الدفعة"],maintenance:["طلب صيانة","تعديل طلب الصيانة"]};

  function openEditor(type, id = "") {
    refreshOptions(); const form = $(formFor[type]); form.reset(); form.elements.id.value = id; const item = state[collectionFor[type]].find(record => record.id === id);
    $(modalFor[type]).querySelector("h2").textContent = titleFor[type][item ? 1 : 0];
    if (item) Object.entries(item).forEach(([key,value]) => { if (form.elements[key]) form.elements[key].value = value; });
    else if (form.elements.date) form.elements.date.value = new Date().toISOString().slice(0,10);
    $(modalFor[type]).classList.add("open"); setTimeout(() => form.querySelector("input:not([type=hidden]),select")?.focus(),0);
  }
  function closeModal(node) { node.classList.remove("open"); }

  function validateRelations(type, record) {
    if (type === "unit" && !propertyById(record.propertyId)) return "اختر عقارًا صحيحًا";
    if (type === "tenant" && !unitById(record.unitId)) return "اختر وحدة صحيحة";
    if (type === "tenant") {
      const existing = tenantById(record.id);
      if (existing && existing.unitId !== record.unitId && state.contracts.some(item => item.tenantId === record.id)) return "لا يمكن تغيير وحدة مستأجر لديه عقد؛ عدّل العقد أو احذفه أولًا";
    }
    if (type === "contract" && (!tenantById(record.tenantId) || !unitById(record.unitId))) return "اختر مستأجرًا ووحدة صحيحين";
    if (type === "contract" && tenantById(record.tenantId)?.unitId !== record.unitId) return "الوحدة المختارة لا تتطابق مع وحدة المستأجر";
    if (type === "contract" && record.end < record.start) return "تاريخ نهاية العقد يجب أن يكون بعد البداية";
    if (type === "payment" && !contractById(record.contractId)) return "اختر عقدًا صحيحًا";
    if (type === "maintenance" && !unitById(record.unitId)) return "اختر وحدة صحيحة";
    return "";
  }

  function upsert(type, record) {
    const items = state[collectionFor[type]]; const existing = items.find(item => item.id === record.id);
    if (existing) Object.assign(existing, record); else items.unshift(record);
    renderAfterChange(); closeModal($(modalFor[type])); toast(existing ? "تم حفظ التعديل" : "تمت الإضافة");
  }

  function deleteRecord(type, id) {
    const counts = {units:0,tenants:0,contracts:0,payments:0,maintenance:0};
    if (type === "property") {
      const unitIds = state.units.filter(item => item.propertyId === id).map(item => item.id); counts.units = unitIds.length;
      const tenantIds = state.tenants.filter(item => unitIds.includes(item.unitId)).map(item => item.id); counts.tenants = tenantIds.length;
      const contractIds = state.contracts.filter(item => unitIds.includes(item.unitId) || tenantIds.includes(item.tenantId)).map(item => item.id); counts.contracts = contractIds.length;
      counts.payments = state.payments.filter(item => contractIds.includes(item.contractId)).length; counts.maintenance = state.maintenance.filter(item => unitIds.includes(item.unitId)).length;
      if (!confirm(`سيتم حذف العقار وكل البيانات المرتبطة: ${counts.units} وحدة، ${counts.tenants} مستأجر، ${counts.contracts} عقد، ${counts.payments} دفعة، ${counts.maintenance} طلب صيانة. هل تريد المتابعة؟`)) return;
      state.properties = state.properties.filter(item => item.id !== id); state.units = state.units.filter(item => !unitIds.includes(item.id)); state.tenants = state.tenants.filter(item => !tenantIds.includes(item.id)); state.contracts = state.contracts.filter(item => !contractIds.includes(item.id)); state.payments = state.payments.filter(item => !contractIds.includes(item.contractId)); state.maintenance = state.maintenance.filter(item => !unitIds.includes(item.unitId));
    } else if (type === "unit") {
      const tenantIds = state.tenants.filter(item => item.unitId === id).map(item => item.id); const contractIds = state.contracts.filter(item => item.unitId === id || tenantIds.includes(item.tenantId)).map(item => item.id);
      if (!confirm(`سيتم حذف الوحدة و${tenantIds.length} مستأجر و${contractIds.length} عقد وكل الدفعات والصيانة المرتبطة. متابعة؟`)) return;
      state.units = state.units.filter(item => item.id !== id); state.tenants = state.tenants.filter(item => !tenantIds.includes(item.id)); state.contracts = state.contracts.filter(item => !contractIds.includes(item.id)); state.payments = state.payments.filter(item => !contractIds.includes(item.contractId)); state.maintenance = state.maintenance.filter(item => item.unitId !== id);
    } else if (type === "tenant") {
      const contractIds = state.contracts.filter(item => item.tenantId === id).map(item => item.id); if (!confirm(`سيتم حذف المستأجر و${contractIds.length} عقد والدفعات المرتبطة. متابعة؟`)) return;
      state.tenants = state.tenants.filter(item => item.id !== id); state.contracts = state.contracts.filter(item => !contractIds.includes(item.id)); state.payments = state.payments.filter(item => !contractIds.includes(item.contractId));
    } else if (type === "contract") {
      const paymentCount = state.payments.filter(item => item.contractId === id).length; if (!confirm(`سيتم حذف العقد و${paymentCount} دفعة مرتبطة. متابعة؟`)) return;
      state.contracts = state.contracts.filter(item => item.id !== id); state.payments = state.payments.filter(item => item.contractId !== id);
    } else { if (!confirm("هل تريد حذف هذا السجل؟")) return; state[collectionFor[type]] = state[collectionFor[type]].filter(item => item.id !== id); }
    renderAfterChange(); toast("تم الحذف مع الحفاظ على سلامة العلاقات");
  }

  function bindForm(type, build) {
    $(formFor[type]).addEventListener("submit", event => {
      event.preventDefault(); const data = new FormData(event.currentTarget); const id = data.get("id") || uid(type); const record = build(data,id); const problem = validateRelations(type,record);
      if (problem) { toast(problem,true); return; } upsert(type,record);
    });
  }

  bindForm("property", (f,id) => ({id,name:text(f.get("name")),city:text(f.get("city")),district:text(f.get("district")),type:f.get("type"),income:Number(f.get("income") || 0)}));
  bindForm("unit", (f,id) => ({id,name:text(f.get("name")),propertyId:f.get("property"),type:f.get("type"),rent:Number(f.get("rent") || 0),status:f.get("status")}));
  bindForm("tenant", (f,id) => ({id,name:text(f.get("name")),phone:text(f.get("phone")),unitId:f.get("unitId"),status:f.get("status")}));
  bindForm("contract", (f,id) => ({id,displayId:state.contracts.find(item=>item.id===id)?.displayId || `C-${String(Date.now()).slice(-6)}`,tenantId:f.get("tenantId"),unitId:f.get("unitId"),start:f.get("start"),end:f.get("end"),status:f.get("status")}));
  bindForm("payment", (f,id) => ({id,contractId:f.get("contractId"),amount:Number(f.get("amount") || 0),date:f.get("date"),status:f.get("status")}));
  bindForm("maintenance", (f,id) => ({id,title:text(f.get("title")),unitId:f.get("unitId"),priority:f.get("priority"),status:f.get("status"),date:f.get("date")}));

  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]"); if (pageButton) { goTo(pageButton.dataset.page); return; }
    const goto = event.target.closest("[data-goto]"); if (goto) { goTo(goto.dataset.goto); return; }
    const edit = event.target.closest("[data-edit][data-id]"); if (edit) { openEditor(edit.dataset.edit,edit.dataset.id); return; }
    const del = event.target.closest("[data-delete][data-id]"); if (del) { deleteRecord(del.dataset.delete,del.dataset.id); return; }
  });
  document.querySelectorAll(".modal-backdrop").forEach(node => node.addEventListener("click", event => { if (event.target === node || event.target.closest(".modal-close") || event.target.id === "closeModal") closeModal(node); }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") document.querySelectorAll(".modal-backdrop.open").forEach(closeModal); });

  [["quickAddBtn","property"],["addPropertyBtn","property"],["addUnitBtn","unit"],["addTenantBtn","tenant"],["addContractBtn","contract"],["addPaymentBtn","payment"],["addMaintenanceBtn","maintenance"]].forEach(([id,type]) => $(id).addEventListener("click", () => {
    const required = {unit:state.properties,tenant:state.units,contract:state.tenants,payment:state.contracts,maintenance:state.units}[type];
    if (required && !required.length) { toast("أضف البيانات الأساسية المطلوبة أولًا",true); return; } openEditor(type);
  }));

  const renderDebounced = (() => { let timer; return fn => { clearTimeout(timer); timer=setTimeout(fn,120); }; })();
  $("propertySearch").addEventListener("input", () => renderDebounced(renderProperties)); $("unitSearch").addEventListener("input", () => renderDebounced(renderUnits)); $("tenantSearch").addEventListener("input", () => renderDebounced(renderTenants)); $("contractSearch").addEventListener("input", () => renderDebounced(renderContracts)); $("paymentSearch").addEventListener("input", () => renderDebounced(renderPayments));
  $("unitStatusFilter").addEventListener("change", renderUnits); $("yearSelect").addEventListener("change", renderIncomeChart);
  $("contractTenantSelect").addEventListener("change", event => {
    const unitId = tenantById(event.target.value)?.unitId;
    if (unitId && unitById(unitId)) $("contractUnitSelect").value = unitId;
  });
  $("notificationsBtn").addEventListener("click", () => toast($("notificationCount").hidden ? "لا توجد تنبيهات حالية" : `لديك ${$("notificationCount").textContent} تنبيه`));
  $("mobileMoreBtn").addEventListener("click", () => $("moreMenu").hidden = !$("moreMenu").hidden);

  $("settingsForm").addEventListener("submit", event => { event.preventDefault(); const f=new FormData(event.currentTarget); Object.assign(state.settings,{companyName:text(f.get("companyName")),taxNumber:text(f.get("taxNumber")),contactNumber:text(f.get("contactNumber"))}); save(); toast("تم حفظ الإعدادات"); });
  [["notifyContracts","notifyContracts"],["notifyPayments","notifyPayments"],["notifyMaintenance","notifyMaintenance"]].forEach(([id,key]) => $(id).addEventListener("change", event => { state.settings[key]=event.target.checked; save(); renderNotifications(); }));

  function init() {
    const currentYear = new Date().getFullYear(); $("yearSelect").innerHTML = [currentYear,currentYear-1].map(year => `<option>${year}</option>`).join("");
    const form=$("settingsForm"); form.elements.companyName.value=state.settings.companyName; form.elements.taxNumber.value=state.settings.taxNumber; form.elements.contactNumber.value=state.settings.contactNumber;
    $("notifyContracts").checked=state.settings.notifyContracts; $("notifyPayments").checked=state.settings.notifyPayments; $("notifyMaintenance").checked=state.settings.notifyMaintenance;
    refreshOptions(); renderDashboard(); save();
  }
  init();
})();
