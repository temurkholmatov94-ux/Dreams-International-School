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
  const [students,attendance]=await Promise.all([
   sb.from('students').select('id,full_name,group_name').in('id',ids).order('full_name'),
   sb.from('attendance_records').select('id,student_id,attendance_date,status,note').in('student_id',ids).order('attendance_date',{ascending:false}).limit(100)
  ]);
  if(students.error)throw students.error;if(attendance.error)throw attendance.error;
  window.schoolApp.showParentPortal(students.data||[],attendance.data||[],profile);
  const channel=sb.channel('parent-attendance-'+profile.school_id).on('postgres_changes',{event:'*',schema:'public',table:'attendance_records',filter:'school_id=eq.'+profile.school_id},async()=>{try{await loadParent(profile)}catch(e){console.error('Attendance refresh failed',e)}}).subscribe();
  window.schoolCloud.realtimeChannel=channel;
 }
 async function start(){
  const sessionResult=await window.schoolSupabase.auth.getSession(),session=sessionResult.data.session;
  if(!session){showGate('Sign in to access your school or family portal.');return}
  const p=await window.schoolSupabase.from('school_profiles').select('school_id,full_name,role').eq('user_id',session.user.id).single();
  if(p.error||!p.data){await window.schoolSupabase.auth.signOut();showGate('Your account has no school profile. Ask the school owner to set up your access.');return}
  const profile=p.data,sb=window.schoolSupabase;
  const d=profile.role==='parent'?{data:null,error:null}:await sb.from('school_data').select('payload').eq('school_id',profile.school_id).maybeSingle();
  if(d.error){showGate('Could not load school data: '+d.error.message);return}
  window.schoolCloud={
   schoolId:profile.school_id,profile,canManage:['owner','admin'].includes(profile.role),
   inviteParent:async payload=>{const {data,error}=await sb.functions.invoke('invite-parent',{body:payload});if(error)throw error;if(data?.error)throw new Error(data.error);return data},
   save:async payload=>{
    if(!['owner','admin'].includes(profile.role))return;
    const cloud=await sb.from('school_data').upsert({school_id:profile.school_id,payload,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'school_id'});
    if(cloud.error){console.error('Cloud save failed:',cloud.error);return}
    const localStudents=(payload.students||[]).map(s=>({school_id:profile.school_id,external_id:String(s.id),full_name:s.name,phone:s.phone||null,group_name:s.group||null,monthly_fee:Number(s.fee)||0,status:s.status||'Active'}));
    if(localStudents.length){
     const up=await sb.from('students').upsert(localStudents,{onConflict:'school_id,external_id'});if(up.error){console.error('Student sync failed:',up.error);return}
    }
    const stored=await sb.from('students').select('id,external_id,full_name').eq('school_id',profile.school_id);
    if(stored.error){console.error('Student lookup failed:',stored.error);return}
    const idByExternal=new Map((stored.data||[]).map(s=>[String(s.external_id),s.id]));
    const rows=(payload.attendance||[]).map(a=>{const student=(stored.data||[]).find(s=>s.full_name===a.student);const studentId=student?.id;if(!studentId)return null;return {school_id:profile.school_id,student_id:studentId,attendance_date:a.date,status:a.status,marked_by:session.user.id}}).filter(Boolean);
    if(rows.length){const saved=await sb.from('attendance_records').upsert(rows,{onConflict:'student_id,attendance_date'});if(saved.error)console.error('Attendance sync failed:',saved.error)}
   }
  };
  const screen=document.getElementById('authScreen');if(screen)screen.remove();profileUi(profile);
  if(profile.role==='parent'){await loadParent(profile);return}
  if(d.data?.payload&&Object.keys(d.data.payload).length&&window.schoolApp)window.schoolApp.setData(d.data.payload);
  if(profile.role==='owner'||profile.role==='admin'){
   const nav=document.querySelector('.nav');if(nav&&!nav.querySelector('[data-page="parents"]')){const b=document.createElement('button');b.className='nav-item';b.dataset.page='parents';b.innerHTML='<span>♧</span>Parent access';const attendance=nav.querySelector('[data-page="attendance"]');attendance?.after(b)}
  }else{document.querySelector('[data-page="parents"]')?.remove()}
  if(!window.schoolCloud.canManage){const note=document.createElement('div');note.className='readonly-note';note.textContent='Read-only access: your account can view school records.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null)}
  if(window.schoolApp)window.schoolApp.applyPermissions();
 }
 window.addEventListener('DOMContentLoaded',async()=>{
  if(!configured){const note=document.createElement('div');note.className='mode-note';note.textContent='Preview mode: changes are saved only in this browser. Connect Supabase to enable secure accounts and shared records.';const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null);return}
  try{if(!window.supabase?.createClient)throw new Error('Supabase client library did not load');window.schoolSupabase=window.supabase.createClient(cfg.url,cfg.anonKey);await start();window.schoolSupabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')showGate('You have signed out. Sign in to continue.')})}
  catch(e){console.error(e);showGate('Could not open your workspace: '+e.message)}
 });
})();