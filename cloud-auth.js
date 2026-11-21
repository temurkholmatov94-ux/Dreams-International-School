/* Secure school workspace and parent attendance portal. */
(function(){
 const cfg=window.SUPABASE_CONFIG||{};
 const configured=!!(cfg.url&&cfg.anonKey&&!cfg.url.includes('YOUR-PROJECT')&&!cfg.anonKey.includes('YOUR_SUPABASE'));
 const style=document.createElement('style');
 style.textContent='.auth-screen{position:fixed;inset:0;background:#f5f7fc;z-index:100;display:grid;place-items:center;padding:20px}.auth-card{width:min(420px,100%);background:white;border:1px solid #e8ecf4;border-radius:18px;padding:30px;box-shadow:0 20px 70px #18294b18}.auth-card h1{font:800 24px Manrope;margin:0 0 8px;color:#17213a}.auth-card p{color:#7c879c;font:13px/1.6 "DM Sans";margin:0 0 20px}.auth-card label{display:block;font:600 11px "DM Sans";color:#59647a;margin:13px 0 6px}.auth-card input{width:100%;padding:12px;border:1px solid #e3e8f0;border-radius:8px;font:13px "DM Sans"}.auth-card button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:8px;background:#4265e8;color:white;font-weight:700;cursor:pointer}.auth-message{font:12px/1.5 "DM Sans";color:#b45309;margin-top:12px}.auth-help{font:11px/1.6 "DM Sans";color:#8993a6;margin-top:15px}.mode-note,.readonly-note{margin:0 0 14px;padding:10px 13px;border:1px solid #dce5fb;border-radius:8px;background:#f5f7ff;color:#5266a8;font-size:11px}';
 document.head.appendChild(style);
 function showGate(message){
  let el=document.getElementById('authScreen');
  if(!el){el=document.createElement('div');el.id='authScreen';el.className='auth-screen';document.body.appendChild(el)}
  el.innerHTML='<div class="auth-card"><div class="brand-mark" style="margin-bottom:18px">D<span>.</span></div><h1>Dreams International School</h1><p>'+message+'</p><form id="authForm"><label>Email address</label><input name="email" type="email" required autocomplete="username" placeholder="you@example.com"><label>Password</label><input name="password" type="password" required autocomplete="current-password" placeholder="Your password"><button type="submit">Sign in securely</button></form><div class="auth-message" id="authMessage"></div><div class="auth-help">Parents use the invitation sent by their learning centre. Staff accounts are created by the school owner.</div></div>';
  document.getElementById('authForm').addEventListener('submit',async e=>{
   e.preventDefault();const f=new FormData(e.currentTarget),msg=document.getElementById('authMessage');msg.textContent='Signing in…';
   try{const result=await window.schoolSupabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(result.error)throw result.error;await start()}catch(err){msg.textContent=err.message||'Sign-in failed'}
  });
 }
 function profileUi(profile){
  const el=document.querySelector('.profile');if(!el)return;
  const label=profile.role==='parent'?'Parent':profile.role;
  el.innerHTML='<div class="avatar">'+(profile.full_name||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()+'</div><div><strong>'+profile.full_name+'</strong><small>'+label+'</small></div><button id="signOutBtn">Sign out</button>';
  document.getElementById('signOutBtn').onclick=async()=>{await window.schoolSupabase.auth.signOut();location.reload()};
 }
 async function loadParent(profile){
  const sb=window.schoolSupabase;
  const links=await sb.from('parent_student_links').select('student_id').eq('parent_user_id',(await sb.auth.getUser()).data.user.id);
  if(links.error)throw links.error;
  const ids=(links.data||[]).map(x=>x.student_id);
  if(!ids.length){window.schoolApp.showParentPortal([],[],profile);return}
  const [students,attendance,homework,results]=await Promise.all([
   sb.from('students').select('id,full_name,group_name').in('id',ids).order('full_name'),
   sb.from('attendance_records').select('id,student_id,attendance_date,status,note').in('student_id',ids).order('attendance_date',{ascending:false}).limit(100),
   sb.from('student_homework').select('id,student_id,title,description,due_date,assigned_by').in('student_id',ids).order('due_date',{ascending:true}).limit(100),
   sb.from('student_results').select('id,student_id,assessment,score,max_score,assessment_date,feedback').in('student_id',ids).order('assessment_date',{ascending:false}).limit(100)
  ]);
  if(students.error)throw students.error;if(attendance.error)throw attendance.error;if(homework.error)throw homework.error;if(results.error)throw results.error;
  window.schoolApp.showParentPortal(students.data||[],attendance.data||[],profile,homework.data||[],results.data||[]);
  if(window.schoolCloud.realtimeChannel)await sb.removeChannel(window.schoolCloud.realtimeChannel);
  const channel=sb.channel('parent-attendance-'+profile.school_id).on('postgres_changes',{event:'*',schema:'public',table:'attendance_records',filter:'school_id=eq.'+profile.school_id},async()=>{try{await loadParent(profile)}catch(e){console.error('Attendance refresh failed',e)}}).subscribe();
  window.schoolCloud.realtimeChannel=channel;
 }
 async function refreshFinanceSafely(){
  try{const records=await window.schoolCloud?.getFinanceTransactions?.();if(records)window.schoolApp?.mergeFinanceData(records)}
  catch(e){console.error('Finance live refresh failed:',e)}
 }
 async function refreshSharedRecordsSafely(){
  try{const shared=await window.schoolCloud?.refreshSharedRecords?.();if(shared)window.schoolApp?.mergeSharedData(shared)}
  catch(e){console.error('Live school data refresh failed:',e)}
 }
 async function start(){
  const sessionResult=await window.schoolSupabase.auth.getSession(),session=sessionResult.data.session;
  if(!session){showGate('Sign in to access your school or family portal.');return}
  const p=await window.schoolSupabase.from('school_profiles').select('school_id,full_name,role').eq('user_id',session.user.id).single();
  if(p.error||!p.data){await window.schoolSupabase.auth.signOut();showGate('Your account has no school profile. Ask the school owner to set up your access.');return}
  const profile=p.data,sb=window.schoolSupabase;
  const schoolResult=await sb.from('schools').select('id,name,slug,logo_url,contact_email,contact_phone,address,website,primary_color,plan,subscription_status').eq('id',profile.school_id).single();
  if(schoolResult.error)throw schoolResult.error;
  const schoolSettings=schoolResult.data;
  const d=profile.role==='parent'?{data:null,error:null}:await sb.from('school_data').select('payload').eq('school_id',profile.school_id).maybeSingle();
  if(d.error){showGate('Could not load school data: '+d.error.message);return}
  window.schoolCloud={
   schoolId:profile.school_id,profile,canManage:['owner','admin'].includes(profile.role),
   schoolSettings,
   updateSchoolSettings:async values=>{
    if(!['owner','admin'].includes(profile.role))throw new Error('Only centre owners and administrators can change settings.');
    const allowed={name:String(values.name||'').trim(),slug:String(values.slug||'').trim().toLowerCase(),logo_url:values.logo_url||null,contact_email:values.contact_email||null,contact_phone:values.contact_phone||null,address:values.address||null,website:values.website||null,primary_color:/^#[0-9a-fA-F]{6}$/.test(values.primary_color||'')?values.primary_color:'#4265e8',updated_at:new Date().toISOString()};
    if(!allowed.name||!allowed.slug||!/^[a-z0-9-]{3,80}$/.test(allowed.slug))throw new Error('Enter a centre name and a valid 3–80 character URL slug.');
    const saved=await sb.from('schools').update(allowed).eq('id',profile.school_id).select('id,name,slug,logo_url,contact_email,contact_phone,address,website,primary_color,plan,subscription_status').single();
    if(saved.error)throw saved.error;
    window.schoolCloud.schoolSettings=saved.data;
    return saved.data;
   },
   inviteParent:async payload=>{const student=await sb.from('students').select('id').eq('school_id',profile.school_id).eq('external_id',String(payload.student_id)).single();if(student.error)throw new Error('Could not find the selected student in the cloud. Save the student record first.');const {data,error}=await sb.functions.invoke('invite-parent',{body:{...payload,student_id:student.data.id}});if(error)throw error;if(data?.error)throw new Error(data.error);return data},
   deleteSchoolRecord:async(type,id)=>{
    const recordId=String(id);
    if(type==='payments'||type==='expenses'){
     if(!['owner','admin','accountant'].includes(profile.role))throw new Error('Only finance staff can remove transactions.');
     const prefix=type==='payments'?'payment:':'expense:';
     const removed=await sb.from('finance_transactions').delete().eq('school_id',profile.school_id).eq('external_id',prefix+recordId);
     if(removed.error)throw removed.error;
     return;
    }
    const tableTargets={students:['students','external_id'],groups:['school_groups','external_id'],results:['student_results','external_id']};
    if(tableTargets[type]){
     if(!['owner','admin','teacher'].includes(profile.role))throw new Error('Your account cannot remove this school record.');
     const [table,key]=tableTargets[type];
     const removed=await sb.from(table).delete().eq('school_id',profile.school_id).eq(key,recordId);
     if(removed.error)throw removed.error;
     return;
    }
    const workspaceTargets={teachers:'teachers',lessons:'lessons',homework:'homework',assessments:'assessments'};
    if(workspaceTargets[type]){
     if(!['owner','admin'].includes(profile.role))throw new Error('Only school administrators can remove this record.');
     const current=await sb.from('school_data').select('payload').eq('school_id',profile.school_id).single();
     if(current.error)throw current.error;
     const payload=current.data.payload||{};
     payload[type]=(payload[type]||[]).filter(row=>String(row.id)!==recordId);
     const saved=await sb.from('school_data').update({payload,updated_by:session.user.id,updated_at:new Date().toISOString()}).eq('school_id',profile.school_id);
     if(saved.error)throw saved.error;
     return;
    }
    throw new Error('This record type is not supported for cloud deletion.');
   },
   deleteFinanceTransaction:async(type,id)=>{
    if(!['owner','admin','accountant'].includes(profile.role))throw new Error('Only finance staff can remove transactions.');
    const prefix=type==='payments'?'payment:':type==='expenses'?'expense:':null;
    if(!prefix)throw new Error('Unsupported finance record type.');
    const removed=await sb.from('finance_transactions').delete().eq('school_id',profile.school_id).eq('external_id',prefix+String(id));
    if(removed.error)throw removed.error;
   },
   getFinanceTransactions:async()=>{
    if(!['owner','admin','accountant'].includes(profile.role))throw new Error('Finance access is restricted to authorised finance staff.');
    const result=await sb.from('finance_transactions').select('external_id,transaction_type,student_name,group_name,title,category,amount,transaction_date,payment_method,status,billing_period').eq('school_id',profile.school_id).order('transaction_date',{ascending:false}).limit(5000);
    if(result.error)throw result.error;
    const rows=result.data||[];
    return {
     payments:rows.filter(x=>x.transaction_type==='tuition').map(x=>({id:Number(x.external_id.replace(/^payment:/,''))||x.external_id,student:x.student_name||'',group:x.group_name||'',amount:Number(x.amount)||0,date:x.transaction_date,method:x.payment_method||'Pending',status:x.status,billing_period:x.billing_period||undefined})),
     expenses:rows.filter(x=>x.transaction_type==='expense').map(x=>({id:Number(x.external_id.replace(/^expense:/,''))||x.external_id,title:x.title||'Expense',category:x.category||'Other',amount:Number(x.amount)||0,date:x.transaction_date}))
    };
   },
   getAnalytics:async()=>{
    if(!['owner','admin','teacher','accountant'].includes(profile.role))throw new Error('Your account cannot view centre analytics.');
    const since=new Date();since.setDate(since.getDate()-30);
    const [students,attendance,results,attempts]=await Promise.all([
     sb.from('students').select('id,full_name,group_name,status').eq('school_id',profile.school_id).limit(2000),
     sb.from('attendance_records').select('student_id,attendance_date,status').eq('school_id',profile.school_id).gte('attendance_date',since.toISOString().slice(0,10)).order('attendance_date',{ascending:false}).limit(5000),
     sb.from('student_results').select('assessment,score,max_score,assessment_date').eq('school_id',profile.school_id).order('assessment_date',{ascending:false}).limit(2000),
     sb.from('exam_attempts').select('title,cefr_level,topic,question_count,score,completed_at').eq('school_id',profile.school_id).order('completed_at',{ascending:false}).limit(500)
    ]);
    for(const item of [students,attendance,results,attempts])if(item.error)throw item.error;
    return {students:students.data||[],attendance:attendance.data||[],results:results.data||[],attempts:attempts.data||[]};
   },
   saveExamAttempt:async payload=>{
    if(!['owner','admin','teacher'].includes(profile.role))throw new Error('Your account cannot save exam attempts.');
    const row={school_id:profile.school_id,user_id:session.user.id,title:String(payload.title||'Timed assessment').slice(0,180),cefr_level:payload.cefr_level,topic:String(payload.topic||'All').slice(0,100),question_count:Number(payload.question_count),score:Number(payload.score),answered_count:Number(payload.answered_count),duration_seconds:Number(payload.duration_seconds),answers:Array.isArray(payload.answers)?payload.answers:[]};
    const saved=await sb.from('exam_attempts').insert(row).select('id,completed_at').single();
    if(saved.error)throw saved.error;
    return saved.data;
   },
   listExamAttempts:async()=>{
    if(!['owner','admin','teacher'].includes(profile.role))return [];
    const result=await sb.from('exam_attempts').select('id,title,cefr_level,topic,question_count,score,answered_count,duration_seconds,completed_at').eq('school_id',profile.school_id).order('completed_at',{ascending:false}).limit(30);
    if(result.error)throw result.error;
    return result.data||[];
   },
   save:async payload=>{
    if(!['owner','admin','teacher','accountant'].includes(profile.role))return;
    if(['owner','admin'].includes(profile.role)){
     const cloud=await sb.from('school_data').upsert({school_id:profile.school_id,payload,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'school_id'});
     if(cloud.error)throw cloud.error;
    }
    if(['owner','admin','accountant'].includes(profile.role)){
     const financeRows=[
      ...(payload.payments||[]).filter(x=>!(Number(x.id)<=3&&['Amina Karimova','Sardor Aliyev','Madina Rustamova'].includes(x.student))).map(x=>({school_id:profile.school_id,external_id:'payment:'+String(x.id),transaction_type:'tuition',student_name:x.student||null,group_name:x.group||null,title:'Tuition payment',amount:Number(x.amount)||0,transaction_date:x.date||new Date().toISOString().slice(0,10),payment_method:x.method||null,status:x.status||'Pending',billing_period:x.billing_period||null,created_by:session.user.id})),
      ...(payload.expenses||[]).filter(x=>!(Number(x.id)<=3&&['Center rent','Internet and utilities','Administrator salary'].includes(x.title))).map(x=>({school_id:profile.school_id,external_id:'expense:'+String(x.id),transaction_type:'expense',title:x.title||'Expense',category:x.category||'Other',amount:Number(x.amount)||0,transaction_date:x.date||new Date().toISOString().slice(0,10),status:'Paid',created_by:session.user.id}))
     ];
     if(financeRows.length){const saved=await sb.from('finance_transactions').upsert(financeRows,{onConflict:'school_id,external_id'});if(saved.error)throw saved.error}
    }
    if(profile.role==='accountant')return;
    const localGroups=(payload.groups||[]).map(g=>({school_id:profile.school_id,external_id:String(g.id),name:String(g.name||'').trim(),subject:g.subject||null,teacher_name:g.teacher||null,schedule:g.schedule||null,monthly_fee:Number(g.fee)||0})).filter(g=>g.name);
    if(localGroups.length){
     const up=await sb.from('school_groups').upsert(localGroups,{onConflict:'school_id,external_id'});
     if(up.error)throw up.error;
    }
    const localStudents=(payload.students||[]).map(s=>({school_id:profile.school_id,external_id:String(s.id),full_name:String(s.name||'').trim(),phone:s.phone||null,group_name:s.group||null,monthly_fee:Number(s.fee)||0,status:s.status||'Active'})).filter(s=>s.full_name);
    if(localStudents.length){
     const up=await sb.from('students').upsert(localStudents,{onConflict:'school_id,external_id'});
     if(up.error)throw up.error;
    }
    const stored=await sb.from('students').select('id,external_id,full_name').eq('school_id',profile.school_id);
    if(stored.error)throw stored.error;
    const idByExternal=new Map((stored.data||[]).map(s=>[String(s.external_id),s.id]));
    const idByName=new Map((stored.data||[]).map(s=>[s.full_name,s.id]));
    const rows=(payload.attendance||[]).map(a=>{
     const external=String(a.studentId??(payload.students||[]).find(s=>s.name===a.student)?.id??'');
     const studentId=idByExternal.get(external)||idByName.get(a.student);
     if(!studentId||!a.date||!['Present','Absent','Late','Excused'].includes(a.status))return null;
     return {school_id:profile.school_id,student_id:studentId,attendance_date:a.date,status:a.status,marked_by:session.user.id};
    }).filter(Boolean);
    if(rows.length){
     const saved=await sb.from('attendance_records').upsert(rows,{onConflict:'student_id,attendance_date'});
     if(saved.error)throw saved.error;
    }
    const homeworkRows=(payload.homework||[]).map(x=>{
     const student=idByName.get(x.student)||idByExternal.get(String(x.studentId||''));
     return student?{school_id:profile.school_id,student_id:student,external_id:String(x.id),title:x.title,description:x.description||null,assigned_by:x.teacher||null,due_date:x.due_date||null}:null;
    }).filter(Boolean);
    if(homeworkRows.length){const saved=await sb.from('student_homework').upsert(homeworkRows,{onConflict:'school_id,external_id,student_id'});if(saved.error)throw saved.error}
    const resultRows=(payload.results||[]).map(x=>{
     const student=idByName.get(x.student)||idByExternal.get(String(x.studentId||''));
     return student?{school_id:profile.school_id,student_id:student,external_id:String(x.id),assessment:x.assessment,score:Number(x.score)||0,max_score:Number(x.max_score)||100,assessment_date:x.date||null,feedback:x.feedback||null}:null;
    }).filter(Boolean);
    if(resultRows.length){const saved=await sb.from('student_results').upsert(resultRows,{onConflict:'school_id,external_id,student_id'});if(saved.error)throw saved.error}
   },
   refreshSharedRecords:async()=>{
    if(!['owner','admin','teacher','accountant'].includes(profile.role))return;
    const [students,groups,attendance]=await Promise.all([
     sb.from('students').select('external_id,full_name,phone,group_name,monthly_fee,status').eq('school_id',profile.school_id).order('full_name'),
     sb.from('school_groups').select('external_id,name,subject,teacher_name,schedule,monthly_fee').eq('school_id',profile.school_id).order('name'),
     sb.from('attendance_records').select('student_id,attendance_date,status,note,students!attendance_records_student_school_fk!inner(external_id,full_name)').eq('school_id',profile.school_id).order('attendance_date',{ascending:false}).limit(5000)
    ]);
    for(const r of [students,groups,attendance])if(r.error)throw r.error;
    return {
     students:(students.data||[]).map(s=>({id:s.external_id,name:s.full_name,phone:s.phone||'',group:s.group_name||'',fee:Number(s.monthly_fee)||0,status:s.status||'Active'})),
     groups:(groups.data||[]).map(g=>({id:g.external_id,name:g.name,subject:g.subject||'',teacher:g.teacher_name||'',schedule:g.schedule||'',fee:Number(g.monthly_fee)||0})),
     attendance:(attendance.data||[]).map(r=>({student:r.students?.full_name||'',studentId:r.students?.external_id||null,date:r.attendance_date,status:r.status}))
    };
   },
  };
  if(profile.role!=='parent'&&d.data?.payload){
   const payload=d.data.payload;
   const rows=(payload.students||[]).map(s=>({school_id:profile.school_id,external_id:String(s.id),full_name:s.name,phone:s.phone||null,group_name:s.group||null,monthly_fee:Number(s.fee)||0,status:s.status||'Active'}));
   if(rows.length){const synced=await sb.from('students').upsert(rows,{onConflict:'school_id,external_id'});if(synced.error)console.error('Initial student sync failed:',synced.error)}
   await window.schoolCloud.save(payload);
  }
  const screen=document.getElementById('authScreen');if(screen)screen.remove();profileUi(profile);
  if(profile.role==='parent'){await loadParent(profile);return}
  if(d.data?.payload&&Object.keys(d.data.payload).length&&window.schoolApp)window.schoolApp.setData(d.data.payload);
  if(profile.role!=='parent'&&window.schoolCloud.refreshSharedRecords){
   try{const shared=await window.schoolCloud.refreshSharedRecords();window.schoolApp?.mergeSharedData(shared)}catch(e){console.error('Shared records refresh failed:',e?.message||e,e)}
   if(['owner','admin','accountant'].includes(profile.role)){try{const finance=await window.schoolCloud.getFinanceTransactions();window.schoolApp?.mergeFinanceData(finance)}catch(e){console.error('Finance records refresh failed:',e)}}
   if(window.schoolCloud.realtimeChannel)await sb.removeChannel(window.schoolCloud.realtimeChannel);
   window.schoolCloud.realtimeChannel=sb.channel('school-live-'+profile.school_id)
    .on('postgres_changes',{event:'*',schema:'public',table:'students',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'school_groups',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'attendance_records',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'finance_transactions',filter:'school_id=eq.'+profile.school_id},refreshFinanceSafely)
    .subscribe();
  }
  if(profile.role==='owner'||profile.role==='admin'){
   const nav=document.querySelector('.nav');if(nav&&!nav.querySelector('[data-page="parents"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='parents';b.innerHTML='<span>♧</span>Parent access';const attendance=nav.querySelector('[data-page="attendance"]');attendance?.after(b)}
  }else{document.querySelector('[data-page="parents"]')?.remove()}
  if(!window.schoolCloud.canManage&&profile.role!=='accountant'){const note=document.createElement('div');note.className='readonly-note';note.textContent='Read-only access: your account can view school records.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null)}else if(profile.role==='accountant'){const note=document.createElement('div');note.className='readonly-note';note.textContent='Finance access: you can manage payments and expenses. Other school records are read-only.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null)}
  if(window.schoolApp)window.schoolApp.applyPermissions();
 }
 window.addEventListener('DOMContentLoaded',async()=>{
  if(!configured){const note=document.createElement('div');note.className='mode-note';note.textContent='Preview mode: changes are saved only in this browser. Connect Supabase to enable secure accounts and shared records.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null);return}
  try{if(!window.supabase?.createClient)throw new Error('Supabase client library did not load');window.schoolSupabase=window.supabase.createClient(cfg.url,cfg.anonKey);await start();window.schoolSupabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')showGate('You have signed out. Sign in to continue.')})}
  catch(e){console.error(e);showGate('Could not open your workspace: '+e.message)}
 });
})();