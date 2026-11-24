const STORE='dreams-school-v1';
function todayISO(){return new Date().toISOString().slice(0,10)}
const initial={students:[],teachers:[],groups:[],payments:[],expenses:[],attendance:[],lessons:[],homework:[],assessments:[],results:[],timetable:[]};
function cleanDemoRecords(data){
 const clean={...data};
 const sampleStudents=[
  [1,'Amina Karimova','+998 90 123 45 67','English B1'],
  [2,'Sardor Aliyev','+998 91 234 56 78','Mathematics'],
  [3,'Madina Rustamova','+998 93 345 67 89','Biology'],
  [4,'Jasur Tursunov','+998 95 456 78 90','English A2']
 ];
 const sampleTeachers=[[1,'Dilnoza Ahmedova','English','+998 90 111 22 33'],[2,'Bekzod Karimov','Mathematics','+998 91 222 33 44']];
 const sampleExpenses=[[1,'Center rent','Rent',3000000],[2,'Internet and utilities','Utilities',1000000],[3,'Administrator salary','Salary',1300000]];
 const samplePayments=[[1,'Amina Karimova','English B1',230000,'Cash','Paid'],[2,'Sardor Aliyev','Mathematics',230000,'Card','Paid'],[3,'Madina Rustamova','Biology',230000,'Cash','Pending']];
 const matches=(x,row,fields)=>fields.every((field,i)=>String(x[field]??'')===String(row[i]));
 clean.students=(clean.students||[]).filter(x=>!sampleStudents.some(r=>matches(x,r,['id','name','phone','group'])));
 clean.teachers=(clean.teachers||[]).filter(x=>!sampleTeachers.some(r=>matches(x,r,['id','name','subject','phone'])));
 clean.payments=(clean.payments||[]).filter(x=>!samplePayments.some(r=>matches(x,r,['id','student','group','amount','method','status'])));
 clean.expenses=(clean.expenses||[]).filter(x=>!sampleExpenses.some(r=>matches(x,r,['id','title','category','amount'])));
 clean.groups=(clean.groups||[]).filter(x=>!(Number(x.id)<=3&&['English B1','Mathematics','Biology'].includes(x.name)&&['Dilnoza Ahmedova','Bekzod Karimov','To be assigned'].includes(x.teacher)&&Number(x.fee)===230000));
 return clean;
}
let db;try{const saved=JSON.parse(localStorage.getItem(STORE));db=cleanDemoRecords({...structuredClone(initial),...(saved&&typeof saved==='object'?saved:{})});for(const key of Object.keys(initial)){if(!Array.isArray(db[key]))db[key]=structuredClone(initial[key])}localStorage.setItem(STORE,JSON.stringify(db))}catch{db=structuredClone(initial)}
let page='dashboard',timer,cloudSaveQueue=Promise.resolve();
const names={teststudio:['Test Studio','Build printable English practice tests for your classes.'],dashboard:['Dashboard overview','Here’s what’s happening at your school today.'],students:['Students','Manage registrations, student details and groups.'],teachers:['Teachers','Manage your teaching team and salary details.'],groups:['Groups & courses','Organise courses, teachers, schedules and fees.'],attendance:['Attendance','Record and review daily student attendance.'],payments:['Payments','Track tuition payments and outstanding balances.'],expenses:['Expenses','Keep track of school operating costs.'],reports:['Reports & analytics','A simple overview of your school’s performance.'],performance:['Student performance','Review academic progress and attendance indicators.'],staff:['Staff & permissions','Invite teachers, accountants and administrators.'],finance:['Finance & billing','Review tuition, cash flow and outstanding invoices.'],settings:['Centre settings','Manage your centre profile, contact information and branding.'],parents:['Parent access','Invite families to view their child’s attendance.'],classroom:['Classroom workspace','Plan lessons, assign homework and organise assessments.'],results:['Student results','Record exam scores and monitor learner progress.'],timetable:['Teacher timetable','Build weekly schedules with automatic conflict protection.'],teacherhome:['My teaching dashboard','Your assigned groups, weekly lessons and classroom tasks.']};
const money=n=>new Intl.NumberFormat('uz-UZ').format(Number(n)||0)+' UZS';
const sum=(a,k)=>a.reduce((s,x)=>s+(Number(x[k])||0),0);
const dateFmt=s=>s?new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let accessibilityFieldId=0;
function ensureFormAccessibility(root=document){
 const controls=root.querySelectorAll?root.querySelectorAll('input,select,textarea'): [];
 controls.forEach(el=>{
  if(!el.id){
   let id;
   do{id='dis-field-'+(++accessibilityFieldId)}while(document.getElementById(id));
   el.id=id;
  }
  if(!el.name && !['submit','button','reset'].includes((el.type||'').toLowerCase())) el.name=el.id;
  const wrappingLabel=el.closest('label');
  const field=el.closest('.field');
  const fieldLabel=field?.querySelector('label');
  if(fieldLabel && !wrappingLabel){
   fieldLabel.htmlFor=el.id;
  }
  const associated=wrappingLabel || (fieldLabel && fieldLabel.htmlFor===el.id ? fieldLabel : null);
  if(!associated && !el.getAttribute('aria-label')){
   const placeholder=el.getAttribute('placeholder');
   const student=el.getAttribute('data-student');
   const labelText=fieldLabel?.textContent?.trim();
   el.setAttribute('aria-label',student ? 'Attendance status for '+student : (labelText || placeholder || el.name || 'Form field'));
  }
 });
}
if(!window.__disAccessibilityObserver && document.body){
 window.__disAccessibilityObserver=new MutationObserver(records=>{
  if(records.some(r=>r.addedNodes.length)) ensureFormAccessibility(document);
 });
 window.__disAccessibilityObserver.observe(document.body,{childList:true,subtree:true});
}

const initials=s=>String(s||'?').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
function persist(){
 const snapshot=JSON.parse(JSON.stringify(db));
 try{localStorage.setItem(STORE,JSON.stringify(snapshot))}
 catch(e){console.error('Local save failed:',e);notify('Local save failed: browser storage may be full')}
 let syncResult=Promise.resolve({ok:true,localOnly:true});
 if(window.schoolCloud){
  cloudSaveQueue=cloudSaveQueue.catch(()=>{}).then(()=>window.schoolCloud.save(snapshot)).then(()=>({ok:true,cloud:true})).catch(e=>{
   console.error('Cloud sync failed:',e);
   notify('Cloud sync failed: '+(e.message||'check connection'));
   return {ok:false,error:e};
  });
  syncResult=cloudSaveQueue;
 }
 render();
 return syncResult;
}
function notify(s){const t=document.querySelector('#toast');t.textContent=s;t.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>t.classList.remove('show'),2400)}
function stat(label,val,icon,foot){return '<article class="stat-card"><div class="stat-top">'+label+'<span class="stat-icon">'+icon+'</span></div><div class="stat-value">'+val+'</div><div class="stat-foot">'+foot+'</div></article>'}
function table(headers,rows){const label='Scrollable table: '+headers.map(x=>String(x)).join(', ');return '<div class="table-wrap" role="region" tabindex="0" aria-label="'+esc(label)+'"><table><thead><tr>'+headers.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'}
function person(n){return '<div class="student-cell"><span class="mini-avatar">'+initials(n)+'</span>'+esc(n)+'</div>'}

function analyticsPanel(){
 const byGroup={};db.students.forEach(s=>{const k=s.group||'Unassigned';byGroup[k]=(byGroup[k]||0)+1});
 const groups=Object.entries(byGroup).sort((a,b)=>b[1]-a[1]),palette=['#4967e8','#19a783','#f2a94a','#9b7be8','#e47a9a','#64a6bd'];
 let offset=0;const total=Math.max(1,db.students.length);
 const stops=groups.map((g,i)=>{const start=offset;offset+=g[1]/total*100;return palette[i%palette.length]+' '+start+'% '+offset+'%'}).join(',');
 const today=db.attendance.filter(a=>a.date===todayISO()),p=today.filter(a=>a.status==='Present').length,ab=today.filter(a=>a.status==='Absent').length,late=today.filter(a=>a.status==='Late').length,unknown=Math.max(0,db.students.length-p-ab-late);
 const attTotal=Math.max(1,p+ab+late+unknown),attStops=[['#19a783',p],['#e46e79',ab],['#f2a94a',late],['#e9edf4',unknown]];
 let aoff=0;const attGradient=attStops.map(x=>{const start=aoff;aoff+=x[1]/attTotal*100;return x[0]+' '+start+'% '+aoff+'%'}).join(',');
 const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const label=d.toLocaleDateString('en',{month:'short'});const income=sum(db.payments.filter(x=>x.status==='Paid'&&String(x.date||'').slice(0,7)===key),'amount');const expense=sum(db.expenses.filter(x=>String(x.date||'').slice(0,7)===key),'amount');months.push({label,income,expense})}
 const max=Math.max(1,...months.flatMap(x=>[x.income,x.expense]));
 return '<div class="analytics-grid"><section class="panel chart-panel"><div class="panel-header"><div><h3>Student distribution</h3><p>Enrolment by course</p></div><span class="tag">Live totals</span></div><div class="donut-layout"><div class="donut" style="background:conic-gradient('+(stops||'#e9edf4 0% 100%')+')"><div class="donut-hole"><strong>'+db.students.length+'</strong><small>students</small></div></div><div class="chart-legend">'+(groups.length?groups.map((g,i)=>'<div><i style="background:'+palette[i%palette.length]+'"></i><span>'+esc(g[0])+'</span><b>'+g[1]+'</b></div>').join(''):'<small>No enrolments yet</small>')+'</div></div></section><section class="panel chart-panel"><div class="panel-header"><div><h3>Attendance today</h3><p>Present, absent and late</p></div><span class="tag">'+todayISO()+'</span></div><div class="donut-layout"><div class="donut" style="background:conic-gradient('+attGradient+')"><div class="donut-hole"><strong>'+today.length+'</strong><small>marked</small></div></div><div class="chart-legend"><div><i style="background:#19a783"></i><span>Present</span><b>'+p+'</b></div><div><i style="background:#e46e79"></i><span>Absent</span><b>'+ab+'</b></div><div><i style="background:#f2a94a"></i><span>Late</span><b>'+late+'</b></div><div><i style="background:#e9edf4"></i><span>Not marked</span><b>'+unknown+'</b></div></div></div></section><section class="panel chart-panel chart-wide"><div class="panel-header"><div><h3>Income vs expenses</h3><p>Monthly totals based on recorded transactions</p></div><div class="chart-legend-inline"><span><i style="background:#4967e8"></i>Income</span><span><i style="background:#19a783"></i>Expenses</span></div></div><div class="bar-chart">'+months.map(m=>'<div class="bar-month"><div class="bar-columns"><i class="income-bar" title="Income: '+money(m.income)+'" style="height:'+Math.max(2,m.income/max*100)+'%"></i><i class="expense-bar" title="Expenses: '+money(m.expense)+'" style="height:'+Math.max(2,m.expense/max*100)+'%"></i></div><small>'+m.label+'</small></div>').join('')+'</div></section></div>';
}

function dashboard(){
 const paid=sum(db.payments.filter(x=>x.status==='Paid'),'amount'),out=sum(db.expenses,'amount');
 const pending=db.payments.filter(x=>x.status==='Pending'),due=sum(pending,'amount');
 const active=db.students.filter(x=>x.status==='Active').length;
 const recent=[...db.payments].reverse().slice(0,5);
 const rows=recent.map(p=>'<tr><td>'+person(p.student)+'</td><td>'+esc(p.group||'—')+'</td><td>'+money(p.amount)+'</td><td><span class="status '+String(p.status||'pending').toLowerCase()+'">'+esc(p.status)+'</span></td></tr>').join('');
 const monthData=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');monthData.push({label:d.toLocaleDateString('en',{month:'short'}),income:sum(db.payments.filter(p=>p.status==='Paid'&&String(p.date||'').slice(0,7)===key),'amount'),expense:sum(db.expenses.filter(x=>String(x.date||'').slice(0,7)===key),'amount')})}
 const peak=Math.max(1,...monthData.flatMap(x=>[x.income,x.expense]));
 const bars=monthData.map(m=>'<div class="orbit-month"><div class="orbit-bars"><i class="orbit-income" style="height:'+Math.max(3,m.income/peak*100)+'%" title="Income '+money(m.income)+'"></i><i class="orbit-expense" style="height:'+Math.max(3,m.expense/peak*100)+'%" title="Expenses '+money(m.expense)+'"></i></div><small>'+m.label+'</small></div>').join('');
 return '<section class="command-hero"><div class="command-copy"><div class="command-kicker"><i></i> YOUR SCHOOL, IN FOCUS</div><h2>Make every day<br><em>count.</em></h2><p>Your centre at a glance. People, learning and operations — all moving together.</p><div class="command-cta"><button class="command-primary" data-modal="students">＋ Enrol a student</button><button class="command-ghost" data-page="reports">Explore insights ↗</button></div></div><div class="command-art" aria-hidden="true"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-core"><span>D.</span><small>DREAMS<br>WORKSPACE</small></div><div class="art-node node-a">✦</div><div class="art-node node-b">↗</div><div class="art-node node-c">◈</div></div><div class="command-date"><span>WORKSPACE / OVERVIEW</span><strong>'+new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</strong></div></section>'+
 '<div class="metric-ribbon"><div class="metric-lead"><span>LIVE SNAPSHOT</span><strong>Centre pulse</strong><small>Based on your recorded data</small></div><div class="metric-item"><span class="metric-icon mint">♙</span><div><small>Active learners</small><strong>'+active+'</strong><em>'+db.students.length+' total records</em></div></div><div class="metric-item"><span class="metric-icon lilac">✧</span><div><small>Teaching team</small><strong>'+db.teachers.length+'</strong><em>Registered teachers</em></div></div><div class="metric-item"><span class="metric-icon peach">↗</span><div><small>Income recorded</small><strong>'+money(paid)+'</strong><em>Paid tuition</em></div></div><div class="metric-item"><span class="metric-icon blue">◷</span><div><small>Awaiting payment</small><strong>'+money(due)+'</strong><em>'+pending.length+' pending records</em></div></div></div>'+
 '<div class="command-grid"><section class="insight-stage"><div class="stage-heading"><div><span class="section-overline">FINANCIAL PULSE</span><h3>Money in motion</h3><p>Six-month view of recorded income and expenses</p></div><button class="stage-link" data-page="finance">Full finance view ↗</button></div><div class="orbit-chart"><div class="orbit-chart-total"><small>NET RECORDED</small><strong>'+money(paid-out)+'</strong><span>All-time balance</span></div><div class="orbit-chart-bars">'+bars+'</div><div class="orbit-legend"><span><i class="legend-income"></i>Income</span><span><i class="legend-expense"></i>Expenses</span></div></div><div class="stage-foot"><span><b>'+money(paid)+'</b><small>Total collected</small></span><span><b>'+money(out)+'</b><small>Total expenses</small></span><span><b>'+money(due)+'</b><small>Pending payments</small></span></div></section>'+
 '<section class="action-stage"><div class="stage-heading"><div><span class="section-overline">GET THINGS DONE</span><h3>Quick launch</h3><p>Your most-used actions, one click away</p></div><span class="launch-spark">✳</span></div><div class="launch-grid"><button class="launch-tile launch-violet" data-modal="students"><span>＋</span><strong>New student</strong><small>Build your community</small><i>↗</i></button><button class="launch-tile launch-mint" data-modal="attendance"><span>◷</span><strong>Take attendance</strong><small>Track class attendance</small><i>↗</i></button><button class="launch-tile launch-peach" data-modal="payments"><span>＄</span><strong>Record payment</strong><small>Update your cash flow</small><i>↗</i></button><button class="launch-tile launch-blue" data-page="classroom"><span>✧</span><strong>Open classroom</strong><small>Lessons and homework</small><i>↗</i></button></div></section></div>'+
 '<section class="activity-stage"><div class="stage-heading"><div><span class="section-overline">LATEST ACTIVITY</span><h3>Recent payments</h3><p>A clear view of the latest tuition activity</p></div><button class="stage-link" data-page="payments">All transactions ↗</button></div>'+table(['STUDENT','GROUP','AMOUNT','STATUS'],rows||'<tr><td colspan="4">No payments recorded yet.</td></tr>')+'</section>'+
 '<div class="dashboard-lower">'+analyticsPanel()+'<section class="next-step-card"><span class="section-overline">A GOOD NEXT STEP</span><h3>Keep your centre<br>in sync.</h3><p>Review attendance, update learner progress and keep families informed.</p><button data-page="attendance">Open attendance ↗</button><div class="next-step-orb">✳</div></section></div>';
}
function listing(type,headers,rows,searchText){return '<section class="page-panel"><div class="toolbar"><input class="search" id="tableSearch" placeholder="Search '+searchText+'..." /><button class="secondary-btn" id="downloadCsv">↓ Export CSV</button><button class="primary-btn" data-modal="'+type+'">＋ Add '+type.slice(0,-1)+'</button></div>'+table(headers,rows)+'</section>'}
function students(){let rows=db.students.map(s=>'<tr><td>'+person(s.name)+'</td><td>'+esc(s.phone)+'</td><td>'+esc(s.group)+'</td><td>'+money(s.fee)+'</td><td><span class="status active">'+esc(s.status)+'</span></td><td><button class="text-link" data-delete="students" data-id="'+s.id+'">Remove</button></td></tr>').join('');return listing('students',['STUDENT','PHONE','GROUP','MONTHLY FEE','STATUS',''],rows,'students')}
function teachers(){let rows=db.teachers.map(t=>'<tr><td>'+person(t.name)+'</td><td>'+esc(t.subject)+'</td><td>'+esc(t.phone)+'</td><td>'+money(t.salary)+'</td><td><span class="status '+(t.status==='Active'?'active':t.status==='Inactive'?'pending':'')+'">'+esc(t.status||'Active')+'</span></td><td><button class="text-link" data-edit="teachers" data-id="'+esc(t.id)+'">Edit</button> <button class="text-link" data-delete="teachers" data-id="'+esc(t.id)+'">Remove</button></td></tr>').join('');return listing('teachers',['TEACHER','SUBJECT','PHONE','MONTHLY SALARY','STATUS','ACTIONS'],rows,'teachers')}
function groups(){let rows=db.groups.map(g=>'<tr><td><strong>'+esc(g.name)+'</strong></td><td>'+esc(g.subject)+'</td><td>'+esc(g.teacher)+'</td><td>'+esc(g.schedule)+'</td><td>'+g.students+'</td><td>'+money(g.fee)+'</td><td><button class="text-link" data-delete="groups" data-id="'+g.id+'">Remove</button></td></tr>').join('');return listing('groups',['GROUP','SUBJECT','TEACHER','SCHEDULE','STUDENTS','FEE',''],rows,'groups')}

function finance(){
 const period=todayISO().slice(0,7),paid=db.payments.filter(p=>p.status==='Paid'&&String(p.date||'').slice(0,7)===period),pending=db.payments.filter(p=>p.status==='Pending'&&(p.billing_period||String(p.date||'').slice(0,7))===period);
 const income=sum(paid,'amount'),cost=sum(db.expenses.filter(x=>String(x.date||'').slice(0,7)===period),'amount'),due=sum(pending,'amount'),payroll=sum(db.teachers,'salary');
 const dueRows=pending.map(p=>'<tr><td>'+person(p.student)+'</td><td>'+esc(p.group||'—')+'</td><td>'+money(p.amount)+'</td><td>'+dateFmt(p.date)+'</td><td><span class="status pending">Pending</span></td></tr>').join('');
 const byMonth=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');byMonth.push({label:d.toLocaleDateString('en',{month:'short'}),income:sum(db.payments.filter(p=>p.status==='Paid'&&String(p.date||'').slice(0,7)===key),'amount'),expense:sum(db.expenses.filter(x=>String(x.date||'').slice(0,7)===key),'amount')})}
 const peak=Math.max(1,...byMonth.flatMap(x=>[x.income,x.expense]));
 return '<div class="stats-grid">'+stat('Collected this month',money(income),'↗',paid.length+' paid transactions')+stat('Outstanding invoices',money(due),'◷',pending.length+' pending records')+stat('Expenses this month',money(cost),'↘','Recorded expenses')+stat('Estimated balance',money(income-cost),'＝','Collected income less expenses')+'</div><section class="panel finance-panel"><div class="panel-header"><div><h3>Monthly cash flow</h3><p>Recorded income and expenses · last six months</p></div><span class="tag">'+period+'</span></div><div class="finance-bars">'+byMonth.map(m=>'<div class="finance-month"><div class="finance-bar-pair"><i title="Income" style="height:'+Math.max(2,m.income/peak*100)+'%"></i><b title="Expenses" style="height:'+Math.max(2,m.expense/peak*100)+'%"></b></div><small>'+m.label+'</small></div>').join('')+'</div><div class="finance-legend"><span><i></i>Income</span><span><i></i>Expenses</span></div></section><section class="panel finance-panel"><div class="panel-header"><div><h3>Tuition collection</h3><p>Prepare this month’s pending tuition records for active students</p></div><button class="primary-btn" id="generateBills" type="button">Generate monthly invoices</button></div><p class="muted-note">This creates one pending payment record per active student who has no payment record for '+period+'. It does not charge anyone or send payment requests.</p><div id="billingResult"></div></section><section class="panel finance-panel"><div class="panel-header"><div><h3>Outstanding payments</h3><p>Pending records for '+period+'</p></div><button class="secondary-btn" data-page="payments">Open payments</button></div>'+table(['STUDENT','GROUP','AMOUNT','DATE','STATUS'],dueRows||'<tr><td colspan="5">No pending tuition records for this month.</td></tr>')+'</section><section class="panel finance-panel"><div class="panel-header"><div><h3>Payroll estimate</h3><p>Monthly salary amounts recorded for teachers</p></div></div><strong class="finance-payroll">'+money(payroll)+'</strong><p class="muted-note">Estimated from teacher salary profiles; actual payroll payments must be recorded separately as expenses.</p></section>';
}
function generateMonthlyBills(){
 const period=todayISO().slice(0,7),existing=new Set(db.payments.filter(p=>(p.billing_period||String(p.date||'').slice(0,7))===period).map(p=>p.student));
 const due=db.students.filter(st=>st.status==='Active'&&!existing.has(st.name));
 if(!due.length){notify('No new invoices to generate for this month.');return}
 due.forEach(st=>{db.payments.push({id:Math.max(0,...db.payments.map(p=>Number(p.id)||0))+1,student:st.name,group:st.group||'',amount:Number(st.fee)||0,date:todayISO(),method:'Pending',status:'Pending',billing_period:period})});
 persist();notify(due.length+' monthly invoice(s) created');go('finance');
}

function payments(){let rows=db.payments.map(p=>'<tr><td>'+person(p.student)+'</td><td>'+esc(p.group)+'</td><td>'+money(p.amount)+'</td><td>'+dateFmt(p.date)+'</td><td>'+esc(p.method)+'</td><td><span class="status '+p.status.toLowerCase()+'">'+p.status+'</span></td><td><button class="text-link" data-delete="payments" data-id="'+p.id+'">Remove</button></td></tr>').join('');return '<div class="stats-grid">'+stat('Total collected',money(sum(db.payments.filter(p=>p.status==='Paid'),'amount')),'↗','Payments marked paid')+stat('Pending',money(sum(db.payments.filter(p=>p.status==='Pending'),'amount')),'◷','Awaiting confirmation')+stat('Transactions',db.payments.length,'▤','All recorded entries')+stat('Monthly fee (standard)',money(230000),'＄','Editable per student')+'</div>'+listing('payments',['STUDENT','GROUP','AMOUNT','DATE','METHOD','STATUS',''],rows,'payments')}
function expenses(){let rows=db.expenses.map(e=>'<tr><td><strong>'+esc(e.title)+'</strong></td><td>'+esc(e.category)+'</td><td>'+money(e.amount)+'</td><td>'+dateFmt(e.date)+'</td><td><button class="text-link" data-delete="expenses" data-id="'+e.id+'">Remove</button></td></tr>').join('');return '<div class="stats-grid">'+stat('Total expenses',money(sum(db.expenses,'amount')),'↗','All recorded expenses')+stat('Expense entries',db.expenses.length,'▤','Recorded costs')+'</div>'+listing('expenses',['DESCRIPTION','CATEGORY','AMOUNT','DATE',''],rows,'expenses')}
function attendance(){let date=todayISO(),todays=db.attendance.filter(a=>a.date===date),present=todays.filter(a=>a.status==='Present').length,marked=new Set(todays.map(a=>a.student));let rows=db.students.map(s=>{let a=todays.find(x=>x.student===s.name);return '<tr><td>'+person(s.name)+'</td><td>'+esc(s.group)+'</td><td><select class="select attendance-choice" data-student="'+esc(s.name)+'"><option '+(!a||a.status==='Present'?'selected':'')+'>Present</option><option '+(a?.status==='Absent'?'selected':'')+'>Absent</option><option '+(a?.status==='Late'?'selected':'')+'>Late</option></select></td></tr>'}).join('');return '<div class="stats-grid">'+stat('Students listed',db.students.length,'♙','Current register')+stat('Marked today',marked.size,'◷','Attendance entries')+stat('Present',present,'✓','Marked present')+stat('Absent',todays.filter(a=>a.status==='Absent').length,'–','Marked absent')+'</div><section class="page-panel"><div class="panel-header"><div><h3>Daily register</h3><p class="attendance-date">'+date+'</p></div><button class="primary-btn" id="saveAttendance">Save attendance</button></div>'+table(['STUDENT','GROUP','TODAY’S STATUS'],rows||'<tr><td>No students registered.</td></tr>')+'</section>'}
function reports(){
 return '<section class="panel analytics-cloud-panel"><div class="panel-header"><div><h3>Advanced analytics</h3><p>Cloud-backed academic and attendance overview for this centre</p></div><button class="secondary-btn" id="refreshAdvancedAnalytics" type="button">Refresh data</button></div><div id="advancedAnalytics"><p class="muted-note">Loading centre analytics…</p></div></section><section class="page-panel" style="margin-top:16px"><div class="panel-header"><div><h3>Data backup</h3><p>Download a JSON copy of the current browser workspace.</p></div><button class="primary-btn" id="backupData">↓ Download backup</button></div><p class="muted-note">This backup contains the data currently available in this browser. It is not a full Supabase database backup.</p></section>';
}
function renderAdvancedAnalytics(data){
 const students=data.students||[],attendance=data.attendance||[],results=data.results||[],attempts=data.attempts||[];
 const avg=arr=>arr.length?Math.round(arr.reduce((n,x)=>n+Number(x.score||0)/Math.max(1,Number(x.max_score||x.question_count||1))*100,0)/arr.length):null;
 const overall=avg(results),examAvg=avg(attempts);
 const present=attendance.filter(x=>x.status==='Present'||x.status==='Late').length;
 const attendanceRate=attendance.length?Math.round(present/attendance.length*100):null;
 const byGroup={};students.forEach(s=>{const g=s.group_name||'Unassigned';byGroup[g]=(byGroup[g]||0)+1});
 const groupRows=Object.entries(byGroup).sort((x,y)=>y[1]-x[1]).slice(0,8).map(([g,n])=>'<tr><td>'+esc(g)+'</td><td>'+n+'</td><td>'+Math.round(n/Math.max(1,students.length)*100)+'%</td></tr>').join('');
 const monthMap={};attempts.forEach(x=>{const key=String(x.completed_at||'').slice(0,7);if(!key)return;const m=monthMap[key]||(monthMap[key]={n:0,score:0});m.n++;m.score+=Number(x.score||0)/Math.max(1,Number(x.question_count||1))*100});
 const months=Object.entries(monthMap).sort((x,y)=>x[0].localeCompare(y[0])).slice(-6);
 const peak=Math.max(1,...months.map(x=>x[1].n));
 const trend=months.length?'<div class="bar-chart analytics-trend">'+months.map(([key,v])=>'<div class="bar-month"><div class="bar-columns"><i class="income-bar" title="'+v.n+' attempts" style="height:'+Math.max(4,v.n/peak*100)+'%"></i></div><small>'+esc(key)+'</small><small>'+Math.round(v.score/v.n)+'%</small></div>').join('')+'</div>':'<p class="muted-note">No saved timed exam attempts yet.</p>';
 const low=results.filter(x=>Number(x.max_score)>0&&Number(x.score)/Number(x.max_score)<.6).length;
 const recent=attempts.slice(0,10).map(x=>'<tr><td><strong>'+esc(x.title)+'</strong></td><td>'+esc(x.cefr_level)+'</td><td>'+x.score+'/'+x.question_count+' ('+Math.round(Number(x.score)/Math.max(1,Number(x.question_count))*100)+'%)</td><td>'+new Date(x.completed_at).toLocaleDateString('en-GB')+'</td></tr>').join('');
 return '<div class="stats-grid analytics-stats">'+stat('Active learners',students.filter(s=>s.status==='Active').length,'♙',students.length+' total learner records')+stat('30-day attendance',attendanceRate===null?'—':attendanceRate+'%','◷',attendance.length+' attendance entries')+stat('Gradebook average',overall===null?'—':overall+'%','▥',results.length+' recorded assessments')+stat('Timed exam average',examAvg===null?'—':examAvg+'%','◴',attempts.length+' saved exam attempts')+'</div><div class="analytics-grid"><section class="panel chart-panel"><div class="panel-header"><div><h3>Enrolment by group</h3><p>Current student records</p></div></div>'+table(['GROUP','LEARNERS','SHARE'],groupRows||'<tr><td colspan="3">No cloud student records yet.</td></tr>')+'</section><section class="panel chart-panel"><div class="panel-header"><div><h3>Learning indicators</h3><p>Based on recorded assessments only</p></div></div><div class="report-cards"><div class="report-card"><small>Results below 60%</small><strong>'+low+'</strong><p>Assessment records, not a diagnosis</p></div><div class="report-card"><small>Attendance entries</small><strong>'+attendance.length+'</strong><p>Last 30 days</p></div></div></section><section class="panel chart-panel chart-wide"><div class="panel-header"><div><h3>Timed exam activity</h3><p>Monthly attempts and average score · latest six months with activity</p></div></div>'+trend+'</section><section class="panel chart-panel chart-wide"><div class="panel-header"><div><h3>Recent timed exams</h3><p>Latest saved assessments across this centre</p></div></div>'+table(['ASSESSMENT','LEVEL','SCORE','DATE'],recent||'<tr><td colspan="4">No saved exam attempts yet.</td></tr>')+'</section></div><p class="muted-note">Analytics use records available in Supabase. Missing data is not treated as a zero score. These indicators support teacher review and do not make automated decisions about learners.</p>';
}
async function loadAdvancedAnalytics(){
 const host=document.querySelector('#advancedAnalytics');if(!host)return;
 if(!window.schoolCloud?.getAnalytics){host.innerHTML='<p class="muted-note">Sign in with a staff account to view cloud analytics. Preview mode shows no shared centre-wide figures.</p>';return}
 host.innerHTML='<p class="muted-note">Refreshing centre analytics…</p>';
 try{const data=await window.schoolCloud.getAnalytics();if(!document.querySelector('#advancedAnalytics'))return;host.innerHTML=renderAdvancedAnalytics(data)}
 catch(err){host.innerHTML='<p class="muted-note">Could not load analytics: '+esc(err.message||'Unknown error')+'</p>'}
}


function classroom(){
 const cards=[['lessons','Lesson plans','Plan upcoming teaching sessions','＋ Add lesson'],['homework','Homework','Assign work and track due dates','＋ Assign homework'],['assessments','Assessments','Schedule tests and exams','＋ Create assessment']];
 const summary='<div class="stats-grid">'+stat('Lesson plans',db.lessons.length,'▤','Teaching sessions')+stat('Homework tasks',db.homework.length,'✎','Assignments created')+stat('Assessments',db.assessments.length,'▥','Tests and exams')+'</div>';
 const sections=cards.map(([key,title,desc,btn])=>{const rows=(db[key]||[]).slice().reverse().slice(0,5).map(x=>'<tr><td><strong>'+esc(x.title)+'</strong><small class="cell-sub">'+esc(x.group||'All groups')+'</small></td><td>'+esc(x.teacher||'Not assigned')+'</td><td>'+dateFmt(x.date||x.due_date)+'</td><td><button class="text-link" data-delete="'+key+'" data-id="'+x.id+'">Remove</button></td></tr>').join('');return '<section class="panel classroom-panel"><div class="panel-header"><div><h3>'+title+'</h3><p>'+desc+'</p></div><button class="primary-btn" data-modal="'+key+'">'+btn+'</button></div>'+table(['TITLE / GROUP','TEACHER','DATE',''],rows||'<tr><td colspan="4">Nothing added yet.</td></tr>')+'</section>'}).join('');
 return summary+sections+'<p class="muted-note">Academic records are saved with the school workspace. Teacher-specific account permissions and parent grade visibility are the next integration step.</p>';
}
function teacherhome(){
 const teacher=(db.teachers||[])[0]||{};
 const day=new Date().getDay()||7;
 const today=(db.timetable||[]).filter(x=>Number(x.weekday)===day&&x.status==='Scheduled').sort((x,y)=>String(x.starts_at).localeCompare(String(y.starts_at)));
 const upcoming=today.map(x=>'<tr><td><strong>'+esc(x.starts_at)+' – '+esc(x.ends_at)+'</strong></td><td>'+esc(x.group)+'</td><td>'+esc(x.room||'—')+'</td></tr>').join('');
 const groups=(db.groups||[]).map(g=>'<tr><td><strong>'+esc(g.name)+'</strong></td><td>'+esc(g.subject||'—')+'</td><td>'+esc(g.schedule||'—')+'</td></tr>').join('');
 return '<div class="stats-grid">'+stat('My groups',db.groups.length,'▤','Groups assigned to you')+stat('My students',db.students.length,'♙','Students in your groups')+stat('Today’s lessons',today.length,'◷','Scheduled for today')+stat('Homework tasks',db.homework.length,'✎','Visible assignments')+'</div><section class="panel"><div class="panel-header"><div><h3>Welcome, '+esc(teacher.name||window.schoolCloud?.profile?.full_name||'Teacher')+'</h3><p>'+esc(teacher.subject||'Your teaching workspace')+'</p></div><span class="tag">Teacher portal</span></div><h4>Today’s lessons</h4>'+table(['TIME','GROUP','ROOM'],upcoming||'<tr><td colspan="3">No lessons scheduled for today.</td></tr>')+'</section><section class="panel"><div class="panel-header"><div><h3>My assigned groups</h3><p>Only groups assigned to your teacher account appear here.</p></div></div>'+table(['GROUP','SUBJECT','SCHEDULE'],groups||'<tr><td colspan="3">No groups have been assigned yet. Please contact the centre administrator.</td></tr>')+'</section><p class="muted-note">Use Attendance to take the daily register, Classroom to assign homework, and Gradebook to record student results.</p>';
}
function timetable(){
 const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
 const rows=(db.timetable||[]).slice().sort((x,y)=>(Number(x.weekday)-Number(y.weekday))||String(x.starts_at).localeCompare(String(y.starts_at))).map(x=>'<tr><td><strong>'+days[Number(x.weekday)-1]+'</strong></td><td>'+esc(x.starts_at)+' – '+esc(x.ends_at)+'</td><td>'+esc(x.group)+'</td><td>'+esc(x.teacher)+'</td><td>'+esc(x.room||'—')+'</td><td>'+dateFmt(x.effective_from)+' – '+(x.effective_until?dateFmt(x.effective_until):'No end date')+'</td><td><span class="status '+(x.status==='Scheduled'?'active':'pending')+'">'+esc(x.status)+'</span></td><td><button class="text-link" data-delete="timetable" data-id="'+esc(x.id)+'">Remove</button></td></tr>').join('');
 const active=(db.timetable||[]).filter(x=>x.status==='Scheduled').length;
 return '<div class="stats-grid">'+stat('Scheduled sessions',active,'◷','Active weekly timetable entries')+stat('Teachers scheduled',new Set((db.timetable||[]).filter(x=>x.status==='Scheduled').map(x=>x.teacher)).size,'♧','Distinct teaching staff')+stat('Groups scheduled',new Set((db.timetable||[]).filter(x=>x.status==='Scheduled').map(x=>x.group)).size,'▤','Distinct learning groups')+'</div><section class="panel"><div class="panel-header"><div><h3>Weekly timetable</h3><p>Recurring weekly lessons. Conflicting teacher, group or room bookings are rejected by the database.</p></div><button class="primary-btn" data-modal="timetable">＋ Add lesson slot</button></div>'+table(['DAY','TIME','GROUP','TEACHER','ROOM','VALID FROM / UNTIL','STATUS',''],rows||'<tr><td colspan="8">No timetable slots yet. Add the first lesson slot to begin.</td></tr>')+'</section><p class="muted-note">Times use the centre’s local time. A slot repeats every week from its effective start date until its optional end date. Cancelled slots remain in the timetable history but do not block new bookings.</p>';
}
function results(){
 const rows=(db.results||[]).slice().reverse().map(x=>'<tr><td>'+person(x.student)+'</td><td>'+esc(x.assessment)+'</td><td><strong>'+esc(x.score)+' / '+esc(x.max_score)+'</strong></td><td>'+dateFmt(x.date)+'</td><td>'+esc(x.feedback||'—')+'</td><td><button class="text-link" data-delete="results" data-id="'+x.id+'">Remove</button></td></tr>').join('');
 return '<section class="panel"><div class="panel-header"><div><h3>Gradebook</h3><p>Track test scores and student progress</p></div><button class="primary-btn" data-modal="results">＋ Record result</button></div>'+table(['STUDENT','ASSESSMENT','SCORE','DATE','FEEDBACK',''],rows||'<tr><td colspan="6">No results recorded yet.</td></tr>')+'</section>';
}


const questionBank=[
{topic:'Present Simple',level:'A1',q:'She ___ to school every day.',o:['go','goes','going','gone'],a:1},
{topic:'Present Simple',level:'A1',q:'They ___ football on Sundays.',o:['plays','playing','play','played'],a:2},
{topic:'Present Simple',level:'A1',q:'My father ___ coffee.',o:['don’t drink','doesn’t drink','isn’t drink','not drinks'],a:1},
{topic:'Past Simple',level:'A2',q:'We ___ a film last night.',o:['watch','watched','watches','watching'],a:1},
{topic:'Past Simple',level:'A2',q:'She ___ to London two years ago.',o:['go','goes','went','gone'],a:2},
{topic:'Past Simple',level:'A2',q:'I ___ my homework yesterday.',o:['didn’t finish','don’t finished','not finish','wasn’t finish'],a:0},
{topic:'Present Perfect',level:'B1',q:'I ___ never ___ sushi.',o:['have / tried','did / try','has / tried','am / trying'],a:0},
{topic:'Present Perfect',level:'B1',q:'She has lived here ___ 2020.',o:['for','since','during','from'],a:1},
{topic:'Present Perfect',level:'B1',q:'Have you finished your work ___?',o:['already','yet','still','ever'],a:1},
{topic:'Articles',level:'A1',q:'I saw ___ elephant at the zoo.',o:['a','an','the','—'],a:1},
{topic:'Articles',level:'A2',q:'___ sun rises in the east.',o:['A','An','The','—'],a:2},
{topic:'Articles',level:'A2',q:'She is ___ university student.',o:['a','an','the','—'],a:0},
{topic:'Prepositions',level:'A1',q:'The lesson starts ___ 9 o’clock.',o:['in','on','at','by'],a:2},
{topic:'Prepositions',level:'A2',q:'My birthday is ___ May.',o:['at','on','in','to'],a:2},
{topic:'Prepositions',level:'A2',q:'The book is ___ the table.',o:['at','on','in','between'],a:1},
{topic:'Conditionals',level:'B1',q:'If it rains, we ___ at home.',o:['stay','will stay','would stay','stayed'],a:1},
{topic:'Conditionals',level:'B1',q:'If I had more time, I ___ another language.',o:['learn','will learn','would learn','learned'],a:2},
{topic:'Conditionals',level:'B2',q:'If she had studied, she ___ the exam.',o:['would pass','will pass','would have passed','passed'],a:2},
{topic:'Passive Voice',level:'B1',q:'English ___ in many countries.',o:['speaks','is spoken','spoke','is speaking'],a:1},
{topic:'Passive Voice',level:'B2',q:'The bridge ___ next year.',o:['will build','will be built','is building','built'],a:1},
{topic:'Modals',level:'A2',q:'You ___ wear a seat belt. It is the law.',o:['might','must','could','would'],a:1},
{topic:'Modals',level:'B1',q:'You ___ have told me earlier. I was worried.',o:['should','must','can','may'],a:0},
{topic:'Vocabulary',level:'A2',q:'Choose the closest meaning of “rapid”.',o:['slow','quick','quiet','careful'],a:1},
{topic:'Vocabulary',level:'B1',q:'A person who is “reliable” can be ___.',o:['trusted','ignored','avoided','confused'],a:0},
{topic:'Vocabulary',level:'B2',q:'The word “reluctant” means ___.',o:['eager','unwilling','certain','delighted'],a:1},
{topic:'Vocabulary',level:'B2',q:'Choose the opposite of “scarce”.',o:['rare','limited','abundant','insufficient'],a:2}
,{topic:'Inversion',level:'C1',q:'Rarely ___ such a convincing argument.',o:['I have heard','have I heard','I heard','I had heard'],a:1}
,{topic:'Inversion',level:'C1',q:'Not until the data was published ___ the scale of the problem.',o:['we realised','did we realise','we had realised','had we realised'],a:1}
,{topic:'Cleft sentences',level:'C1',q:'It was the lack of funding ___ ultimately delayed the project.',o:['what','which','that','where'],a:2}
,{topic:'Modal deduction',level:'C1',q:'The lights are on; they ___ be at home.',o:['must','should','would','can'],a:0}
,{topic:'Advanced collocations',level:'C1',q:'The committee reached a ___ decision after hours of debate.',o:['considered','considerable','considering','considerate'],a:0}
,{topic:'Advanced vocabulary',level:'C1',q:'“To mitigate” a problem means to ___.',o:['make it worse','reduce its severity','ignore it','predict it'],a:1}
,{topic:'Concession',level:'C1',q:'___ the initial criticism, the policy proved effective.',o:['Although','Despite','Nevertheless','Whereas'],a:1}
,{topic:'Participle clauses',level:'C1',q:'___ the report, she identified several inconsistencies.',o:['Having reviewed','Have reviewed','Reviewed having','To reviewing'],a:0}
,{topic:'Advanced vocabulary',level:'C1',q:'A “pervasive” influence is one that is ___.',o:['short-lived','widespread','unimportant','deliberate'],a:1}
,{topic:'Register',level:'C1',q:'Which is the most formal alternative to “look into the issue”?',o:['check out the issue','investigate the matter','see what happened','have a look'],a:1}
,{topic:'Nuanced meaning',level:'C1',q:'“The proposal is feasible” means it is ___.',o:['controversial','practical and achievable','legally binding','already completed'],a:1}
,{topic:'Dependent prepositions',level:'C1',q:'The findings are consistent ___ earlier research.',o:['to','for','with','at'],a:2}
,{topic:'Inversion',level:'C2',q:'Little ___ that the decision would have such far-reaching consequences.',o:['they anticipated','did they anticipate','they had anticipated','had they anticipate'],a:1}
,{topic:'Subjunctive',level:'C2',q:'The panel recommended that the proposal ___ revised.',o:['is','was','be','being'],a:2}
,{topic:'Advanced syntax',level:'C2',q:'Were it not for her intervention, the negotiations ___ collapsed.',o:['will have','would have','had','would'],a:1}
,{topic:'Idiomatic precision',level:'C2',q:'His apology did little to ___ the growing resentment.',o:['allay','allure','elicit','elude'],a:0}
,{topic:'Advanced vocabulary',level:'C2',q:'“Equivocal” most nearly means ___.',o:['unambiguous','open to more than one interpretation','extremely persuasive','irrelevant'],a:1}
,{topic:'Discourse markers',level:'C2',q:'The evidence is compelling; ___, it does not establish causation.',o:['conversely','nonetheless','thereby','henceforth'],a:1}
,{topic:'Advanced collocations',level:'C2',q:'The report offers a ___ critique of the prevailing assumptions.',o:['trenchant','trench','trenched','trenching'],a:0}
,{topic:'Nuanced meaning',level:'C2',q:'A “disingenuous” response is best described as ___.',o:['frank and direct','slightly irrelevant','not entirely candid or sincere','unintentionally humorous'],a:2}
,{topic:'Advanced vocabulary',level:'C2',q:'To “obviate” the need for further action is to ___.',o:['make it unnecessary','postpone it','complicate it','dispute it'],a:0}
,{topic:'Inversion',level:'C2',q:'Only after the second review ___ the discrepancy.',o:['they noticed','they had noticed','did they notice','had they notice'],a:2}
,{topic:'Advanced vocabulary',level:'C2',q:'A “perfunctory” inspection is one that is ___.',o:['meticulous','superficial and routine','unexpectedly thorough','legally required'],a:1}
,{topic:'Register',level:'C2',q:'Which phrase most appropriately signals a carefully qualified claim?',o:['Everyone knows that','It is indisputable that','It would be premature to conclude that','There is no doubt whatsoever that'],a:2}
,{topic:'Advanced collocations',level:'C2',q:'The findings call into ___ the validity of the original methodology.',o:['question','doubtful','uncertain','suspicion'],a:0}

];
let generatedPaper=[];
function testStudio(){
 const topics=[...new Set(questionBank.map(q=>q.topic))];
 return '<section class="panel test-studio"><div class="panel-header"><div><h3>Teaching Assistant</h3><p>Prepare classroom materials across CEFR levels A1–C2</p></div><span class="tag">Teacher workspace · Beta</span></div><div class="assistant-intro"><div class="assistant-orb">✦</div><div><strong>Your lesson preparation desk</strong><p>Build printable grammar tests, reading tasks, writing prompts and vocabulary practice.</p></div></div><form id="testBuilder" class="test-builder"><div class="field"><label>Material type</label><select name="material"><option value="exam">Timed exam simulator (multiple choice)</option><option value="grammar">Grammar & multiple choice</option><option value="reading">Reading comprehension</option><option value="writing">Writing practice</option><option value="vocabulary">Vocabulary practice</option></select></div><div class="field"><label>Topic</label><select name="topic"><option value="All">All topics</option>'+topics.map(t=>'<option>'+esc(t)+'</option>').join('')+'</select></div><div class="field"><label>CEFR level</label><select name="level"><option>A1</option><option>A2</option><option selected>B1</option><option>B2</option><option>C1</option><option>C2</option></select></div><div class="field"><label>Exam duration</label><select id="examDuration" name="duration"><option value="10">10 minutes</option><option value="20" selected>20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option></select></div><div class="field"><label>Number of questions / tasks</label><select name="count"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></div><div class="field full"><label>Worksheet title</label><input name="title" value="English Practice Worksheet" required></div><button class="primary-btn" type="submit">✦ Create learning material</button></form><div id="testPreview" class="test-preview"><div class="empty-state"><strong>Your worksheet will appear here</strong><p>Select a material type and level to prepare a classroom resource.</p></div></div></section><section class="panel exam-history-panel"><div class="panel-header"><div><h3>Recent exam attempts</h3><p>Your centre’s latest timed assessment results</p></div><button class="secondary-btn" id="refreshExamHistory" type="button">Refresh</button></div><div id="examHistory"><p class="muted-note">Loading exam history…</p></div></section><section class="panel ai-roadmap"><h3>AI-powered generation — next connection</h3><p>Secure AI generation will be enabled through a server-side service. Your OpenAI API key will never be stored in this website or exposed to students and teachers.</p><span class="status pending">API connection required</span></section>';
}
function generateTest(e){
 e.preventDefault();const f=new FormData(e.currentTarget),topic=f.get('topic'),level=f.get('level'),count=Number(f.get('count')),material=f.get('material'),title=String(f.get('title')||'English Practice Worksheet');
 const preview=document.querySelector('#testPreview');
 if(material==='exam'){const pool=questionBank.filter(q=>(topic==='All'||q.topic===topic)&&q.level===level);if(!pool.length){notify('There are no objective questions for this level and topic yet.');return}startTimedExam(pool.slice().sort(()=>Math.random()-.5).slice(0,Math.min(count,pool.length)),title,level,topic);return}
 if(material==='grammar'||material==='vocabulary'){
  let pool=questionBank.filter(q=>(topic==='All'||q.topic===topic)&&(q.level===level||material==='vocabulary'&&q.topic==='Vocabulary'&&q.level===level));
  if(!pool.length){notify('No reviewed questions match this selection yet. Try another level or topic.');return}
  generatedPaper=pool.sort(()=>Math.random()-.5).slice(0,Math.min(count,pool.length));
  const paper='<div class="test-paper"><div class="test-paper-head"><span>DREAMS INTERNATIONAL SCHOOL</span><h2>'+esc(title)+'</h2><p>Level: '+esc(level)+' · Topic: '+esc(topic)+' · Questions: '+generatedPaper.length+'</p><div class="test-student-line">Name: __________________________ Date: ______________ Score: ______ / '+generatedPaper.length+'</div></div>'+generatedPaper.map((q,i)=>'<div class="test-question"><strong>'+String(i+1)+'. '+esc(q.q)+'</strong><div class="test-options">'+q.o.map((o,j)=>'<span>'+String.fromCharCode(65+j)+'. '+esc(o)+'</span>').join('')+'</div></div>').join('')+'</div>';
  preview.innerHTML=paper+'<div class="test-actions"><button class="primary-btn" id="printTest" type="button">Print / Save PDF</button><button class="secondary-btn" id="downloadAnswers" type="button">Download answer key</button></div>';
  document.querySelector('#printTest').addEventListener('click',()=>printLearningMaterial(title));
  document.querySelector('#downloadAnswers').addEventListener('click',()=>download(title+'\\n\\n'+generatedPaper.map((q,i)=>(i+1)+'. '+String.fromCharCode(65+q.a)+' — '+q.o[q.a]).join('\\n'),'answer-key.txt','text/plain'));
  return;
 }
 const tasks=material==='reading'?readingTasks(level,count):writingTasks(level,count);
 preview.innerHTML='<div class="test-paper"><div class="test-paper-head"><span>DREAMS INTERNATIONAL SCHOOL</span><h2>'+esc(title)+'</h2><p>Level: '+esc(level)+' · '+(material==='reading'?'Reading comprehension':'Writing practice')+'</p><div class="test-student-line">Name: __________________________ Date: ______________</div></div>'+tasks+'</div><div class="test-actions"><button class="primary-btn" id="printTest" type="button">Print / Save PDF</button></div>';
 document.querySelector('#printTest').addEventListener('click',()=>printLearningMaterial(title));
}


async function loadExamHistory(){
 const host=document.querySelector('#examHistory');if(!host)return;
 if(!window.schoolCloud?.listExamAttempts){host.innerHTML='<p class="muted-note">Sign in with a staff account to view saved exam attempts.</p>';return}
 host.innerHTML='<p class="muted-note">Loading exam history…</p>';
 try{
  const rows=await window.schoolCloud.listExamAttempts();
  if(!document.querySelector('#examHistory'))return;
  if(!rows.length){host.innerHTML='<div class="empty-state"><strong>No saved attempts yet</strong><p>Complete a timed multiple-choice exam and its result will appear here.</p></div>';return}
  host.innerHTML='<div class="table-wrap"><table><thead><tr><th>Assessment</th><th>Level</th><th>Score</th><th>Answered</th><th>Duration</th><th>Completed</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><strong>'+esc(x.title)+'</strong><small class="history-topic">'+esc(x.topic)+'</small></td><td>'+esc(x.cefr_level)+'</td><td><strong>'+x.score+'/'+x.question_count+'</strong> · '+Math.round(x.score/x.question_count*100)+'%</td><td>'+x.answered_count+'/'+x.question_count+'</td><td>'+Math.floor(x.duration_seconds/60)+'m '+(x.duration_seconds%60)+'s</td><td>'+new Date(x.completed_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</td></tr>').join('')+'</tbody></table></div>';
 }catch(err){host.innerHTML='<p class="muted-note">Could not load exam history: '+esc(err.message||'Unknown error')+'</p>'}
}

function startTimedExam(questions,title,level,topic='All'){
 const preview=document.querySelector('#testPreview');let seconds=Number(document.querySelector('#examDuration')?.value||20)*60;const totalSeconds=seconds;let finished=false,timer=null;
 const clock=()=>String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 preview.innerHTML='<div class="exam-top"><div><span class="tag">Timed assessment</span><h3>'+esc(title)+'</h3><p>CEFR '+esc(level)+' · '+questions.length+' questions · One point each</p></div><div class="exam-clock" id="examClock" role="timer">'+clock()+'</div></div><form id="liveExamForm"><div class="exam-instructions">Choose one answer for each question. Your answers are checked when you submit or when the timer reaches zero.</div>'+questions.map((q,i)=>'<fieldset class="exam-question"><legend>'+(i+1)+'. '+esc(q.q)+'</legend>'+q.o.map((o,j)=>'<label class="exam-option"><input type="radio" name="q'+i+'" value="'+j+'"><span>'+String.fromCharCode(65+j)+'. '+esc(o)+'</span></label>').join('')+'</fieldset>').join('')+'<button class="primary-btn" type="submit">Submit examination</button></form>';
 const form=document.querySelector('#liveExamForm');
 function finish(){
  if(finished)return;finished=true;if(timer)clearInterval(timer);
  const fd=new FormData(form);let score=0,answered=0;
  const review=questions.map((q,i)=>{const raw=fd.get('q'+i),chosen=raw===null?null:Number(raw),correct=chosen===q.a;if(chosen!==null)answered++;if(correct)score++;return '<div class="exam-review '+(correct?'correct':chosen===null?'unanswered':'incorrect')+'"><strong>'+(i+1)+'. '+esc(q.q)+'</strong><p>Your answer: '+(chosen===null?'Not answered':esc(q.o[chosen]))+'</p><p>Correct answer: <strong>'+String.fromCharCode(65+q.a)+'. '+esc(q.o[q.a])+'</strong></p></div>'}).join('');
  preview.innerHTML='<section class="exam-result"><span class="tag">Assessment complete</span><h2>'+score+' / '+questions.length+'</h2><p>'+Math.round(score/questions.length*100)+'% · '+answered+' of '+questions.length+' answered</p><div class="exam-score-track"><span style="width:'+(score/questions.length*100)+'%"></span></div><h3>Answer review</h3>'+review+'<p id="examSaveStatus" class="muted-note">Saving result to your school history…</p><button class="primary-btn" id="printExamResult" type="button">Print results</button></section>';
  document.querySelector('#printExamResult').addEventListener('click',()=>printLearningMaterial(title+' — Results'));
  if(window.schoolCloud?.saveExamAttempt){
   const answers=questions.map((q,i)=>{const raw=fd.get('q'+i),chosen=raw===null?null:Number(raw);return {question:q.q,options:q.o,chosen,correct_answer:q.a,is_correct:chosen===q.a}});
   window.schoolCloud.saveExamAttempt({title,cefr_level:level,topic,question_count:questions.length,score,answered_count:answered,duration_seconds:totalSeconds-seconds,answers})
    .then(()=>{const status=document.querySelector('#examSaveStatus');if(status)status.textContent='Saved to your school exam history.';if(page==='teststudio')loadExamHistory()})
    .catch(err=>{const status=document.querySelector('#examSaveStatus');if(status)status.textContent='Could not save to cloud: '+(err.message||'Please try again.')});
  }else{
   const status=document.querySelector('#examSaveStatus');if(status)status.textContent='Cloud sign-in is required to save exam history.';
  }
 }
 form.addEventListener('submit',e=>{e.preventDefault();finish()});
 timer=setInterval(()=>{if(finished)return;seconds=Math.max(0,seconds-1);const el=document.querySelector('#examClock');if(el)el.textContent=clock();if(seconds===0)finish()},1000);
}

function readingTasks(level,count){
 const texts={C2:'The apparent tension between technological acceleration and institutional continuity is not necessarily irreconcilable. Although innovations frequently unsettle established practices, their long-term significance depends less on novelty than on the social arrangements through which they are adopted. A society that treats every disruption as progress risks mistaking velocity for direction; one that resists change indiscriminately, however, may preserve inefficiencies at considerable human cost. The more demanding task is therefore not to endorse or reject innovation wholesale, but to cultivate the judgement required to distinguish transformative improvements from merely fashionable substitutions.',C1:'Urban green spaces are often described as amenities, yet this characterisation understates their role in public health and social equality. Parks can reduce heat, support biodiversity and provide places where people from different backgrounds encounter one another. Nevertheless, these benefits are not distributed automatically. When investment raises nearby property values without protecting existing residents, improvements may contribute to displacement. Effective planning must therefore combine environmental ambition with affordable housing, accessible transport and meaningful community participation.',A1:'My name is Alex. I live in a small town. Every morning, I walk to school with my sister. Our lessons start at nine o’clock. After school, we play in the park and do our homework.',A2:'Last summer, Emma visited a coastal town with her family. They stayed in a small hotel near the beach. Every morning they explored a different place, tried local food and spoke to people who lived there. Emma enjoyed the trip because she learned about a new culture.',B1:'Many students believe that learning a language requires long hours of study. However, research and classroom experience suggest that regular short practice can be more effective. Reading for fifteen minutes, reviewing vocabulary and speaking a little every day helps learners build confidence and remember new language.',B2:'Public libraries are changing their role in modern communities. While digital resources make information easier to access, libraries continue to offer something distinctive: a shared space for discussion, independent study and cultural activities. Their future may depend less on the number of books on their shelves and more on how effectively they connect people with knowledge and with one another.'};
 const qs={C2:['What distinction does the passage draw between novelty and long-term significance?','Why can treating every disruption as progress be problematic?','What risk is associated with indiscriminate resistance to change?','What does the author identify as the more demanding task?','In context, what does “wholesale” mean?'],C1:['Why does the author consider the term “amenity” insufficient?','Name two environmental or social benefits of parks.','How might investment in green spaces contribute to displacement?','What should effective planning combine?','What does “distributed automatically” imply?'],A1:['Where does Alex live?','Who walks to school with Alex?','What time do lessons start?','Where do they play after school?','What do they do after school?'],A2:['Where did Emma go last summer?','Where was the hotel?','What did the family try?','Why did Emma enjoy the trip?','What did she learn about?'],B1:['What do some students believe about language learning?','What kind of practice may be more effective?','How long is the suggested daily reading?','Name one activity that builds confidence.','What can regular practice help learners remember?'],B2:['How are public libraries changing?','What do digital resources make easier?','Name two things libraries still offer.','What may determine libraries’ future role?','What does “distinctive” mean in this passage?']};
 const answers={C2:['Its significance depends on the social arrangements through which it is adopted, not simply on being new.','It can confuse speed or novelty with genuine progress.','It may preserve inefficiencies and impose human costs.','Developing judgement to distinguish meaningful improvements from fashionable replacements.','Completely or without qualification.'],C1:['Because green spaces also affect public health, equality and social interaction.','For example, reducing heat and supporting biodiversity.','It can raise property values and make an area unaffordable for existing residents.','Environmental goals, affordable housing, accessible transport and community participation.','That benefits do not reach everyone equally or by themselves.'],A1:['In a small town.','His sister.','At nine o’clock.','In the park.','They do their homework.'],A2:['A coastal town.','Near the beach.','Local food.','She learned about a new culture.','A new culture.'],B1:['That it requires long hours.','Regular short practice.','Fifteen minutes.','Reading, reviewing vocabulary or speaking.','New language.'],B2:['They are adapting their role in communities.','Access to information.','Discussion and independent study.','How well they connect people with knowledge.','Special or different.']};
 const n=Math.min(count,5);return '<div class="reading-passage"><strong>Read the text carefully.</strong><p>'+texts[level]+'</p></div>'+qs[level].slice(0,n).map((q,i)=>'<div class="test-question"><strong>'+String(i+1)+'. '+q+'</strong><p>____________________________________________________________</p></div>').join('')+'<details class="teacher-answer-key"><summary>Teacher answer key</summary><ol>'+answers[level].slice(0,n).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></details>';
}
function writingTasks(level,count){
 const prompts={C2:['Write a critical essay evaluating whether technological progress should be guided primarily by efficiency or by social responsibility. Develop a nuanced argument and address counterarguments.','Some argue that preserving cultural traditions is essential; others believe traditions should be continually questioned. Evaluate both positions and reach a reasoned conclusion.','Write a policy briefing proposing how institutions can distinguish meaningful innovation from change driven mainly by fashion.','To what extent can individual freedom coexist with collective responsibility in modern societies? Defend your position with carefully qualified reasoning.','Write a reflective article examining whether certainty is always desirable in public decision-making.'],C1:['Write an essay assessing whether cities should prioritise environmental sustainability even when doing so creates short-term economic costs.','Some people believe universities should focus on employability, while others defend education for its own sake. Discuss and evaluate both views.','Write a formal proposal recommending measures to reduce social inequality in access to public services.','To what extent does the media shape public understanding rather than simply report events? Support your argument with examples.','Write an article evaluating the benefits and limitations of remote work for organisations and employees.'],A1:['Write 5 sentences about your family.','Describe your daily routine.','Write about your favourite food.','Describe your best friend.','Write about your classroom.'],A2:['Write an email inviting a friend to your birthday.','Describe a memorable weekend.','Write about a place you would like to visit.','Describe your favourite hobby.','Write a message thanking someone for a gift.'],B1:['Do you prefer studying alone or with others? Give reasons.','Describe a challenge you overcame and what you learned.','Should students have less homework? Explain your opinion.','Write an email asking for information about a course.','How can young people protect the environment?'],B2:['Some people think online learning will replace classrooms. Discuss both views.','Should cities invest more in public transport than roads? Explain.','Describe how technology has changed communication.','Is it better to work for a large company or a small business?','What responsibilities do individuals have towards the environment?']};
 return writingPrompts=prompts[level].slice(0,Math.min(count,5)).map((p,i)=>'<div class="test-question"><strong>Task '+(i+1)+'</strong><p>'+esc(p)+'</p><div class="writing-lines">________________________________________________________________<br/>________________________________________________________________<br/>________________________________________________________________<br/>________________________________________________________________</div></div>').join('');
}
function printLearningMaterial(title){
 const paper=document.querySelector('.test-paper');if(!paper)return;const w=window.open('','_blank');if(!w){notify('Please allow pop-ups to print the worksheet.');return}
 w.document.write('<html><head><title>'+esc(title)+'</title><style>body{font:14px Arial;color:#17213a;padding:28px}.test-paper-head{text-align:center;border-bottom:1px solid #ddd;padding-bottom:18px}.test-paper-head span{font-size:11px;letter-spacing:2px}.test-student-line{margin-top:22px;text-align:left}.test-question{padding:16px 0;border-bottom:1px solid #eee;break-inside:avoid}.test-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.reading-passage{line-height:1.7;background:#f6f8fb;padding:18px;margin:20px 0}.writing-lines{line-height:2.3;color:#aaa}.teacher-answer-key{margin-top:20px}</style></head><body>'+paper.outerHTML+'</body></html>');w.document.close();w.focus();w.print();
}


function performance(){
 const scored=(db.results||[]).map(r=>({...r,pct:Number(r.max_score)>0?Number(r.score)/Number(r.max_score)*100:null})).filter(r=>r.pct!==null);
 const avg=scored.length?Math.round(scored.reduce((n,r)=>n+r.pct,0)/scored.length):null;
 const allMarks=db.attendance||[],present=allMarks.filter(x=>x.status==='Present'||x.status==='Late').length;
 const attendanceRate=allMarks.length?Math.round(present/allMarks.length*100):null;
 const risk=db.students.filter(st=>{
  const sr=scored.filter(r=>r.student===st.name);
  const ar=allMarks.filter(a=>a.student===st.name);
  const score=sr.length?sr.reduce((n,r)=>n+r.pct,0)/sr.length:null;
  const rate=ar.length?ar.filter(a=>a.status==='Present'||a.status==='Late').length/ar.length*100:null;
  return (score!==null&&score<60)||(rate!==null&&rate<75);
 }).length;
 const studentRows=db.students.map(st=>{
  const sr=scored.filter(r=>r.student===st.name);
  const ar=allMarks.filter(a=>a.student===st.name);
  const mean=sr.length?Math.round(sr.reduce((n,r)=>n+r.pct,0)/sr.length):null;
  const rate=ar.length?Math.round(ar.filter(a=>a.status==='Present'||a.status==='Late').length/ar.length*100):null;
  const weak=sr.filter(r=>r.pct<60).sort((a,b)=>a.pct-b.pct).slice(0,2).map(r=>esc(r.assessment)+' ('+Math.round(r.pct)+'%)').join(', ');
  const badge=mean!==null&&mean<60?'Needs support':rate!==null&&rate<75?'Attendance watch':mean!==null&&mean>=80?'On track':'Developing';
  return '<tr><td>'+person(st.name)+'</td><td>'+esc(st.group||'—')+'</td><td>'+(mean===null?'No scores':mean+'%')+'</td><td>'+(rate===null?'No attendance':rate+'%')+'</td><td>'+(weak||'—')+'</td><td><span class="status '+(badge==='Needs support'?'pending':badge==='On track'?'active':'')+'">'+badge+'</span></td></tr>';
 }).join('');
 const topWeak={};scored.forEach(r=>{if(r.pct<60)topWeak[r.assessment]=(topWeak[r.assessment]||0)+1});
 const weakList=Object.entries(topWeak).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const weakHtml=weakList.length?weakList.map(([k,n])=>'<div class="weak-row"><span>'+esc(k)+'</span><strong>'+n+' low result(s)</strong></div>').join(''):'<p class="muted-note">No low-scoring assessment records yet. Add results in Gradebook to identify topics needing attention.</p>';
 return '<div class="stats-grid">'+stat('Students',db.students.length,'♙','Registered learners')+stat('Average score',avg===null?'—':avg+'%','▥',scored.length+' recorded results')+stat('Attendance rate',attendanceRate===null?'—':attendanceRate+'%','◷',allMarks.length+' attendance records')+stat('Learners to review',risk,'⚑','Based on available scores and attendance')+'</div><section class="panel performance-panel"><div class="panel-header"><div><h3>Individual performance</h3><p>Academic and attendance indicators for each learner</p></div><button class="primary-btn" data-page="results">Open gradebook</button></div>'+table(['STUDENT','GROUP','AVERAGE SCORE','ATTENDANCE','LOW RESULTS','INDICATOR'],studentRows||'<tr><td colspan="6">No students have been added yet.</td></tr>')+'</section><section class="panel performance-panel"><div class="panel-header"><div><h3>Areas needing attention</h3><p>Assessment titles with scores below 60%</p></div></div>'+weakHtml+'</section><p class="muted-note">Indicators are simple review prompts, not diagnoses or automated decisions. A missing score or attendance record is shown as unavailable, not treated as a failure.</p>';
}


function settings(){
 const x=window.schoolCloud?.schoolSettings||{};
 return '<section class="panel settings-panel"><div class="panel-header"><div><h3>Centre profile</h3><p>Manage your centre identity and contact details</p></div><span class="tag">Workspace settings</span></div><form id="schoolSettingsForm" class="settings-form"><div class="field full"><label>Centre name</label><input name="name" required maxlength="120" value="'+esc(x.name||'')+'"></div><div class="field"><label>Workspace URL slug</label><input name="slug" required pattern="[a-z0-9-]+" maxlength="80" value="'+esc(x.slug||'')+'"><small>Unique identifier for this centre</small></div><div class="field"><label>Logo image URL</label><input name="logo_url" type="url" placeholder="https://..." value="'+esc(x.logo_url||'')+'"></div><div class="field"><label>Contact email</label><input name="contact_email" type="email" value="'+esc(x.contact_email||'')+'"></div><div class="field"><label>Contact phone</label><input name="contact_phone" type="tel" value="'+esc(x.contact_phone||'')+'"></div><div class="field full"><label>Centre address</label><input name="address" value="'+esc(x.address||'')+'"></div><div class="field"><label>Website</label><input name="website" type="url" placeholder="https://" value="'+esc(x.website||'')+'"></div><div class="field"><label>Brand colour</label><input name="primary_color" type="color" value="'+esc(/^#[0-9a-fA-F]{6}$/.test(x.primary_color||'')?x.primary_color:'#4265e8')+'"></div><div class="settings-plan"><strong>Current plan: '+esc(x.plan||'trial')+'</strong><span>Subscription status: '+esc(x.subscription_status||'trial')+'</span></div><div class="field full"><button class="primary-btn" type="submit">Save centre settings</button></div></form></section><p class="muted-note">Each centre profile is stored separately in Supabase. Subscription billing, custom domains and automatic logo uploads are not enabled yet.</p>';
}
async function saveSchoolSettings(e){
 e.preventDefault();if(!window.schoolCloud?.updateSchoolSettings){notify('Cloud owner/admin access is required to save centre settings.');return}
 const form=e.currentTarget,button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Saving…';
 try{const values=Object.fromEntries(new FormData(form).entries());await window.schoolCloud.updateSchoolSettings(values);notify('Centre settings saved');go('settings')}
 catch(err){notify(err.message||'Could not save centre settings')}
 finally{button.disabled=false;button.textContent='Save centre settings'}
}


function staff(){
 return '<section class="panel staff-panel"><div class="panel-header"><div><h3>Staff directory</h3><p>Invite teachers and finance staff to your centre workspace</p></div><button class="primary-btn" id="refreshStaff" type="button">Refresh</button></div><div id="staffRows"><p class="muted-note">Loading staff accounts…</p></div></section><section class="panel staff-panel"><div class="panel-header"><div><h3>Invite a team member</h3><p>They will receive an email invitation to set up their account</p></div></div><form id="staffInviteForm" class="staff-form"><div class="field"><label>Full name</label><input name="full_name" required maxlength="100"></div><div class="field"><label>Email address</label><input name="email" type="email" required></div><div class="field"><label>Role</label><select name="role"><option value="teacher">Teacher</option><option value="accountant">Accountant</option><option value="admin">Administrator</option></select></div><div class="field"><label>Link to teacher record (required for teachers)</label><select name="teacher_id" id="staffTeacherSelect"><option value="">Select a teacher</option></select></div><button class="primary-btn" type="submit">Send staff invitation</button></form><p class="muted-note">Only the centre owner can invite another administrator. Teachers and accountants receive restricted workspace access.</p></section>';
}
async function loadStaff(){
 const box=document.querySelector('#staffRows');if(!box)return;
 try{const {data,error}=await window.schoolSupabase.functions.invoke('manage-staff',{body:{action:'list'}});if(error)throw error;if(data?.error)throw new Error(data.error);
 const rows=(data.staff||[]).map(x=>'<tr><td><strong>'+esc(x.full_name)+'</strong></td><td>'+esc(x.role)+'</td><td>'+esc(x.teacher_name||'—')+'</td><td>'+dateFmt(x.created_at)+'</td></tr>').join('');
 box.innerHTML=table(['NAME','ROLE','TEACHER RECORD','ADDED'],rows||'<tr><td colspan="4">No staff accounts found.</td></tr>');
 }catch(e){box.innerHTML='<p class="muted-note">'+esc(e.message||'Could not load staff list')+'</p>'}
}
async function inviteStaff(e){
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Sending invitation…';
 try{const payload=Object.fromEntries(new FormData(form).entries());const {data,error}=await window.schoolSupabase.functions.invoke('manage-staff',{body:{action:'invite',...payload}});if(error)throw error;if(data?.error)throw new Error(data.error);notify('Staff invitation sent');form.reset();await loadStaff()}
 catch(err){notify(err.message||'Could not invite staff')}finally{button.disabled=false;button.textContent='Send staff invitation'}
}

function parents(){
 const options=db.students.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' — '+esc(s.group)+'</option>').join('');
 return '<section class="page-panel"><div class="panel-header"><div><h3>Invite a parent</h3><p>Send a secure sign-in invitation linked to one student</p></div><span class="tag">Private parent portal</span></div><form id="parentInviteForm" class="parent-invite-form"><div class="field"><label>Parent full name</label><input name="parent_name" required placeholder="Parent name"></div><div class="field"><label>Parent email address</label><input name="email" type="email" required placeholder="parent@example.com"></div><div class="field"><label>Student</label><select name="student_id" required>'+options+'</select></div><div class="field"><label>Relationship</label><select name="relationship"><option>Parent</option><option>Mother</option><option>Father</option><option>Guardian</option></select></div><button class="primary-btn" type="submit">Send parent invitation</button></form><p class="muted-note">Parents receive an email invitation, create their own password and can only see children linked to their account.</p></section><section class="panel" style="margin-top:16px"><h3>How the parent portal works</h3><p class="muted-note">Parents sign in using their email. They can view attendance status and recent attendance history. They cannot edit school records or view other students.</p></section>';
}

const views={dashboard,students,teachers,groups,timetable,teacherhome,attendance,classroom,results,performance,finance,settings,staff,teststudio:testStudio,payments,expenses,reports,parents};
function render(){
 if(!Object.prototype.hasOwnProperty.call(names,page)||!Object.prototype.hasOwnProperty.call(views,page))page='dashboard';
 const meta=Array.isArray(names[page])?names[page]:names.dashboard;
 const activeView=typeof views[page]==='function'?views[page]:dashboard;
 const setText=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
 setText('#pageTitle',meta[0]||'Dashboard overview');
 setText('#pageSubtitle',meta[1]||'Workspace overview');
 setText('#breadcrumbTitle',meta[0]||'Dashboard overview');
 const pageHeading=document.querySelector('.page-heading');if(pageHeading)pageHeading.hidden=page==='dashboard';
 setText('#studentNavCount',Array.isArray(db.students)?db.students.length:0);
 const content=document.querySelector('#pageContent');if(content)content.innerHTML=activeView();ensureFormAccessibility(document);
 if(page==='teststudio')loadExamHistory();
 if(page==='staff'){const select=document.querySelector('#staffTeacherSelect');if(select)select.innerHTML='<option value="">Select a teacher</option>'+db.teachers.map(t=>'<option value="'+esc(t.cloud_id||'')+'">'+esc(t.name)+' — '+esc(t.subject||'')+'</option>').join('');}
 document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 const quick=document.querySelector('#quickAdd');
 if(quick){quick.hidden=page==='parents';const labels={dashboard:'Add student',students:'Add student',teachers:'Add teacher',groups:'Add group',attendance:'Take attendance',payments:'Record payment',expenses:'Add expense',reports:'Export report',parents:'Invite parent',teststudio:'Build test',performance:'View progress',settings:'Save settings',staff:'Invite staff',finance:'Generate invoices'};quick.innerHTML='＋ <span>'+(labels[page]||'Quick action')+'</span>'}
 document.querySelectorAll('[data-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.modal)));
 document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>removeRecord(b.dataset.delete,b.dataset.id)));
 document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editRecord(b.dataset.edit,b.dataset.id)));
 const search=document.querySelector('#tableSearch');if(search)search.addEventListener('input',()=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=!r.textContent.toLowerCase().includes(search.value.toLowerCase())));
 document.querySelector('#downloadCsv')?.addEventListener('click',()=>csvExport(page));
 document.querySelector('#saveAttendance')?.addEventListener('click',saveAttendance);
 document.querySelector('#backupData')?.addEventListener('click',backup);
 document.querySelector('#parentInviteForm')?.addEventListener('submit',inviteParent);
 document.querySelector('#schoolSettingsForm')?.addEventListener('submit',saveSchoolSettings);
 document.querySelector('#staffInviteForm')?.addEventListener('submit',inviteStaff);
 document.querySelector('#refreshStaff')?.addEventListener('click',loadStaff);
 document.querySelector('#generateBills')?.addEventListener('click',generateMonthlyBills);
 document.querySelector('#testBuilder')?.addEventListener('submit',generateTest);
 document.querySelector('#refreshExamHistory')?.addEventListener('click',loadExamHistory);
 document.querySelector('#refreshAdvancedAnalytics')?.addEventListener('click',loadAdvancedAnalytics);
 if(page==='reports')loadAdvancedAnalytics();
 if(window.schoolApp)window.schoolApp.applyPermissions();
}
function closeMobileNavigation(){const sidebar=document.querySelector('#sidebar'),menu=document.querySelector('#mobileMenu'),backdrop=document.querySelector('#mobileNavBackdrop');sidebar.classList.remove('open');backdrop.hidden=true;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation menu')}
function go(p){page=p;render();closeMobileNavigation()}
// Robust delegated navigation: keeps sidebar links working after every render.
document.addEventListener('click',e=>{const nav=e.target.closest('.nav-item[data-page], [data-page]:not(.nav-item)');if(!nav)return;e.preventDefault();go(nav.dataset.page)},{capture:true});

async function inviteParent(e){
 e.preventDefault();if(!window.schoolCloud||!window.schoolCloud.inviteParent){notify('Parent invitations require cloud sign-in.');return}
 const fd=new FormData(e.currentTarget),button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Sending invitation…';
 try{await window.schoolCloud.inviteParent(Object.fromEntries(fd.entries()));notify('Parent invitation sent');e.currentTarget.reset()}
 catch(err){notify(err.message||'Could not send invitation')}finally{button.disabled=false;button.textContent='Send parent invitation'}
}

async function removeRecord(type,id){
 const target=(db[type]||[]).find(x=>String(x.id)===String(id));
 if(!target){notify('Record could not be found.');return}
 const prompt=type==='teachers'?'Remove this teacher? Their group, lesson and assessment assignments will also be cleared.':'Remove this record?';
 if(!confirm(prompt))return;
 try{
  if(window.schoolCloud?.deleteSchoolRecord)await window.schoolCloud.deleteSchoolRecord(type,String(id));
  else if(['payments','expenses'].includes(type)&&window.schoolCloud?.deleteFinanceTransaction)await window.schoolCloud.deleteFinanceTransaction(type,String(id));
 }catch(e){notify('Cloud deletion failed: '+(e.message||'Unknown error'));return}
 db[type]=db[type].filter(x=>String(x.id)!==String(id));
 if(type==='teachers'){
  const name=String(target.name||'');
  for(const key of ['groups','lessons','homework','assessments']){
   if(Array.isArray(db[key]))db[key]=db[key].map(row=>row.teacher===name?{...row,teacher:''}:row);
  }
 }
 persist();notify(type==='teachers'?'Teacher removed and assignments cleared':'Record removed');
}
function fieldsFor(type){const list=db[type]||[];const groupOptions=db.groups.map(g=>g.name);const studentOptions=db.students.map(s=>s.name);const field=(name,label,kind='text',opts=[],value='')=>({name,label,kind,opts,value});const defs={students:[field('name','Full name'),field('phone','Phone number','tel'),field('group','Group','select',groupOptions),field('fee','Monthly fee (UZS)','number',[],230000)],teachers:[field('name','Full name'),field('subject','Subject'),field('phone','Phone number','tel'),field('salary','Monthly salary (UZS)','number',[],0),field('status','Employment status','select',['Active','Inactive','On leave'],'Active')],groups:[field('name','Group name'),field('subject','Subject'),field('teacher','Teacher','select',db.teachers.map(t=>t.name)),field('schedule','Schedule'),field('students','Student count','number',[],0),field('fee','Monthly fee (UZS)','number',[],230000)],timetable:[field('group','Group','select',db.groups.map(g=>g.name)),field('teacher','Teacher','select',db.teachers.filter(t=>t.status==='Active').map(t=>t.name)),field('weekday','Day of week','select',['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']),field('starts_at','Start time','time',[],'09:00'),field('ends_at','End time','time',[],'10:00'),field('room','Room / classroom'),field('effective_from','Effective from','date',[],todayISO()),field('status','Status','select',['Scheduled','Cancelled'],'Scheduled')],payments:[field('student','Student','select',studentOptions),field('group','Group','select',groupOptions),field('amount','Amount (UZS)','number',[],230000),field('date','Payment date','date',[],todayISO()),field('method','Payment method','select',['Cash','Card','Bank transfer']),field('status','Status','select',['Paid','Pending'])],expenses:[field('title','Description'),field('category','Category','select',['Rent','Salary','Utilities','Supplies','Marketing','Other']),field('amount','Amount (UZS)','number'),field('date','Date','date',[],todayISO())],lessons:[field('title','Lesson topic'),field('group','Group','select',groupOptions),field('teacher','Teacher','select',db.teachers.map(t=>t.name)),field('date','Lesson date','date',[],todayISO()),field('description','Lesson notes')],homework:[field('title','Homework title'),field('student','Student','select',studentOptions),field('group','Group','select',groupOptions),field('teacher','Teacher','select',db.teachers.map(t=>t.name)),field('due_date','Due date','date',[],todayISO()),field('description','Instructions')],assessments:[field('title','Assessment title'),field('group','Group','select',groupOptions),field('teacher','Teacher','select',db.teachers.map(t=>t.name)),field('date','Assessment date','date',[],todayISO()),field('max_score','Maximum score','number',[],100)],results:[field('student','Student','select',studentOptions),field('assessment','Assessment'),field('score','Score','number'),field('max_score','Maximum score','number',[],100),field('date','Date','date',[],todayISO()),field('feedback','Teacher feedback')],attendance:[field('date','Date','date',[],todayISO())]};return defs[type]||[]}
let modalType='',editingRecordId=null;
function renderRecordFields(type,record={}){
 return fieldsFor(type).map(f=>{
  const value=record[f.name]??f.value??'';
  const fieldId='record-'+type+'-'+f.name;
  const label='<label for="'+fieldId+'">'+esc(f.label)+'</label>';
  const control=f.kind==='select'
   ?'<select id="'+fieldId+'" name="'+f.name+'" '+(!f.opts.length?'disabled':'')+'>'+[...new Set([...f.opts,...(value!==''?[String(value)]:[])])].map(o=>'<option value="'+esc(o)+'" '+(String(o)===String(value)?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>'
   :'<input id="'+fieldId+'" name="'+f.name+'" type="'+f.kind+'" '+(value!==''?'value="'+esc(value)+'"':'')+(f.name==='salary'?' min="0" step="1"':'')+' required>';
  return '<div class="field '+(f.name==='name'?'full':'')+'">'+label+control+'</div>';
 }).join('');
}
function openModal(type){
 modalType=type;editingRecordId=null;
 if(type==='attendance'){go('attendance');notify('Use the daily register to mark attendance.');return}
 if(type==='reports'){backup();return}
 document.querySelector('#modalTitle').textContent='Add '+type.slice(0,-1);
 document.querySelector('#formFields').innerHTML=renderRecordFields(type);ensureFormAccessibility(document.querySelector('#recordDialog'));
 document.querySelector('#recordDialog').showModal();
}
function editRecord(type,id){
 if(type!=='teachers'||(window.schoolCloud&&!window.schoolCloud.canManage)){notify('Only school owners and administrators can edit teachers.');return}
 const record=db[type].find(x=>String(x.id)===String(id));
 if(!record){notify('Teacher record could not be found.');return}
 modalType=type;editingRecordId=String(id);
 document.querySelector('#modalTitle').textContent='Edit teacher';
 document.querySelector('#formFields').innerHTML=renderRecordFields(type,record);
 document.querySelector('#recordDialog').showModal();
}
function closeModal(){editingRecordId=null;document.querySelector('#recordDialog').close()}
document.querySelector('#recordForm').addEventListener('submit',e=>{
 e.preventDefault();
 if(!modalType||!Object.prototype.hasOwnProperty.call(initial,modalType)||!Array.isArray(db[modalType])){notify('This action is not available here. Open the correct section first.');closeModal();return}
 const fd=new FormData(e.currentTarget);let row=Object.fromEntries(fd.entries());
 for(const k of ['fee','salary','students','amount','score','max_score'])if(row[k]!==undefined)row[k]=Number(row[k]);
 if(editingRecordId!==null){
  if(modalType!=='teachers'){notify('Editing is not enabled for this record type.');closeModal();return}
  const index=db[modalType].findIndex(x=>String(x.id)===editingRecordId);
  if(index<0){notify('Teacher record could not be found.');closeModal();return}
  row.id=db[modalType][index].id;db[modalType][index]={...db[modalType][index],...row};
  closeModal();persist();notify('Teacher details updated');
 }else{
  row.id=Math.max(0,...db[modalType].map(x=>Number(x.id)||0))+1;
  if(modalType==='students')row.status='Active';else if(modalType==='teachers'&&!row.status)row.status='Active';if(modalType==='timetable')row.weekday=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].indexOf(row.weekday)+1;
  db[modalType].push(row);closeModal();persist();notify('New '+modalType.slice(0,-1)+' saved');
 }
});
async function saveAttendance(){
 document.querySelectorAll('.attendance-choice').forEach(el=>{
  db.attendance=db.attendance.filter(a=>!(a.student===el.dataset.student&&a.date===todayISO()));
  const student=db.students.find(s=>s.name===el.dataset.student);
  db.attendance.push({student:el.dataset.student,studentId:student?String(student.id):null,date:todayISO(),status:el.value});
 });
 const result=await persist();
 if(result?.ok)notify(result.localOnly?'Attendance saved in this browser only.':'Attendance saved to the school cloud.');
 else notify('Attendance is saved locally, but cloud sync failed. Please retry before leaving this page.');
}
function csvExport(type){let arr=db[type]||[];if(!arr.length){notify('No records to export');return}let keys=Object.keys(arr[0]),csv=[keys.join(','),...arr.map(o=>keys.map(k=>'"'+String(o[k]??'').replace(/"/g,'""')+'"').join(','))].join('\n');download(csv,type+'-export.csv','text/csv')}
function backup(){download(JSON.stringify(db,null,2),'dreams-school-backup.json','application/json');notify('Backup downloaded')}
function download(content,name,mime){let a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:mime}));a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
document.querySelector('#quickAdd').addEventListener('click',()=>{const target=({dashboard:'students',students:'students',teachers:'teachers',groups:'groups',attendance:'attendance',payments:'payments',expenses:'expenses'})[page];if(target)openModal(target);else notify('Use the actions inside this section to continue.');});
document.querySelector('#closeModal').addEventListener('click',()=>document.querySelector('#recordDialog').close());
document.querySelector('#cancelModal').addEventListener('click',()=>document.querySelector('#recordDialog').close());

document.querySelector('#mobileMenu').addEventListener('click',()=>{const sidebar=document.querySelector('#sidebar'),menu=document.querySelector('#mobileMenu'),backdrop=document.querySelector('#mobileNavBackdrop'),isOpen=sidebar.classList.toggle('open');backdrop.hidden=!isOpen;menu.setAttribute('aria-expanded',String(isOpen));menu.setAttribute('aria-label',isOpen?'Close navigation menu':'Open navigation menu')});
document.querySelector('#mobileNavBackdrop').addEventListener('click',closeMobileNavigation);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNavigation()});
document.querySelector('#todayDate').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
document.querySelector('#year').textContent=new Date().getFullYear();
render();

// Cloud bridge: preserve the demo fallback while syncing authenticated school data.

function showParentPortal(children,records,profile,homework=[],results=[]){
 const nav=document.querySelector('.nav');nav.innerHTML='<div class="school-label">FAMILY PORTAL</div><div class="nav-item active" style="cursor:default"><span>◷</span>Attendance overview</div>';
 document.querySelector('.help-card').innerHTML='<div class="help-icon">✦</div><strong>Family portal</strong><p>View your child’s attendance from home.</p>';
 const today=todayISO();
 const todayRows=(children||[]).map(s=>(records||[]).find(a=>a.student_id===s.id&&a.attendance_date===today));
 const presentCount=todayRows.filter(a=>a?.status==='Present').length;
 const absentCount=todayRows.filter(a=>a?.status==='Absent').length;
 const pendingCount=todayRows.filter(a=>!a).length;
 const summary='<div class="stats-grid parent-stats">'+stat('Present today',presentCount,'✓','Attendance confirmed')+stat('Absent today',absentCount,'!','Check with the centre')+stat('Not marked',pendingCount,'◷','Awaiting register')+'</div>';
 const alert=absentCount?'<div class="parent-alert" role="status"><strong>Attendance alert</strong><span>'+absentCount+' linked student(s) marked absent today. Contact the learning centre if you need more information.</span></div>':'';
 const cards=(children||[]).map(s=>{const todays=(records||[]).find(a=>a.student_id===s.id&&a.attendance_date===today);const status=todays? todays.status:'Not marked yet';const history=(records||[]).filter(a=>a.student_id===s.id).slice(0,10);const cls=status==='Present'?'active':status==='Absent'?'pending':'';const hw=(homework||[]).filter(x=>x.student_id===s.id).slice(0,8);const marks=(results||[]).filter(x=>x.student_id===s.id).slice(0,8);return '<section class="panel parent-child"><div class="panel-header"><div><h3>'+esc(s.full_name)+'</h3><p>'+esc(s.group_name||'Group not assigned')+'</p></div><span class="status '+cls+'">'+esc(status)+'</span></div><p class="muted-note">Today · '+today+'</p><h4>Attendance history</h4>'+table(['DATE','ATTENDANCE'],history.map(a=>'<tr><td>'+dateFmt(a.attendance_date)+'</td><td><span class="status '+(a.status==='Present'?'active':a.status==='Absent'?'pending':'')+'">'+esc(a.status)+'</span></td></tr>').join('')||'<tr><td colspan="2">No attendance history yet.</td></tr>')+'<h4 class="parent-section-title">Homework</h4>'+table(['ASSIGNMENT','DUE DATE','INSTRUCTIONS'],hw.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+dateFmt(x.due_date)+'</td><td>'+esc(x.description||'—')+'</td></tr>').join('')||'<tr><td colspan="3">No homework assigned yet.</td></tr>')+'<h4 class="parent-section-title">Exam results</h4>'+table(['ASSESSMENT','SCORE','DATE','TEACHER FEEDBACK'],marks.map(x=>'<tr><td>'+esc(x.assessment)+'</td><td><strong>'+esc(x.score)+' / '+esc(x.max_score)+'</strong></td><td>'+dateFmt(x.assessment_date)+'</td><td>'+esc(x.feedback||'—')+'</td></tr>').join('')||'<tr><td colspan="4">No results published yet.</td></tr>')+'</section>'}).join('');
 document.querySelector('#pageTitle').textContent='Family attendance portal';document.querySelector('#pageSubtitle').textContent='Welcome, '+esc(profile.full_name)+'. Attendance updates from your learning centre appear here.';document.querySelector('#breadcrumbTitle').textContent='Family portal';document.querySelector('#quickAdd').hidden=true;document.querySelector('#pageContent').innerHTML=cards?summary+alert+cards:'<section class="panel"><h3>No student linked yet</h3><p class="muted-note">Please contact your learning centre to connect your parent account to a student.</p></section>';
}

window.schoolApp={showParentPortal,showTeacherPortal(){page='teacherhome';render();this.applyPermissions()}, setData(data){if(!data||typeof data!=='object')return;db=cleanDemoRecords({...structuredClone(initial),...data});localStorage.setItem(STORE,JSON.stringify(db));render();return JSON.parse(JSON.stringify(db))},applyPermissions(){const role=window.schoolCloud?.profile?.role,canManage=!window.schoolCloud||window.schoolCloud.canManage,canFinance=['owner','admin','accountant'].includes(role),isTeacher=role==='teacher';document.querySelectorAll('[data-modal]').forEach(el=>{const allowed=canManage||(canFinance&&['payments','expenses'].includes(el.dataset.modal))||(isTeacher&&['homework','results'].includes(el.dataset.modal));if(!allowed){el.disabled=true;el.hidden=true}});document.querySelectorAll('[data-delete]').forEach(el=>{const allowed=canManage||(canFinance&&['payments','expenses'].includes(el.dataset.delete));if(!allowed){el.disabled=true;el.hidden=true}});document.querySelectorAll('[data-edit]').forEach(el=>{if(!canManage){el.disabled=true;el.hidden=true}});const quick=document.querySelector('#quickAdd');if(quick&&!canManage){quick.disabled=true;quick.hidden=true}const attendanceSave=document.querySelector('#saveAttendance');if(attendanceSave&&!canManage&&!isTeacher){attendanceSave.disabled=true;attendanceSave.hidden=true}document.querySelectorAll('.attendance-choice').forEach(el=>{el.disabled=!(canManage||isTeacher)});if(isTeacher){const allowedPages=['teacherhome','students','groups','timetable','attendance','classroom','results'];document.querySelectorAll('.nav-item[data-page]').forEach(el=>{el.hidden=!allowedPages.includes(el.dataset.page)});if(!allowedPages.includes(page))page='teacherhome';}}};
window.schoolApp={showParentPortal,showTeacherPortal(){page='teacherhome';render();this.applyPermissions()}, setData(data){if(!data||typeof data!=='object')return;db=cleanDemoRecords({...structuredClone(initial),...data});localStorage.setItem(STORE,JSON.stringify(db));render();return JSON.parse(JSON.stringify(db))},mergeSharedData(shared){
 if(!shared)return;
 if(Array.isArray(shared.students))db.students=shared.students;
 if(Array.isArray(shared.groups))db.groups=shared.groups;
 if(Array.isArray(shared.teachers))db.teachers=shared.teachers;
 if(Array.isArray(shared.attendance))db.attendance=shared.attendance;
 if(Array.isArray(shared.timetable))db.timetable=shared.timetable;
 if(Array.isArray(shared.homework))db.homework=shared.homework;
 if(Array.isArray(shared.results))db.results=shared.results;
 localStorage.setItem(STORE,JSON.stringify(db));render();
},mergeFinanceData(records){if(!records)return;if(Array.isArray(records.payments))db.payments=records.payments;if(Array.isArray(records.expenses))db.expenses=records.expenses;localStorage.setItem(STORE,JSON.stringify(db));render()},applyPermissions(){const role=window.schoolCloud?.profile?.role,canManage=!window.schoolCloud||window.schoolCloud.canManage,canFinance=['owner','admin','accountant'].includes(role),canMarkAttendance=!window.schoolCloud||['owner','admin','teacher'].includes(role);document.querySelectorAll('[data-modal]').forEach(el=>{const allowed=canManage||(canFinance&&['payments','expenses'].includes(el.dataset.modal));if(!allowed){el.disabled=true;el.hidden=true}});document.querySelectorAll('[data-delete]').forEach(el=>{const allowed=canManage||(canFinance&&['payments','expenses'].includes(el.dataset.delete));if(!allowed){el.disabled=true;el.hidden=true}});const quick=document.querySelector('#quickAdd');if(quick&&!canManage){quick.disabled=true;quick.hidden=true}const attendanceSave=document.querySelector('#saveAttendance');if(attendanceSave&&!canMarkAttendance){attendanceSave.disabled=true;attendanceSave.hidden=true}document.querySelectorAll('.attendance-choice').forEach(el=>{el.disabled=!canMarkAttendance})}};
