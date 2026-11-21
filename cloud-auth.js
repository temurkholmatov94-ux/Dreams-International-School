/* Supabase sign-in and shared school data. Local preview remains available without credentials. */
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  const configured=!!(cfg.url&&cfg.anonKey&&!cfg.url.includes('YOUR-PROJECT')&&!cfg.anonKey.includes('YOUR_SUPABASE'));
  const style=document.createElement('style');
  style.textContent='.auth-screen{position:fixed;inset:0;background:#f5f7fc;z-index:100;display:grid;place-items:center;padding:20px}.auth-card{width:min(420px,100%);background:white;border:1px solid #e8ecf4;border-radius:18px;padding:30px;box-shadow:0 20px 70px #18294b18}.auth-card h1{font:800 24px Manrope;margin:0 0 8px;color:#17213a}.auth-card p{color:#7c879c;font:13px/1.6 "DM Sans";margin:0 0 20px}.auth-card label{display:block;font:600 11px "DM Sans";color:#59647a;margin:13px 0 6px}.auth-card input{width:100%;padding:12px;border:1px solid #e3e8f0;border-radius:8px;font:13px "DM Sans"}.auth-card button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:8px;background:#4265e8;color:white;font-weight:700;cursor:pointer}.auth-message{font:12px/1.5 "DM Sans";color:#b45309;margin-top:12px}.auth-help{font:11px/1.6 "DM Sans";color:#8993a6;margin-top:15px}.mode-note{margin:0 0 16px;padding:10px 13px;border:1px solid #f0dfb7;border-radius:8px;background:#fff9e9;color:#8a6724;font-size:11px}.readonly-note{margin:0 0 14px;padding:10px 13px;border:1px solid #dce5fb;border-radius:8px;background:#f5f7ff;color:#5266a8;font-size:11px}';
  document.head.appendChild(style);
  function showGate(message){
    let el=document.getElementById('authScreen');
    if(!el){el=document.createElement('div');el.id='authScreen';el.className='auth-screen';document.body.appendChild(el)}
    el.innerHTML='<div class="auth-card"><div class="brand-mark" style="margin-bottom:18px">D<span>.</span></div><h1>Dreams International School</h1><p>'+message+'</p><form id="authForm"><label>Email address</label><input name="email" type="email" required autocomplete="username" placeholder="admin@example.com"><label>Password</label><input name="password" type="password" required autocomplete="current-password" placeholder="Your password"><button type="submit">Sign in securely</button></form><div class="auth-message" id="authMessage"></div><div class="auth-help">Accounts are created by the school owner in Supabase Authentication. Ask your administrator for access.</div></div>';
    document.getElementById('authForm').addEventListener('submit',async e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);const msg=document.getElementById('authMessage');msg.textContent='Signing in…';
      try{const result=await window.schoolSupabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(result.error)throw result.error;await start()}catch(err){msg.textContent=err.message||'Sign-in failed'}
    });
  }
  function showPreviewNote(){
    if(document.getElementById('previewNote'))return;
    const note=document.createElement('div');note.id='previewNote';note.className='mode-note';
    note.textContent='Preview mode: changes are saved only in this browser. Connect Supabase to enable secure accounts and shared cloud records.';
    const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null);
  }
  async function start(){
    const sessionResult=await window.schoolSupabase.auth.getSession();
    const session=sessionResult.data.session;
    if(!session){showGate('Sign in to access the school workspace.');return}
    const p=await window.schoolSupabase.from('school_profiles').select('school_id,full_name,role').eq('user_id',session.user.id).single();
    if(p.error||!p.data){await window.schoolSupabase.auth.signOut();showGate('Your account has no school profile yet. Ask the owner to provision your role.');return}
    const profile=p.data;
    const d=await window.schoolSupabase.from('school_data').select('payload').eq('school_id',profile.school_id).maybeSingle();
    if(d.error){showGate('Could not load school data: '+d.error.message);return}
    window.schoolCloud={schoolId:profile.school_id,profile,canManage:['owner','admin'].includes(profile.role),save:async payload=>{
      if(!['owner','admin'].includes(profile.role))return;
      const result=await window.schoolSupabase.from('school_data').upsert({school_id:profile.school_id,payload,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'school_id'});
      if(result.error)console.error('Cloud save failed:',result.error);
    }};
    if(d.data&&d.data.payload&&Object.keys(d.data.payload).length&&window.schoolApp)window.schoolApp.setData(d.data.payload);
    const screen=document.getElementById('authScreen');if(screen)screen.remove();
    const profileBox=document.querySelector('.profile');
    if(profileBox){profileBox.innerHTML='<div class="avatar">'+(profile.full_name||'U').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()+'</div><div><strong>'+profile.full_name+'</strong><small>'+profile.role+'</small></div><button id="signOutBtn">Sign out</button>';document.getElementById('signOutBtn').onclick=async()=>{await window.schoolSupabase.auth.signOut();location.reload()}}
    if(!window.schoolCloud.canManage){
      const note=document.createElement('div');note.id='readonlyNote';note.className='readonly-note';note.textContent='Read-only access: your account can view school records. Editing permissions will be enabled after role-specific workflows are configured.';
      const content=document.querySelector('.content');if(content)content.insertBefore(note,content.children[1]||null);
    }
    if(window.schoolApp)window.schoolApp.applyPermissions();
  }
  window.addEventListener('DOMContentLoaded',async()=>{
    if(!configured){showPreviewNote();return}
    try{const client=window.supabase;if(!client||!client.createClient)throw new Error('Supabase client library did not load');window.schoolSupabase=client.createClient(cfg.url,cfg.anonKey);await start();window.schoolSupabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT')showGate('You have signed out. Sign in to continue.')})}
    catch(e){showGate('Supabase initialisation failed: '+e.message)}
  });
})();