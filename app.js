(() => {
  "use strict";

  const emptySeed = {
    properties: [],
    units: [],
    tenants: [],
    contracts: [],
    payments: [],
    maintenance: [],
    expenses: []
  };

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem("amlakState") || "null");
      const source = stored && typeof stored === "object" ? stored : emptySeed;
      return {
        properties: Array.isArray(source.properties) ? source.properties : [],
        units: Array.isArray(source.units) ? source.units : [],
        tenants: Array.isArray(source.tenants) ? source.tenants : [],
        contracts: Array.isArray(source.contracts) ? source.contracts : [],
        payments: Array.isArray(source.payments) ? source.payments : [],
        maintenance: Array.isArray(source.maintenance) ? source.maintenance : [],
        expenses: Array.isArray(source.expenses) ? source.expenses : []
      };
    } catch (error) {
      console.error("تعذر قراءة البيانات المحفوظة:", error);
      return structuredClone(emptySeed);
    }
  }

  const state = loadState();

  // Add stable IDs to old records without deleting any saved data.
  const ensureIds = (items, prefix) => items.forEach((item, index) => {
    if (!item.id) item.id = `${prefix}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
  });
  ensureIds(state.properties, "property");
  ensureIds(state.units, "unit");
  ensureIds(state.tenants, "tenant");
  ensureIds(state.contracts, "contract");
  ensureIds(state.payments, "payment");
  ensureIds(state.maintenance, "maintenance");

  const $ = id => document.getElementById(id);
  const fmt = value => new Intl.NumberFormat("ar-SA").format(Number(value || 0));
  const save = () => localStorage.setItem("amlakState", JSON.stringify(state));

  const pageMeta = {
    dashboard:["لوحة التحكم","ملخص شامل لأداء أملاكك"],
    properties:["العقارات","إدارة جميع العقارات والمحافظ"],
    units:["الوحدات","متابعة حالة كل وحدة وإيجارها"],
    tenants:["المستأجرون","بيانات المستأجرين وحالة السداد"],
    contracts:["العقود","إدارة العقود وتجديدها"],
    payments:["الدفعات","متابعة الإيرادات والمتأخرات"],
    maintenance:["الصيانة","طلبات الصيانة ومتابعتها"],
    reports:["التقارير","ملخصات مالية وتشغيلية"],
    settings:["الإعدادات","تخصيص النظام والتنبيهات"]
  };

  function toast(message) {
    let element = document.querySelector(".toast");
    if (!element) {
      element = document.createElement("div");
      element.className = "toast";
      document.body.appendChild(element);
    }
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1800);
  }

  function goTo(page) {
    document.querySelectorAll(".page").forEach(element => element.classList.remove("active"));
    const target = $(`${page}Page`);
    if (target) target.classList.add("active");

    document.querySelectorAll("[data-page]").forEach(button => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    if (pageMeta[page]) {
      $("pageTitle").textContent = pageMeta[page][0];
      $("pageSubtitle").textContent = pageMeta[page][1];
    }
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function statusClass(status) {
    if (["مدفوع","مشغولة","ساري","مكتمل"].includes(status)) return "paid";
    if (["متأخر","قريب الانتهاء","عالية"].includes(status)) return "late";
    if (["شاغرة","جديد"].includes(status)) return "vacant";
    return "service";
  }

  function monthlyExpectedIncome() {
    // Prefer actual unit rents when units exist; otherwise use the property estimate.
    if (state.units.length) return state.units.reduce((sum, unit) => sum + Number(unit.rent || 0), 0);
    return state.properties.reduce((sum, property) => sum + Number(property.income || 0), 0);
  }

  function unitStats() {
    return {
      occupied: state.units.filter(unit => unit.status === "مشغولة").length,
      vacant: state.units.filter(unit => unit.status === "شاغرة").length,
      service: state.units.filter(unit => unit.status === "تحت الصيانة").length
    };
  }

  function refreshPropertyUnitCounts() {
    state.properties.forEach(property => {
      const linked = state.units.filter(unit => unit.propertyId === property.id || unit.property === property.name);
      property.units = linked.length;
      property.occupied = linked.filter(unit => unit.status === "مشغولة").length;
    });
  }

  function renderDashboard() {
    refreshPropertyUnitCounts();
    const stats = unitStats();
    const totalUnits = state.units.length;
    const occupancy = totalUnits ? Math.round((stats.occupied / totalUnits) * 100) : 0;
    const income = monthlyExpectedIncome();
    const lateAmount = state.payments
      .filter(payment => payment.status === "متأخر")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    $("kpiProperties").textContent = fmt(state.properties.length);
    $("kpiUnits").textContent = fmt(totalUnits);
    $("kpiOccupancy").textContent = `${occupancy}%`;
    $("kpiIncome").textContent = fmt(income);
    $("kpiLate").textContent = fmt(lateAmount);
    $("lateTotal").innerHTML = `${fmt(lateAmount)} <small>ر.س</small>`;

    $("occupiedCount").textContent = stats.occupied;
    $("vacantCount").textContent = stats.vacant;
    $("serviceCount").textContent = stats.service;

    const donut = $("donutChart");
    if (totalUnits === 0) {
      donut.style.background = "conic-gradient(#e9eef5 0 100%)";
    } else {
      const occupiedPct = (stats.occupied / totalUnits) * 100;
      const vacantPct = (stats.vacant / totalUnits) * 100;
      donut.style.background =
        `conic-gradient(var(--blue) 0 ${occupiedPct}%,
        var(--green) ${occupiedPct}% ${occupiedPct + vacantPct}%,
        var(--orange) ${occupiedPct + vacantPct}% 100%)`;
    }

    const expiring = state.contracts.filter(contract => contract.status === "قريب الانتهاء");
    $("expiringContracts").innerHTML = expiring.length
      ? expiring.map((contract, index) => `
          <div class="compact-item">
            <div class="day-box">${index + 1}</div>
            <div><strong>${contract.unit} - ${contract.tenant}</strong><small>ينتهي في ${contract.end}</small></div>
          </div>`).join("")
      : '<p class="empty-state">لا توجد عقود قريبة من الانتهاء.</p>';

    $("recentPaymentsBody").innerHTML = state.payments.length
      ? state.payments.slice(0,4).map(payment => `
          <tr>
            <td>${payment.tenant}</td><td>${payment.unit}</td>
            <td>${fmt(payment.amount)} ر.س</td>
            <td><span class="status ${statusClass(payment.status)}">${payment.status}</span></td>
            <td>${payment.date}</td>
          </tr>`).join("")
      : '<tr><td colspan="5" class="empty-state">لا توجد دفعات مسجلة.</td></tr>';
  }

  function renderProperties(filter = "") {
    refreshPropertyUnitCounts();
    const query = filter.trim().toLowerCase();
    const data = state.properties.filter(property =>
      `${property.name} ${property.city} ${property.district}`.toLowerCase().includes(query)
    );

    $("propertiesGrid").innerHTML = data.length
      ? data.map(property => `
          <article class="card property-card">
            <div class="property-hero"><div class="property-icon">▦</div></div>
            <div class="property-body">
              <div class="property-title">
                <div><h3>${property.name}</h3><span>${property.city} - ${property.district}</span></div>
                <span>${property.type}</span>
              </div>
              <div class="property-meta">
                <div><strong>${property.units}</strong><small>وحدة</small></div>
                <div><strong>${property.occupied}</strong><small>مشغولة</small></div>
                <div><strong>${fmt(property.income)}</strong><small>ر.س تقديريًا</small></div>
              </div>
              <div class="row-actions" style="margin-top:12px">
                <button type="button" class="action-btn danger" data-delete="property" data-id="${property.id}">حذف العقار</button>
              </div>
            </div>
          </article>`).join("")
      : '<div class="card empty-state">لا توجد عقارات. اضغط «إضافة عقار» للبدء.</div>';
  }

  function renderUnits() {
    const query = $("unitSearch").value.toLowerCase();
    const filter = $("unitStatusFilter").value;
    const data = state.units.filter(unit =>
      `${unit.name} ${unit.property}`.toLowerCase().includes(query) &&
      (filter === "all" || unit.status === filter)
    );

    $("unitsBody").innerHTML = data.length
      ? data.map(unit => `
          <tr>
            <td>${unit.name}</td><td>${unit.property}</td><td>${unit.type}</td>
            <td>${fmt(unit.rent)} ر.س</td>
            <td><span class="status ${statusClass(unit.status)}">${unit.status}</span></td>
            <td><button type="button" class="action-btn danger" data-delete="unit" data-id="${unit.id}">حذف</button></td>
          </tr>`).join("")
      : '<tr><td colspan="6" class="empty-state">لا توجد وحدات.</td></tr>';
  }

  function renderTenants() {
    const query = $("tenantSearch").value.toLowerCase();
    const data = state.tenants.filter(tenant =>
      `${tenant.name} ${tenant.phone} ${tenant.unit}`.toLowerCase().includes(query)
    );

    $("tenantsBody").innerHTML = data.length
      ? data.map(tenant => `
          <tr>
            <td>${tenant.name}</td><td>${tenant.phone}</td><td>${tenant.unit}</td>
            <td><span class="status ${statusClass(tenant.status)}">${tenant.status}</span></td>
            <td><button type="button" class="action-btn danger" data-delete="tenant" data-id="${tenant.id}">حذف</button></td>
          </tr>`).join("")
      : '<tr><td colspan="5" class="empty-state">لا يوجد مستأجرون.</td></tr>';
  }

  function renderContracts() {
    const query = $("contractSearch").value.toLowerCase();
    const data = state.contracts.filter(contract =>
      `${contract.id} ${contract.tenant} ${contract.unit}`.toLowerCase().includes(query)
    );

    $("contractsBody").innerHTML = data.length
      ? data.map(contract => `
          <tr>
            <td>${contract.displayId || contract.id}</td><td>${contract.tenant}</td><td>${contract.unit}</td>
            <td>${contract.start}</td><td>${contract.end}</td>
            <td><span class="status ${statusClass(contract.status)}">${contract.status}</span></td>
            <td><button type="button" class="action-btn danger" data-delete="contract" data-id="${contract.id}">حذف</button></td>
          </tr>`).join("")
      : '<tr><td colspan="7" class="empty-state">لا توجد عقود.</td></tr>';
  }

  function renderPayments() {
    const query = $("paymentSearch").value.toLowerCase();
    const data = state.payments.filter(payment =>
      `${payment.tenant} ${payment.unit} ${payment.status}`.toLowerCase().includes(query)
    );

    $("paymentsBody").innerHTML = data.length
      ? data.map(payment => `
          <tr>
            <td>${payment.tenant}</td><td>${payment.unit}</td><td>${fmt(payment.amount)} ر.س</td>
            <td><span class="status ${statusClass(payment.status)}">${payment.status}</span></td>
            <td>${payment.date}</td>
            <td><button type="button" class="action-btn danger" data-delete="payment" data-id="${payment.id}">حذف</button></td>
          </tr>`).join("")
      : '<tr><td colspan="6" class="empty-state">لا توجد دفعات.</td></tr>';
  }

  function renderMaintenance() {
    $("maintenanceGrid").innerHTML = state.maintenance.length
      ? state.maintenance.map(item => `
          <article class="card maintenance-item">
            <div class="ticket-head"><h3>${item.title}</h3><span class="status ${statusClass(item.status)}">${item.status}</span></div>
            <p>${item.unit}</p>
            <div class="ticket-foot"><span>الأولوية: ${item.priority}</span><span>${item.date}</span></div>
            <div class="row-actions" style="margin-top:12px">
              <button type="button" class="action-btn danger" data-delete="maintenance" data-id="${item.id}">حذف</button>
            </div>
          </article>`).join("")
      : '<div class="card empty-state">لا توجد طلبات صيانة.</div>';
  }

  function renderReports() {
    const monthlyIncome = monthlyExpectedIncome();
    const annualIncome = monthlyIncome * 12;
    const collected = state.payments
      .filter(payment => payment.status === "مدفوع")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const overdue = state.payments
      .filter(payment => payment.status === "متأخر")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const expenses = state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const paidCount = state.payments.filter(payment => payment.status === "مدفوع").length;

    $("reportAnnualIncome").textContent = `${fmt(annualIncome)} ر.س`;
    $("reportPropertyCount").textContent = `${fmt(state.properties.length)} عقار`;
    $("reportCollected").textContent = `${fmt(collected)} ر.س`;
    $("reportPaidCount").textContent = `${fmt(paidCount)} دفعة مدفوعة`;
    $("reportNetIncome").textContent = `${fmt(collected - expenses)} ر.س`;
    $("reportOverdue").textContent = `المتأخرات: ${fmt(overdue)} ر.س`;
  }

  function renderAll() {
    renderDashboard();
    renderProperties($("propertySearch").value);
    renderUnits();
    renderTenants();
    renderContracts();
    renderPayments();
    renderMaintenance();
    renderReports();
    refreshUnitPropertyOptions();
    save();
  }

  function openModal(id) {
    const modal = $(id);
    if (modal) modal.classList.add("open");
  }

  function closeModal(id) {
    const modal = $(id);
    if (modal) modal.classList.remove("open");
  }

  function refreshUnitPropertyOptions() {
    const select = $("unitPropertySelect");
    if (!select) return;
    if (!state.properties.length) {
      select.innerHTML = '<option value="">أضف عقارًا أولًا</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = state.properties
      .map(property => `<option value="${property.id}">${property.name}</option>`)
      .join("");
  }

  function deleteRecord(type, id) {
    if (type === "property") {
      const property = state.properties.find(item => item.id === id);
      if (!property) return;
      const linkedUnits = state.units.filter(unit => unit.propertyId === id || unit.property === property.name);
      const message = linkedUnits.length
        ? `سيتم حذف العقار و${linkedUnits.length} وحدة مرتبطة به. هل تريد المتابعة؟`
        : `هل تريد حذف العقار: ${property.name}؟`;
      if (!confirm(message)) return;
      state.properties = state.properties.filter(item => item.id !== id);
      state.units = state.units.filter(unit => unit.propertyId !== id && unit.property !== property.name);
      toast("تم حذف العقار والوحدات المرتبطة");
    } else {
      const collectionName = `${type}s`;
      const collection = state[collectionName];
      if (!Array.isArray(collection)) return;
      if (!confirm("هل تريد حذف هذا السجل؟")) return;
      state[collectionName] = collection.filter(item => item.id !== id);
      toast("تم الحذف");
    }
    renderAll();
  }

  // Navigation.
  document.querySelectorAll("[data-page]").forEach(button =>
    button.addEventListener("click", () => goTo(button.dataset.page))
  );
  document.querySelectorAll("[data-goto]").forEach(button =>
    button.addEventListener("click", () => goTo(button.dataset.goto))
  );

  // Search/filter.
  $("propertySearch").addEventListener("input", event => renderProperties(event.target.value));
  $("unitSearch").addEventListener("input", renderUnits);
  $("unitStatusFilter").addEventListener("change", renderUnits);
  $("tenantSearch").addEventListener("input", renderTenants);
  $("contractSearch").addEventListener("input", renderContracts);
  $("paymentSearch").addEventListener("input", renderPayments);

  // Open modals.
  $("quickAddBtn").addEventListener("click", () => openModal("modalBackdrop"));
  $("addPropertyBtn").addEventListener("click", () => openModal("modalBackdrop"));
  $("closeModal").addEventListener("click", () => closeModal("modalBackdrop"));
  $("addUnitBtn").addEventListener("click", () => {
    refreshUnitPropertyOptions();
    if (!state.properties.length) {
      alert("أضف عقارًا أولًا قبل إضافة وحدة.");
      goTo("properties");
      return;
    }
    openModal("unitModal");
  });
  $("addTenantBtn").addEventListener("click", () => openModal("tenantModal"));
  $("addContractBtn").addEventListener("click", () => openModal("contractModal"));
  $("addPaymentBtn").addEventListener("click", () => openModal("paymentModal"));
  $("addMaintenanceBtn").addEventListener("click", () => openModal("maintenanceModal"));

  document.querySelectorAll(".modal-close").forEach(button =>
    button.addEventListener("click", () => button.closest(".modal-backdrop").classList.remove("open"))
  );
  document.querySelectorAll(".modal-backdrop").forEach(backdrop =>
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) backdrop.classList.remove("open");
    })
  );

  // Forms.
  $("propertyForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.properties.push({
      id: `property-${Date.now()}`,
      name: form.get("name").trim(),
      city: form.get("city").trim(),
      district: form.get("district").trim(),
      units: 0,
      occupied: 0,
      type: form.get("type"),
      income: Number(form.get("income") || 0)
    });
    event.target.reset();
    closeModal("modalBackdrop");
    renderAll();
    goTo("properties");
    toast("تمت إضافة العقار");
  });

  $("unitForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const property = state.properties.find(item => item.id === form.get("property"));
    if (!property) {
      alert("اختر عقارًا صحيحًا.");
      return;
    }
    state.units.unshift({
      id: `unit-${Date.now()}`,
      name: form.get("name").trim(),
      propertyId: property.id,
      property: property.name,
      type: form.get("type"),
      rent: Number(form.get("rent") || 0),
      status: form.get("status")
    });
    event.target.reset();
    closeModal("unitModal");
    renderAll();
    toast("تمت إضافة الوحدة");
  });

  $("tenantForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.tenants.unshift({
      id: `tenant-${Date.now()}`,
      name: form.get("name").trim(),
      phone: form.get("phone").trim(),
      unit: form.get("unit").trim(),
      status: form.get("status")
    });
    event.target.reset();
    closeModal("tenantModal");
    renderAll();
    toast("تمت إضافة المستأجر");
  });

  $("contractForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const id = `contract-${Date.now()}`;
    state.contracts.unshift({
      id,
      displayId: `C-${String(Date.now()).slice(-5)}`,
      tenant: form.get("tenant").trim(),
      unit: form.get("unit").trim(),
      start: form.get("start"),
      end: form.get("end"),
      status: form.get("status")
    });
    event.target.reset();
    closeModal("contractModal");
    renderAll();
    toast("تم إنشاء العقد");
  });

  $("paymentForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.payments.unshift({
      id: `payment-${Date.now()}`,
      tenant: form.get("tenant").trim(),
      unit: form.get("unit").trim(),
      amount: Number(form.get("amount") || 0),
      status: form.get("status"),
      date: form.get("date")
    });
    event.target.reset();
    closeModal("paymentModal");
    renderAll();
    toast("تم تسجيل الدفعة");
  });

  $("maintenanceForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData(event.target);
    state.maintenance.unshift({
      id: `maintenance-${Date.now()}`,
      title: form.get("title").trim(),
      unit: form.get("unit").trim(),
      priority: form.get("priority"),
      status: form.get("status"),
      date: form.get("date")
    });
    event.target.reset();
    closeModal("maintenanceModal");
    renderAll();
    toast("تم إنشاء طلب الصيانة");
  });

  // One reliable delegated delete handler for all pages.
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-delete][data-id]");
    if (!button) return;
    deleteRecord(button.dataset.delete, button.dataset.id);
  });

  renderAll();
})();