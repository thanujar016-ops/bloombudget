const $ = (id) => document.getElementById(id);
const CATEGORIES = {
  expense: ["Food & Drinks","Transport","Shopping","Bills & Utilities","Education","Health","Entertainment","Travel","Groceries","Personal care","Other"],
  income: ["Salary","Freelance","Allowance","Gift","Investment","Business","Other"]
};
const CATEGORY_META = {
  "Food & Drinks": ["🍜","#fff0e5"], "Transport": ["🚕","#e8f4ff"], "Shopping": ["🛍️","#f9e8ff"],
  "Bills & Utilities": ["💡","#fff5d9"], "Education": ["📚","#e8f8ee"], "Health": ["💊","#ffe9ed"],
  "Entertainment": ["🎬","#f0eaff"], "Travel": ["✈️","#e4f8f8"], "Groceries": ["🥑","#e8f8e9"],
  "Personal care": ["🧴","#ffeaf4"], "Salary": ["💼","#e4f8ee"], "Freelance": ["💻","#e8f3ff"],
  "Allowance": ["🪙","#fff5d9"], "Gift": ["🎁","#ffeaf1"], "Investment": ["📈","#e8f8ee"],
  "Business": ["🏢","#e9eaff"], "Other": ["✨","#f0eef8"]
};
const PALETTE = ["#8b6bee","#ff8aa3","#ffbd69","#49c6b2","#63a7f5","#b6a0fa","#f27dca","#79c88a","#f28c65","#91a4b7"];
let transactions = [];
let monthlyBudget = 10000;
let budgetMonth = currentMonth();
let cashChart, categoryChart, analyticsChart;
let toastTimer;

function currentMonth(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function localDate(date=new Date()){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function money(value){ return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(value || 0); }
function shortMoney(value){ return "₹"+new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(value || 0); }
function escapeHTML(value){ return String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function loadData(){
  try {
    transactions = JSON.parse(localStorage.getItem("bloomBudgetTransactions") || "[]");
    monthlyBudget = Number(localStorage.getItem("bloomBudgetLimit")) || 10000;
    budgetMonth = localStorage.getItem("bloomBudgetMonth") || currentMonth();
    if(!Array.isArray(transactions)) transactions=[];
  } catch(e){ transactions=[]; }
}
function saveData(){ localStorage.setItem("bloomBudgetTransactions",JSON.stringify(transactions)); localStorage.setItem("bloomBudgetLimit",String(monthlyBudget)); localStorage.setItem("bloomBudgetMonth",budgetMonth); }
function monthTransactions(month=currentMonth()){ return transactions.filter(t=>t.date && t.date.slice(0,7)===month); }
function totals(list=transactions){ return list.reduce((a,t)=>{a[t.type]+=Number(t.amount)||0;return a;},{income:0,expense:0}); }
function spentThisMonth(month=currentMonth()){ return totals(monthTransactions(month)).expense; }
function showToast(message){ const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600); }
function categoryIcon(category){return (CATEGORY_META[category]||CATEGORY_META.Other)[0];}
function categoryBg(category){return (CATEGORY_META[category]||CATEGORY_META.Other)[1];}

function populateCategories(){
  $("category").innerHTML = [...CATEGORIES.expense,...CATEGORIES.income.filter(c=>!CATEGORIES.expense.includes(c))].map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  $("categoryFilter").innerHTML='<option value="all">All categories</option>'+[...new Set([...CATEGORIES.expense,...CATEGORIES.income])].map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
}
function syncCategoryOptions(){
  const type=document.querySelector('input[name="transactionType"]:checked').value;
  const current=$("category").value;
  $("category").innerHTML=CATEGORIES[type].map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
  if(CATEGORIES[type].includes(current)) $("category").value=current;
}
function updateDashboard(){
  const t=totals(), balance=t.income-t.expense, rate=t.income>0?((t.income-t.expense)/t.income*100):0;
  $("totalBalance").textContent=money(balance);$("totalIncome").textContent=money(t.income);$("totalExpense").textContent=money(t.expense);
  $("savingsRate").textContent=`${Math.round(rate)}%`;
  const spent=spentThisMonth(budgetMonth), pct=monthlyBudget>0?spent/monthlyBudget*100:0;
  $("budgetSpent").textContent=shortMoney(spent);$("budgetLimitText").textContent=`of ${shortMoney(monthlyBudget)}`;
  $("budgetProgress").style.width=`${Math.min(pct,100)}%`; $("budgetProgress").style.background=pct>=100?"linear-gradient(90deg,#ef6685,#f6a0b2)":"linear-gradient(90deg,#8c6df0,#bc9aff)";
  $("budgetPercent").textContent=`${Math.round(pct)}% used`;
  $("budgetMessage").textContent=pct>=100?"⚠️ Budget exceeded. Review your spending.":pct>=80?"You're getting close to your budget limit.": "You're off to a great start!";
  $("analyticsIncome").textContent=money(totals(monthTransactions()).income);$("analyticsExpense").textContent=money(totals(monthTransactions()).expense);
  const mt=totals(monthTransactions()), net=mt.income-mt.expense;
  $("analyticsNet").textContent=money(net);$("analyticsNet").className=net>=0?"positive":"negative";
  $("analyticsRate").textContent=`${Math.round(mt.income?net/mt.income*100:0)}%`;
  $("budgetPageSpent").textContent=money(spent);$("budgetRemaining").textContent=money(monthlyBudget-spent);
  const health=Math.min(pct,100);$("healthPercent").textContent=`${Math.round(pct)}%`;
  $("budgetHealthCircle").style.background=`conic-gradient(${pct>=100?"#ed6685":"#8b6bee"} ${health*3.6}deg,#f0edfa ${health*3.6}deg)`;
  $("healthCaption").textContent=pct>=100?"You've gone over the budget. Check your categories.":pct>=80?"Almost there — keep an eye on spending!":"You're within your budget. Keep it up!";
  renderRecent();renderTable();renderCharts();
}
function renderRecent(){
  const list=[...transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,5);
  $("recentTransactions").innerHTML=list.length?list.map(t=>`<div class="transaction-row"><div class="transaction-symbol" style="background:${categoryBg(t.category)}">${categoryIcon(t.category)}</div><div class="transaction-info"><strong>${escapeHTML(t.description)}</strong><small>${escapeHTML(t.category)} · ${formatDate(t.date)}</small></div><div class="transaction-amount ${t.type==="income"?"positive":"negative"}">${t.type==="income"?"+":"−"}${money(t.amount)}</div></div>`).join(""):'<div class="empty-state">🌱 No transactions yet. Add your first one!</div>';
}
function formatDate(date){if(!date)return "—";return new Date(date+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
function getFiltered(){
  const query=$("searchInput").value.trim().toLowerCase(), type=$("typeFilter").value, category=$("categoryFilter").value, from=$("fromDate").value, to=$("toDate").value;
  return [...transactions].filter(t=>(!query||(t.description+" "+(t.notes||"")+" "+t.category).toLowerCase().includes(query))&&(type==="all"||t.type===type)&&(category==="all"||t.category===category)&&(!from||t.date>=from)&&(!to||t.date<=to)).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
}
function renderTable(){
  const list=getFiltered();
  $("transactionTable").innerHTML=list.length?list.map(t=>`<tr><td><div class="table-name"><span class="table-icon" style="background:${categoryBg(t.category)}">${categoryIcon(t.category)}</span><span><strong>${escapeHTML(t.description)}</strong><br><span style="color:var(--muted);font-size:10px">${escapeHTML(t.notes||"")}</span></span></div></td><td>${escapeHTML(t.category)}</td><td>${formatDate(t.date)}</td><td><span class="type-badge ${t.type}">${t.type==="income"?"Income":"Expense"}</span></td><td class="${t.type==="income"?"positive":"negative"}"><strong>${t.type==="income"?"+":"−"}${money(t.amount)}</strong></td><td><button class="row-action" data-edit="${t.id}">Edit</button><button class="row-action delete" data-delete="${t.id}">Delete</button></td></tr>`).join(""):'<tr><td colspan="6"><div class="empty-state">No matching transactions found.</div></td></tr>';
  $("transactionCount").textContent=`Showing ${list.length} of ${transactions.length} transaction${transactions.length===1?"":"s"}.`;
}
function renderCharts(){
  if(typeof Chart==="undefined")return;
  const months=Number($("cashFlowPeriod").value||6), labels=[], income=[], expense=[];
  for(let i=months-1;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;labels.push(d.toLocaleDateString("en-IN",{month:"short"}));const t=totals(monthTransactions(key));income.push(t.income);expense.push(t.expense);}
  const common={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{usePointStyle:true,boxWidth:7,font:{family:"Inter",size:10},color:getComputedStyle(document.body).getPropertyValue("--muted")}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${money(ctx.raw)}`}}}};
  if(cashChart)cashChart.destroy();
  cashChart=new Chart($("cashFlowChart"),{type:"bar",data:{labels,datasets:[{label:"Income",data:income,backgroundColor:"#8d6cf0",borderRadius:6},{label:"Expenses",data:expense,backgroundColor:"#ff91a9",borderRadius:6}]},options:{...common,scales:{x:{grid:{display:false},ticks:{color:"#9a9db1",font:{size:10}}},y:{beginAtZero:true,grid:{color:"#f0f1f7"},ticks:{color:"#9a9db1",font:{size:10},callback:v=>v>=1000?`₹${v/1000}k`:`₹${v}`}}}}});
  const cats={};monthTransactions().filter(t=>t.type==="expense").forEach(t=>cats[t.category]=(cats[t.category]||0)+Number(t.amount));
  const catLabels=Object.keys(cats), catValues=Object.values(cats);
  if(categoryChart)categoryChart.destroy();
  categoryChart=new Chart($("categoryChart"),{type:"doughnut",data:{labels:catLabels.length?catLabels:["No expenses yet"],datasets:[{data:catValues.length?catValues:[1],backgroundColor:catLabels.length?catLabels.map((_,i)=>PALETTE[i%PALETTE.length]):["#efedf7"],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>catLabels.length?`${ctx.label}: ${money(ctx.raw)}`:"No expenses yet"}}}}});
  $("categoryLegend").innerHTML=catLabels.length?catLabels.map((c,i)=>`<span class="legend-item"><i class="legend-dot" style="background:${PALETTE[i%PALETTE.length]}"></i>${escapeHTML(c)}</span>`).join(""):'<span class="legend-item">Add expenses to see your breakdown.</span>';
  if(analyticsChart)analyticsChart.destroy();
  analyticsChart=new Chart($("analyticsBarChart"),{type:"bar",data:{labels:catLabels.length?catLabels:["No expenses"],datasets:[{label:"Expenses",data:catValues.length?catValues:[0],backgroundColor:catLabels.map((_,i)=>PALETTE[i%PALETTE.length]),borderRadius:7}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>money(ctx.raw)}}},scales:{x:{beginAtZero:true,grid:{color:"#f0f1f7"},ticks:{color:"#9a9db1",callback:v=>v>=1000?`₹${v/1000}k`:`₹${v}`}},y:{grid:{display:false},ticks:{color:"#777b96",font:{size:10}}}}}});
}
function openModal(id=null){
  $("transactionForm").reset();$("editId").value="";$("modalTitle").textContent=id?"Edit transaction":"Add transaction";$("saveTransaction").textContent=id?"Update transaction":"Save transaction";
  $("transactionDate").value=localDate();
  document.querySelector('input[name="transactionType"][value="expense"]').checked=true;syncCategoryOptions();
  if(id){const t=transactions.find(x=>x.id===id);if(!t)return;$("editId").value=t.id;$("description").value=t.description;$("amount").value=t.amount;$("transactionDate").value=t.date;$("notes").value=t.notes||"";document.querySelector(`input[name="transactionType"][value="${t.type}"]`).checked=true;syncCategoryOptions();$("category").value=t.category;}
  $("transactionModal").classList.add("open");$("transactionModal").setAttribute("aria-hidden","false");setTimeout(()=>$("description").focus(),80);
}
function closeModal(){$("transactionModal").classList.remove("open");$("transactionModal").setAttribute("aria-hidden","true");}
function changeView(view){
  document.querySelectorAll(".view-section").forEach(s=>s.classList.remove("active-view"));
  $(view+"View").classList.add("active-view");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={dashboard:["Good day! ✦","Here’s your financial snapshot."],transactions:["Transactions","Every money move, all in one place."],analytics:["Your analytics","Understand your spending patterns."],budget:["Budget planner","Small plans can make a big difference."]};
  $("pageTitle").textContent=titles[view][0];document.querySelector(".subtitle").textContent=titles[view][1];
  if(view==="analytics"||view==="dashboard")renderCharts();
}
function exportCSV(){
  if(!transactions.length){showToast("No transactions to export yet.");return;}
  const rows=[["Description","Type","Category","Amount","Date","Notes"],...transactions.map(t=>[t.description,t.type,t.category,t.amount,t.date,t.notes||""])];
  const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="bloom-budget-transactions.csv";a.click();URL.revokeObjectURL(url);showToast("CSV export downloaded!");
}
function init(){
  loadData();populateCategories();
  $("todayDate").textContent=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
  $("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long"}).toUpperCase()+" · YOUR MONEY, IN BLOOM";
  $("monthlyBudget").value=monthlyBudget;$("budgetMonth").value=budgetMonth;
  updateDashboard();
  document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>changeView(b.dataset.view)));
  $("addTopBtn").addEventListener("click",()=>openModal());$("addTransactionBtn").addEventListener("click",()=>openModal());
  $("modalClose").addEventListener("click",closeModal);$("cancelModal").addEventListener("click",closeModal);
  $("transactionModal").addEventListener("click",e=>{if(e.target===$("transactionModal"))closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
  document.querySelectorAll('input[name="transactionType"]').forEach(el=>el.addEventListener("change",syncCategoryOptions));
  $("transactionForm").addEventListener("submit",e=>{
    e.preventDefault();const id=$("editId").value, type=document.querySelector('input[name="transactionType"]:checked').value;
    const item={id:id||`${Date.now()}-${Math.random().toString(16).slice(2)}`,type,description:$("description").value.trim(),amount:Number($("amount").value),date:$("transactionDate").value,category:$("category").value,notes:$("notes").value.trim(),createdAt:id?(transactions.find(t=>t.id===id)?.createdAt||Date.now()):Date.now()};
    if(!item.description||!Number.isFinite(item.amount)||item.amount<=0||!item.date){showToast("Please enter valid transaction details.");return;}
    if(id)transactions=transactions.map(t=>t.id===id?item:t);else transactions.push(item);
    saveData();updateDashboard();closeModal();showToast(id?"Transaction updated!":"Transaction added successfully!");
  });
  ["searchInput","typeFilter","categoryFilter","fromDate","toDate"].forEach(id=>$(id).addEventListener("input",renderTable));
  $("resetFilters").addEventListener("click",()=>{["searchInput","fromDate","toDate"].forEach(id=>$(id).value="");$("typeFilter").value="all";$("categoryFilter").value="all";renderTable();});
  $("transactionTable").addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
    if(edit)openModal(edit.dataset.edit);
    if(del){const t=transactions.find(x=>x.id===del.dataset.delete);if(t&&confirm(`Delete "${t.description}"?`)){transactions=transactions.filter(x=>x.id!==t.id);saveData();updateDashboard();showToast("Transaction deleted.");}}
  });
  $("cashFlowPeriod").addEventListener("change",renderCharts);$("exportBtn").addEventListener("click",exportCSV);
  $("clearBtn").addEventListener("click",()=>{if(transactions.length&&confirm("Delete ALL transactions? This cannot be undone.")){transactions=[];saveData();updateDashboard();showToast("Transaction history cleared.");}else if(!transactions.length)showToast("Your history is already empty.");});
  $("budgetForm").addEventListener("submit",e=>{e.preventDefault();const val=Number($("monthlyBudget").value),month=$("budgetMonth").value;if(!val||val<1||!month){showToast("Enter a valid budget and month.");return;}monthlyBudget=val;budgetMonth=month;saveData();updateDashboard();showToast("Budget saved!");});
  $("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");const dark=document.body.classList.contains("dark");$("themeToggle").innerHTML=dark?"☀ Switch to light mode":"☾ Switch to dark mode";localStorage.setItem("bloomBudgetDark",dark?"yes":"no");renderCharts();});
  if(localStorage.getItem("bloomBudgetDark")==="yes"){document.body.classList.add("dark");$("themeToggle").innerHTML="☀ Switch to light mode";}
  // Refresh the date and current-month summaries when the calendar month changes.
  setInterval(()=>{if(currentMonth()!==budgetMonth){updateDashboard();}},60000);
}
document.addEventListener("DOMContentLoaded",init);