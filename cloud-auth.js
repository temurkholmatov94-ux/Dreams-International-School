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
  el.innerHTML='<div class="auth-card"><div class="brand-mark" style="margin-bottom:18px">D<span>.</span></div><h1>Dreams International School</h1><p>'+message+'</p><form id="authForm"><label for="authEmail">Email address</label><input id="authEmail" name="email" type="email" required autocomplete="username" placeholder="you@example.com"><label for="authPassword">Password</label><input id="authPassword" name="password" type="password" required autocomplete="current-password" placeholder="Your password"><button type="submit">Sign in securely</button></form><div class="auth-message" id="authMessage"></div><div class="auth-help">Parents use the invitation sent by their learning centre. Staff accounts are created by the school owner.</div></div>';
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
 function isMissingOptionalRelation(error){return ['42P01','PGRST205'].includes(error?.code)}
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
  if(students.error)throw students.error;if(attendance.error)throw attendance.error;
  if(homework.error&&!isMissingOptionalRelation(homework.error))throw homework.error;
  if(results.error&&!isMissingOptionalRelation(results.error))throw results.error;
  if(homework.error||results.error)console.warn('Optional parent portal tables are not fully configured; attendance remains available.');
  window.schoolApp.showParentPortal(students.data||[],attendance.data||[],profile,homework.error?[]:(homework.data||[]),results.error?[]:(results.data||[]));
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
  const p=await window.schoolSupabase.from('school_profiles').select('school_id,full_name,role,teacher_id').eq('user_id',session.user.id).single();
  if(p.error||!p.data){await window.schoolSupabase.auth.signOut();showGate('Your account has no school profile. Ask the school owner to set up your access.');return}
  const profile=p.data,sb=window.schoolSupabase;
  const schoolResult=await sb.from('schools').select('id,name,slug,logo_url,contact_email,contact_phone,address,website,primary_color,plan,subscription_status').eq('id',profile.school_id).single();
  if(schoolResult.error)throw schoolResult.error;
  const schoolSettings=schoolResult.data;
  const d=['owner','admin'].includes(profile.role)?await sb.from('school_data').select('payload').eq('school_id',profile.school_id).maybeSingle():{data:null,error:null};
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
   inviteParent:async payload=>{
    const student=await sb.from('students').select('id').eq('school_id',profile.school_id).eq('external_id',String(payload.student_id)).single();
    if(student.error)throw new Error('Tanlangan o‘quvchi bulutli bazada topilmadi. Avval o‘quvchini saqlang.');
    const {data,error}=await sb.functions.invoke('invite-parent',{body:{...payload,student_id:student.data.id}});
    if(error){
     let detail='';
     try{const body=await error.context?.clone?.().json();detail=body?.error||body?.message||''}catch{}
     throw new Error(detail||error.message||'Taklif yuborishda xatolik yuz berdi.');
    }
    if(data?.error)throw new Error(data.error);
    return data;
   },
   deleteSchoolRecord:async(type,id)=>{
    const recordId=String(id);
    if(type==='payments'||type==='expenses'){
     if(!['owner','admin','accountant'].includes(profile.role))throw new Error('Only finance staff can remove transactions.');
     const prefix=type==='payments'?'payment:':'expense:';
     const removed=await sb.from('finance_transactions').update({status:'Cancelled'}).eq('school_id',profile.school_id).eq('external_id',prefix+recordId);
     if(removed.error)throw removed.error;
     return;
    }
    const tableTargets={students:['students','external_id'],groups:['school_groups','external_id'],teachers:['teachers','external_id'],results:['student_results','external_id'],timetable:['class_timetable','external_id']};
    if(tableTargets[type]){
     if(!['owner','admin'].includes(profile.role))throw new Error('Only school administrators can remove this record.');
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
    const removed=await sb.from('finance_transactions').update({status:'Cancelled'}).eq('school_id',profile.school_id).eq('external_id',prefix+String(id));
    if(removed.error)throw removed.error;
   },
   getFinanceTransactions:async()=>{
    if(!['owner','admin','accountant'].includes(profile.role))throw new Error('Finance access is restricted to authorised finance staff.');
    const result=await sb.from('finance_transactions').select('external_id,transaction_type,student_name,group_name,title,category,amount,transaction_date,payment_method,status,billing_period').eq('school_id',profile.school_id).order('transaction_date',{ascending:false}).limit(5000);
    if(result.error)throw result.error;
    const rows=(result.data||[]).filter(x=>x.status!=='Cancelled');
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
      ...(payload.payments||[]).map(x=>({school_id:profile.school_id,external_id:'payment:'+String(x.id),transaction_type:'tuition',student_name:x.student||null,group_name:x.group||null,title:'Tuition payment',amount:Number(x.amount)||0,transaction_date:x.date||new Date().toISOString().slice(0,10),payment_method:x.method||null,status:x.status||'Pending',billing_period:x.billing_period||null,created_by:session.user.id})),
      ...(payload.expenses||[]).map(x=>({school_id:profile.school_id,external_id:'expense:'+String(x.id),transaction_type:'expense',title:x.title||'Expense',category:x.category||'Other',amount:Number(x.amount)||0,transaction_date:x.date||new Date().toISOString().slice(0,10),status:'Paid',created_by:session.user.id}))
     ];
     if(financeRows.length){const saved=await sb.from('finance_transactions').upsert(financeRows,{onConflict:'school_id,external_id'});if(saved.error)throw saved.error}
    }
    if(profile.role==='accountant')return;
    if(['owner','admin'].includes(profile.role)){
    const localTeachers=(payload.teachers||[]).map(t=>({school_id:profile.school_id,external_id:String(t.id),full_name:String(t.name||'').trim(),subject:t.subject||null,phone:t.phone||null,monthly_salary:Number(t.salary)||0,status:t.status||'Active'})).filter(t=>t.full_name);
    const previousTeachers=await sb.from('teachers').select('id,external_id,full_name').eq('school_id',profile.school_id);
    if(previousTeachers.error)throw previousTeachers.error;
    const oldNameByExternal=new Map((previousTeachers.data||[]).map(t=>[String(t.external_id),t.full_name]));
    const renamedTeacherNames=new Map();
    for(const teacher of localTeachers){
     const oldName=oldNameByExternal.get(String(teacher.external_id));
     if(oldName&&oldName!==teacher.full_name)renamedTeacherNames.set(oldName,teacher.full_name);
    }
    if(localTeachers.length){
     const up=await sb.from('teachers').upsert(localTeachers,{onConflict:'school_id,external_id'});
     if(up.error)throw up.error;
    }
    const teacherRows=await sb.from('teachers').select('id,external_id,full_name').eq('school_id',profile.school_id);
    if(teacherRows.error)throw teacherRows.error;
    const teacherIdByName=new Map((teacherRows.data||[]).map(t=>[t.full_name,t.id]));
    const localGroups=(payload.groups||[]).map(g=>{
     const teacherName=renamedTeacherNames.get(g.teacher)||g.teacher||null;
     return {school_id:profile.school_id,external_id:String(g.id),name:String(g.name||'').trim(),subject:g.subject||null,teacher_name:teacherName,teacher_id:teacherIdByName.get(teacherName)||null,schedule:g.schedule||null,monthly_fee:Number(g.fee)||0};
    }).filter(g=>g.name);
    if(localGroups.length){
     const up=await sb.from('school_groups').upsert(localGroups,{onConflict:'school_id,external_id'});
     if(up.error)throw up.error;
    }
    const savedGroups=await sb.from('school_groups').select('id,external_id,name').eq('school_id',profile.school_id);
    if(savedGroups.error)throw savedGroups.error;
    const groupIdByName=new Map((savedGroups.data||[]).map(g=>[g.name,g.id]));
    const timetableRows=(payload.timetable||[]).map(x=>{
     const groupId=groupIdByName.get(x.group);
     const teacherId=teacherIdByName.get(x.teacher);
     const weekday=Number(x.weekday);
     if(!groupId||!teacherId||weekday<1||weekday>7||!x.starts_at||!x.ends_at)return null;
     return {school_id:profile.school_id,external_id:String(x.id),group_id:groupId,teacher_id:teacherId,weekday,starts_at:x.starts_at,ends_at:x.ends_at,room:x.room||null,effective_from:x.effective_from||new Date().toISOString().slice(0,10),effective_until:x.effective_until||null,status:x.status||'Scheduled'};
    }).filter(Boolean);
    if(timetableRows.length){
     // Ignore stale/duplicate legacy slots during routine workspace sync.
     // A conflicting timetable row must never prevent attendance, student,
     // homework or finance changes from being saved.
     const current=await sb.from('class_timetable').select('external_id,weekday,starts_at,ends_at,room,effective_from,effective_until,status,teacher_id,group_id').eq('school_id',profile.school_id);
     if(current.error)throw current.error;
     const accepted=[];
     const overlaps=(a,b)=>{
      if(a.status!=='Scheduled'||b.status!=='Scheduled'||Number(a.weekday)!==Number(b.weekday))return false;
      const aEnd=a.effective_until||'9999-12-31',bEnd=b.effective_until||'9999-12-31';
      if(a.effective_from>bEnd||b.effective_from>aEnd)return false;
      if(!(String(a.starts_at)<String(b.ends_at)&&String(b.starts_at)<String(a.ends_at)))return false;
      const sameRoom=a.room&&b.room&&String(a.room).trim()&&String(b.room).trim()&&String(a.room).trim().toLowerCase()===String(b.room).trim().toLowerCase();
      return a.teacher_id===b.teacher_id||a.group_id===b.group_id||sameRoom;
     };
     const existing=current.data||[];
     for(const row of timetableRows){
      if(existing.some(r=>String(r.external_id)!==String(row.external_id)&&overlaps(row,r))||accepted.some(r=>overlaps(row,r))){
       console.warn('Skipped conflicting legacy timetable entry:',row.external_id);
       continue;
      }
      accepted.push(row);
     }
     if(accepted.length){
      const saved=await sb.from('class_timetable').upsert(accepted,{onConflict:'school_id,external_id'});
      if(saved.error)throw saved.error;
     }
    }
    const localStudents=(payload.students||[]).map(s=>({school_id:profile.school_id,external_id:String(s.id),full_name:String(s.name||'').trim(),phone:s.phone||null,group_name:s.group||null,monthly_fee:Number(s.fee)||0,status:s.status||'Active'})).filter(s=>s.full_name);
    if(localStudents.length){
     const up=await sb.from('students').upsert(localStudents,{onConflict:'school_id,external_id'});
     if(up.error)throw up.error;
    }
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
    const [students,groups,attendance,timetableRows,homeworkRows,resultRows]=await Promise.all([
     sb.from('students').select('external_id,full_name,phone,group_name,monthly_fee,status').eq('school_id',profile.school_id).order('full_name'),
     sb.from('school_groups').select('external_id,name,subject,teacher_name,schedule,monthly_fee').eq('school_id',profile.school_id).order('name'),
     sb.from('attendance_records').select('student_id,attendance_date,status,note,students!attendance_records_student_school_fk!inner(external_id,full_name)').eq('school_id',profile.school_id).order('attendance_date',{ascending:false}).limit(5000),
     sb.from('class_timetable').select('external_id,weekday,starts_at,ends_at,room,effective_from,effective_until,status,group:school_groups!class_timetable_group_school_fk(name),teacher:teachers!class_timetable_teacher_school_fk(full_name)').eq('school_id',profile.school_id).order('weekday').order('starts_at'),
     sb.from('student_homework').select('external_id,title,description,due_date,assigned_by,student:students!student_homework_student_school_fk!inner(external_id,full_name,group_name)').eq('school_id',profile.school_id).order('due_date',{ascending:true}),
     sb.from('student_results').select('external_id,assessment,score,max_score,assessment_date,feedback,student:students!student_results_student_school_fk!inner(external_id,full_name,group_name)').eq('school_id',profile.school_id).order('assessment_date',{ascending:false})
    ]);
    for(const r of [students,groups,attendance,timetableRows,homeworkRows,resultRows])if(r.error)throw r.error;
    const teachers=['owner','admin'].includes(profile.role)?await sb.from('teachers').select('id,external_id,full_name,subject,phone,monthly_salary,status').eq('school_id',profile.school_id).order('full_name'):profile.role==='teacher'?await sb.from('teachers').select('id,external_id,full_name,subject,phone,monthly_salary,status').eq('school_id',profile.school_id).eq('id',profile.teacher_id):{data:[],error:null};
    if(teachers.error)throw teachers.error;
    return {
     students:(students.data||[]).map(s=>({id:s.external_id,name:s.full_name,phone:s.phone||'',group:s.group_name||'',fee:Number(s.monthly_fee)||0,status:s.status||'Active'})),
     groups:(groups.data||[]).map(g=>({id:g.external_id,name:g.name,subject:g.subject||'',teacher:g.teacher_name||'',schedule:g.schedule||'',fee:Number(g.monthly_fee)||0})),
     teachers:(teachers.data||[]).map(t=>({id:t.external_id,cloud_id:t.id,name:t.full_name,subject:t.subject||'',phone:t.phone||'',salary:Number(t.monthly_salary)||0,status:t.status||'Active'})),
     attendance:(attendance.data||[]).map(r=>({student:r.students?.full_name||'',studentId:r.students?.external_id||null,date:r.attendance_date,status:r.status})),
     timetable:(timetableRows.data||[]).map(r=>({id:r.external_id,weekday:r.weekday,starts_at:String(r.starts_at).slice(0,5),ends_at:String(r.ends_at).slice(0,5),room:r.room||'',effective_from:r.effective_from,effective_until:r.effective_until||'',status:r.status,group:r.group?.name||'',teacher:r.teacher?.full_name||''})),
     homework:(homeworkRows.data||[]).map(r=>({id:r.external_id,title:r.title,description:r.description||'',due_date:r.due_date,teacher:r.assigned_by||'',student:r.student?.full_name||'',studentId:r.student?.external_id||'',group:r.student?.group_name||''})),
     results:(resultRows.data||[]).map(r=>({id:r.external_id,assessment:r.assessment,score:Number(r.score)||0,max_score:Number(r.max_score)||100,date:r.assessment_date,feedback:r.feedback||'',student:r.student?.full_name||'',studentId:r.student?.external_id||'',group:r.student?.group_name||''}))
    };
   },
  };
  if(profile.role!=='parent'&&d.data?.payload){
   // Restore the saved workspace locally, but never replay the entire legacy
   // payload to Supabase during sign-in. Timetable writes must happen only
   // after an explicit user save so stale duplicate slots cannot block login.
   window.schoolApp?.setData(d.data.payload);
  }
  const screen=document.getElementById('authScreen');if(screen)screen.remove();profileUi(profile);
  if(profile.role==='parent'){await loadParent(profile);return}
  if(profile.role==='teacher'&&window.schoolApp)window.schoolApp.setData({});
  if(profile.role!=='parent'&&window.schoolCloud.refreshSharedRecords){
   try{const shared=await window.schoolCloud.refreshSharedRecords();window.schoolApp?.mergeSharedData(shared)}catch(e){console.error('Shared records refresh failed:',e?.message||e,e)}
   if(['owner','admin','accountant'].includes(profile.role)){try{const finance=await window.schoolCloud.getFinanceTransactions();window.schoolApp?.mergeFinanceData(finance)}catch(e){console.error('Finance records refresh failed:',e)}}
   if(window.schoolCloud.realtimeChannel)await sb.removeChannel(window.schoolCloud.realtimeChannel);
   window.schoolCloud.realtimeChannel=sb.channel('school-live-'+profile.school_id)
    .on('postgres_changes',{event:'*',schema:'public',table:'students',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'school_groups',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'attendance_records',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'class_timetable',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'student_homework',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'student_results',filter:'school_id=eq.'+profile.school_id},refreshSharedRecordsSafely)
    .on('postgres_changes',{event:'*',schema:'public',table:'finance_transactions',filter:'school_id=eq.'+profile.school_id},refreshFinanceSafely)
    .subscribe();
  }
  if(profile.role==='owner'||profile.role==='admin'){
   const nav=document.querySelector('.nav');if(nav&&!nav.querySelector('[data-page="parents"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='parents';b.innerHTML='<span>♧</span>Parent access';const attendance=nav.querySelector('[data-page="attendance"]');attendance?.after(b)}
  }else{document.querySelector('[data-page="parents"]')?.remove()}
  if(!window.schoolCloud.canManage&&profile.role!=='accountant'){const note=document.createElement('div');note.className='readonly-note';note.textContent='Read-only access: your account can view school records.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null)}else if(profile.role==='accountant'){const note=document.createElement('div');note.className='readonly-note';note.textContent='Finance access: you can manage payments and expenses. Other school records are read-only.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null)}
  if(window.schoolApp){if(profile.role==='teacher')window.schoolApp.showTeacherPortal();else window.schoolApp.applyPermissions();}
 }
 window.addEventListener('DOMContentLoaded',async()=>{
  if(!configured){const note=document.createElement('div');note.className='mode-note';note.textContent='Preview mode: changes are saved only in this browser. Connect Supabase to enable secure accounts and shared records.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null);return}
  try{if(!window.supabase?.createClient)throw new Error('Supabase client library did not load');window.schoolSupabase=window.supabase.createClient(cfg.url,cfg.anonKey);await start();window.schoolSupabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')showGate('You have signed out. Sign in to continue.')})}
  catch(e){console.error(e);showGate('Could not open your workspace: '+e.message)}
 });
})();