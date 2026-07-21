
const seed = {
  properties: [
    {id:1,name:"عمارة النخيل",city:"جدة",district:"الزهراء",units:12,type:"عمارة",income:36000,occupied:11},
    {id:2,name:"مجمع الورد التجاري",city:"جدة",district:"الفيصلية",units:8,type:"مجمع تجاري",income:42000,occupied:7},
    {id:3,name:"فلل الياسمين",city:"الرياض",district:"الياسمين",units:6,type:"فلل",income:30000,occupied:5},
    {id:4,name:"مكاتب العليا",city:"الرياض",district:"العليا",units:10,type:"مكاتب",income:48000,occupied:9},
    {id:5,name:"عمارة المرجان",city:"جدة",district:"المرجان",units:14,type:"عمارة",income:39000,occupied:12},
    {id:6,name:"سكن الروضة",city:"جدة",district:"الروضة",units:14,type:"عمارة",income:34000,occupied:12}
  ],
  units: [
    {name:"شقة 101",property:"عمارة النخيل",type:"شقة",rent:5000,status:"مشغولة"},
    {name:"شقة 102",property:"عمارة النخيل",type:"شقة",rent:4800,status:"مشغولة"},
    {name:"محل 3",property:"مجمع الورد التجاري",type:"محل",rent:12000,status:"شاغرة"},
    {name:"فيلا 12",property:"فلل الياسمين",type:"فيلا",rent:45000,status:"مشغولة"},
    {name:"مكتب 5",property:"مكاتب العليا",type:"مكتب",rent:9600,status:"تحت الصيانة"}
  ],
  tenants: [
    {name:"أحمد محمد",phone:"0501234567",unit:"شقة 101 - عمارة النخيل",status:"مدفوع"},
    {name:"سارة عبدالله",phone:"0552345678",unit:"شقة 102 - عمارة النخيل",status:"مدفوع"},
    {name:"شركة الهدف",phone:"0563456789",unit:"محل 3 - مجمع الورد",status:"متأخر"},
    {name:"محمد علي",phone:"0534567890",unit:"فيلا 12 - الياسمين",status:"متأخر"}
  ],
  contracts: [
    {id:"C-1001",tenant:"أحمد محمد",unit:"شقة 101",start:"2025-09-01",end:"2026-08-15",status:"ساري"},
    {id:"C-1002",tenant:"سارة عبدالله",unit:"شقة 102",start:"2025-08-01",end:"2026-08-05",status:"قريب الانتهاء"},
    {id:"C-1003",tenant:"شركة الهدف",unit:"محل 3",start:"2025-07-01",end:"2026-07-27",status:"قريب الانتهاء"},
    {id:"C-1004",tenant:"محمد علي",unit:"فيلا 12",start:"2025-09-15",end:"2026-09-15",status:"ساري"}
  ],
  payments: [
    {tenant:"أحمد محمد",unit:"عمارة النخيل - شقة 101",amount:5000,status:"مدفوع",date:"2026-07-20"},
    {tenant:"سارة عبدالله",unit:"عمارة النخيل - شقة 102",amount:4800,status:"مدفوع",date:"2026-07-19"},
    {tenant:"شركة الهدف",unit:"مجمع الورد - محل 3",amount:12000,status:"متأخر",date:"2026-07-18"},
    {tenant:"محمد علي",unit:"فلل الياسمين - فيلا 12",amount:4500,status:"متأخر",date:"2026-07-15"}
  ],
  maintenance: [
    {title:"تسرب مياه في المطبخ",unit:"شقة 204 - عمارة النخيل",priority:"عالية",status:"قيد التنفيذ",date:"2026-07-20"},
    {title:"صيانة مكيف",unit:"مكتب 5 - مكاتب العليا",priority:"متوسطة",status:"جديد",date:"2026-07-19"},
    {title:"إصلاح باب المدخل",unit:"فيلا 12 - الياسمين",priority:"منخفضة",status:"مكتمل",date:"2026-07-18"}
  ]
};

const state = JSON.parse(localStorage.getItem("amlakState") || "null") || seed;
state.properties = Array.isArray(state.properties) ? state.properties : [];
state.units = Array.isArray(state.units) ? state.units : [];
state.tenants = Array.isArray(state.tenants) ? state.tenants : [];
state.contracts = Array.isArray(state.contracts) ? state.contracts : [];
state.payments = Array.isArray(state.payments) ? state.payments : [];
state.maintenance = Array.isArray(state.maintenance) ? state.maintenance : [];
state.expenses = Array.isArray(state.expenses) ? state.expenses : [];
const save = () => localStorage.setItem("amlakState", JSON.stringify(state));
const fmt = n => new Intl.NumberFormat("ar-SA").format(n);

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

function goTo(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(page+"Page").classList.add("active");
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.getElementById("pageTitle").textContent = pageMeta[page][0];
  document.getElementById("pageSubtitle").textContent = pageMeta[page][1];
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.goto)));

function statusClass(status){
  if(["مدفوع","مشغولة","ساري","مكتمل"].includes(status)) return "paid";
  if(["متأخر","قريب الانتهاء","عالية"].includes(status)) return "late";
  if(["شاغرة","جديد"].includes(status)) return "vacant";
  return "service";
}

function renderDashboard(){
  const totalProps = state.properties.length;
  const totalUnits = state.properties.reduce((a,p)=>a+Number(p.units),0);
  const occupied = state.properties.reduce((a,p)=>a+Number(p.occupied||0),0);
  const occupancy = totalUnits ? Math.round(occupied/totalUnits*100) : 0;
  const income = state.properties.reduce((a,p)=>a+Number(p.income),0);
  document.getElementById("kpiProperties").textContent = fmt(totalProps);
  document.getElementById("kpiUnits").textContent = fmt(totalUnits);
  document.getElementById("kpiOccupancy").textContent = occupancy+"%";
  document.getElementById("kpiIncome").textContent = fmt(income);
  const lateAmount = state.payments
    .filter(p=>p.status==="متأخر")
    .reduce((sum,p)=>sum+Number(p.amount||0),0);
  document.getElementById("kpiLate").textContent = fmt(lateAmount);
  document.getElementById("lateTotal").innerHTML = `${fmt(lateAmount)} <small>ر.س</small>`;

  const expiring = state.contracts.filter(c=>c.status==="قريب الانتهاء");
  document.getElementById("expiringContracts").innerHTML = expiring.map((c,i)=>`
    <div class="compact-item">
      <div class="day-box">${i+1}</div>
      <div><strong>${c.unit} - ${c.tenant}</strong><small>ينتهي في ${c.end}</small></div>
    </div>`).join("") || "<p>لا توجد عقود قريبة من الانتهاء.</p>";

  document.getElementById("recentPaymentsBody").innerHTML = state.payments.slice(0,4).map(p=>`
    <tr><td>${p.tenant}</td><td>${p.unit}</td><td>${fmt(p.amount)} ر.س</td>
    <td><span class="status ${statusClass(p.status)}">${p.status}</span></td><td>${p.date}</td></tr>`).join("");
}

function renderProperties(filter=""){
  const q=filter.trim().toLowerCase();
  const data=state.properties.filter(p=>`${p.name} ${p.city} ${p.district}`.toLowerCase().includes(q));
  document.getElementById("propertiesGrid").innerHTML=data.map(p=>`
    <article class="card property-card">
      <div class="property-hero"><div class="property-icon">▦</div></div>
      <div class="property-body">
        <div class="property-title"><div><h3>${p.name}</h3><span>${p.city} - ${p.district}</span></div><span>${p.type}</span></div>
        <div class="property-meta">
          <div><strong>${p.units}</strong><small>وحدة</small></div>
          <div><strong>${p.occupied}</strong><small>مشغولة</small></div>
          <div><strong>${fmt(p.income)}</strong><small>ر.س شهريًا</small></div>
        </div>
        <div class="row-actions" style="margin-top:12px"><button type="button" class="action-btn danger delete-property-btn" data-property-id="${p.id}">حذف العقار</button></div>
      </div>
    </article>`).join("");
}

function renderUnits(){
  const q=document.getElementById("unitSearch").value.toLowerCase();
  const f=document.getElementById("unitStatusFilter").value;
  const data=state.units
    .map((unit,index)=>({...unit,_index:index}))
    .filter(u=>(`${u.name} ${u.property}`.toLowerCase().includes(q))&&(f==="all"||u.status===f));

  document.getElementById("unitsBody").innerHTML=data.map(u=>`
    <tr>
      <td>${u.name}</td>
      <td>${u.property}</td>
      <td>${u.type}</td>
      <td>${fmt(u.rent)} ر.س</td>
      <td><span class="status ${statusClass(u.status)}">${u.status}</span></td>
      <td>
        <button type="button" class="action-btn danger delete-unit-btn" data-unit-index="${u._index}">
          حذف
        </button>
      </td>
    </tr>`).join("");
}

function renderTenants(){
  const q=document.getElementById("tenantSearch").value.toLowerCase();
  document.getElementById("tenantsBody").innerHTML=state.tenants.filter(t=>`${t.name} ${t.phone} ${t.unit}`.toLowerCase().includes(q)).map((t,i)=>`
    <tr><td>${t.name}</td><td>${t.phone}</td><td>${t.unit}</td><td><span class="status ${statusClass(t.status)}">${t.status}</span></td>
    <td><div class="row-actions"><button class="action-btn danger" onclick="removeItem('tenants',${i})">حذف</button></div></td></tr>`).join("");
}

function renderContracts(){
  const q=document.getElementById("contractSearch").value.toLowerCase();
  document.getElementById("contractsBody").innerHTML=state.contracts.filter(c=>`${c.id} ${c.tenant} ${c.unit}`.toLowerCase().includes(q)).map((c,i)=>`
    <tr><td>${c.id}</td><td>${c.tenant}</td><td>${c.unit}</td><td>${c.start}</td><td>${c.end}</td>
    <td><span class="status ${statusClass(c.status)}">${c.status}</span></td>
    <td><div class="row-actions"><button class="action-btn danger" onclick="removeItem('contracts',${i})">حذف</button></div></td></tr>`).join("");
}

function renderPayments(){
  const q=document.getElementById("paymentSearch").value.toLowerCase();
  document.getElementById("paymentsBody").innerHTML=state.payments.filter(p=>`${p.tenant} ${p.unit} ${p.status}`.toLowerCase().includes(q)).map((p,i)=>`
    <tr><td>${p.tenant}</td><td>${p.unit}</td><td>${fmt(p.amount)} ر.س</td><td><span class="status ${statusClass(p.status)}">${p.status}</span></td><td>${p.date}</td>
    <td><div class="row-actions"><button class="action-btn danger" onclick="removeItem('payments',${i})">حذف</button></div></td></tr>`).join("");
}

function renderMaintenance(){
  document.getElementById("maintenanceGrid").innerHTML=state.maintenance.map((m,i)=>`
    <article class="card maintenance-item">
      <div class="ticket-head"><h3>${m.title}</h3><span class="status ${statusClass(m.status)}">${m.status}</span></div>
      <p>${m.unit}</p>
      <div class="ticket-foot"><span>الأولوية: ${m.priority}</span><span>${m.date}</span></div>
      <div class="row-actions" style="margin-top:12px"><button class="action-btn danger" onclick="removeItem('maintenance',${i})">حذف</button></div>
    </article>`).join("");
}

document.getElementById("propertySearch").addEventListener("input",e=>renderProperties(e.target.value));
document.getElementById("unitSearch").addEventListener("input",renderUnits);
document.getElementById("unitStatusFilter").addEventListener("change",renderUnits);
document.getElementById("tenantSearch").addEventListener("input",renderTenants);
document.getElementById("contractSearch").addEventListener("input",renderContracts);
document.getElementById("paymentSearch").addEventListener("input",renderPayments);

const modal=document.getElementById("modalBackdrop");
const openModal=()=>modal.classList.add("open");
const closeModal=()=>modal.classList.remove("open");
document.getElementById("quickAddBtn").addEventListener("click",openModal);
document.getElementById("addPropertyBtn").addEventListener("click",openModal);
document.getElementById("closeModal").addEventListener("click",closeModal);
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});

document.getElementById("propertyForm").addEventListener("submit",e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const units=Number(f.get("units"));
  state.properties.push({
    id:Date.now(),
    name:f.get("name"),
    city:f.get("city"),
    district:f.get("district"),
    units,
    type:f.get("type"),
    income:Number(f.get("income")),
    occupied:0
  });
  save(); renderDashboard(); renderReports(); renderProperties(); closeModal(); e.target.reset();
  goTo("properties");
});


const openNamedModal=id=>document.getElementById(id).classList.add("open");
document.getElementById("addTenantBtn").addEventListener("click",()=>openNamedModal("tenantModal"));
document.getElementById("addContractBtn").addEventListener("click",()=>openNamedModal("contractModal"));
document.getElementById("addPaymentBtn").addEventListener("click",()=>openNamedModal("paymentModal"));
document.getElementById("addMaintenanceBtn").addEventListener("click",()=>openNamedModal("maintenanceModal"));

document.querySelectorAll(".modal-close").forEach(btn=>btn.addEventListener("click",()=>btn.closest(".modal-backdrop").classList.remove("open")));
document.querySelectorAll(".modal-backdrop").forEach(back=>back.addEventListener("click",e=>{if(e.target===back)back.classList.remove("open")}));

function toast(msg){
  let el=document.querySelector(".toast");
  if(!el){el=document.createElement("div");el.className="toast";document.body.appendChild(el)}
  el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800);
}

window.removeItem=function(type,index){
  if(!confirm("هل تريد حذف هذا السجل؟")) return;
  state[type].splice(index,1); save();
  renderDashboard(); renderReports(); renderTenants(); renderContracts(); renderPayments(); renderMaintenance();
renderReports();
  toast("تم الحذف");
}

document.getElementById("tenantForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.target);
  state.tenants.unshift({name:f.get("name"),phone:f.get("phone"),unit:f.get("unit"),status:f.get("status")});
  save(); renderTenants(); e.target.reset(); document.getElementById("tenantModal").classList.remove("open"); toast("تمت إضافة المستأجر");
});

document.getElementById("contractForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.target);
  state.contracts.unshift({id:"C-"+String(Date.now()).slice(-5),tenant:f.get("tenant"),unit:f.get("unit"),start:f.get("start"),end:f.get("end"),status:f.get("status")});
  save(); renderContracts(); renderDashboard(); e.target.reset(); document.getElementById("contractModal").classList.remove("open"); toast("تم إنشاء العقد");
});

document.getElementById("paymentForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.target);
  state.payments.unshift({tenant:f.get("tenant"),unit:f.get("unit"),amount:Number(f.get("amount")),status:f.get("status"),date:f.get("date")});
  save(); renderPayments(); renderDashboard(); renderReports(); e.target.reset(); document.getElementById("paymentModal").classList.remove("open"); toast("تم تسجيل الدفعة");
});

document.getElementById("maintenanceForm").addEventListener("submit",e=>{
  e.preventDefault(); const f=new FormData(e.target);
  state.maintenance.unshift({title:f.get("title"),unit:f.get("unit"),priority:f.get("priority"),status:f.get("status"),date:f.get("date")});
  save(); renderMaintenance(); e.target.reset(); document.getElementById("maintenanceModal").classList.remove("open"); toast("تم إنشاء طلب الصيانة");
});



document.addEventListener("click", function (event) {
  const button = event.target.closest(".delete-property-btn");
  if (!button) return;

  const id = Number(button.dataset.propertyId);
  const index = state.properties.findIndex(property => Number(property.id) === id);

  if (index === -1) {
    toast("تعذر العثور على العقار");
    return;
  }

  const propertyName = state.properties[index].name;
  const confirmed = window.confirm(`هل تريد حذف العقار: ${propertyName}؟`);
  if (!confirmed) return;

  state.properties.splice(index, 1);
  save();
  renderProperties(document.getElementById("propertySearch")?.value || "");
  renderDashboard();
  renderReports();
  toast("تم حذف العقار بنجاح");
});


document.addEventListener("click", function (event) {
  const button = event.target.closest(".delete-unit-btn");
  if (!button) return;

  const index = Number(button.dataset.unitIndex);
  if (!Number.isInteger(index) || !state.units[index]) {
    toast("تعذر العثور على الوحدة");
    return;
  }

  const unitName = state.units[index].name;
  const confirmed = window.confirm(`هل تريد حذف الوحدة: ${unitName}؟`);
  if (!confirmed) return;

  state.units.splice(index, 1);
  save();
  renderUnits();
  toast("تم حذف الوحدة بنجاح");
});

function renderReports(){
  const monthlyIncome = state.properties.reduce((sum,p)=>sum+Number(p.income||0),0);
  const annualIncome = monthlyIncome * 12;
  const collected = state.payments
    .filter(p=>p.status==="مدفوع")
    .reduce((sum,p)=>sum+Number(p.amount||0),0);
  const overdue = state.payments
    .filter(p=>p.status==="متأخر")
    .reduce((sum,p)=>sum+Number(p.amount||0),0);
  const expenses = state.expenses.reduce((sum,e)=>sum+Number(e.amount||0),0);
  const netIncome = collected - expenses;
  const paidCount = state.payments.filter(p=>p.status==="مدفوع").length;

  document.getElementById("reportAnnualIncome").textContent = `${fmt(annualIncome)} ر.س`;
  document.getElementById("reportPropertyCount").textContent = `${fmt(state.properties.length)} عقار`;
  document.getElementById("reportCollected").textContent = `${fmt(collected)} ر.س`;
  document.getElementById("reportPaidCount").textContent = `${fmt(paidCount)} دفعة مدفوعة`;
  document.getElementById("reportNetIncome").textContent = `${fmt(netIncome)} ر.س`;
  document.getElementById("reportOverdue").textContent = `المتأخرات: ${fmt(overdue)} ر.س`;
}

renderDashboard();
renderProperties();
renderUnits();
renderTenants();
renderContracts();
renderPayments();
renderMaintenance();
