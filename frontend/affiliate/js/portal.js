function scrollToSection(id){
    document.getElementById(id).scrollIntoView({behavior:'smooth',block:'start'});
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
}
function showPortalTab(tab, el) {
    document.querySelectorAll('.portal-tab').forEach(t => t.style.display = 'none');
    const target = document.querySelector(`[data-tab="${tab}"]`);
    if (target) { target.style.display = 'block'; fadeIn(target); }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
}

const API=window.location.origin;
document.getElementById('loginLangSelector').innerHTML=getLanguageSelector();
let affToken=localStorage.getItem('mr_aff_token'),affData=null;
if(affToken)showPortal();

function showTab(t){
    document.getElementById('loginForm').style.display=t==='login'?'block':'none';
    document.getElementById('registerForm').style.display=t==='register'?'block':'none';
    document.querySelectorAll('.tabs button').forEach((b,i)=>b.classList.toggle('active',(t==='login'&&i===0)||(t==='register'&&i===1)));
    document.getElementById('affError').textContent='';document.getElementById('affSuccess').textContent='';
}

async function affLogin(){
    const res=await fetch(API+'/api/auth/affiliate/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('affEmail').value,password:document.getElementById('affPass').value})});
    const d=await res.json();
    if(d.token){affToken=d.token;affData=d.affiliate;localStorage.setItem('mr_aff_token',affToken);showPortal()}
    else document.getElementById('affError').textContent=d.error||'Login failed';
}

async function affRegister(){
    const urlParams=new URLSearchParams(window.location.search);
    const parentRef=urlParams.get('ref')||null;
    const res=await fetch(API+'/api/auth/affiliate/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({first_name:document.getElementById('regFirst').value,last_name:document.getElementById('regLast').value,email:document.getElementById('regEmail').value,password:document.getElementById('regPass').value,company_name:document.getElementById('regCompany').value,phone:document.getElementById('regPhone').value,website:document.getElementById('regWebsite').value,company_id:1,parent_ref_id:parentRef})});
    const d=await res.json();
    if(d.ref_id){document.getElementById('affSuccess').textContent='Registered! Your ID: '+d.ref_id+'. Waiting for admin approval.';showTab('login')}
    else document.getElementById('affError').textContent=d.error||'Registration failed';
}

async function showPortal(){
    document.getElementById('loginPage').style.display='none';
    document.getElementById('portalPage').style.display='block';
    const decoded=JSON.parse(atob(affToken.split('.')[1]));
    const refId=decoded.ref_id;
    document.getElementById('welcomeName').textContent='Welcome, '+(decoded.email||'Affiliate');
    document.getElementById('refIdDisplay').textContent=refId;
    document.getElementById('trackingLink').textContent=API+'/track?ref_id='+refId+'&campaign_id=1';
    document.getElementById('mlmLink').textContent=API+'/affiliate?ref='+refId;

    // Load stats
    try{
        const res=await fetch(API+'/api/affiliates/'+decoded.id+'/stats',{headers:{'Authorization':'Bearer '+affToken}});
        const s=await res.json();
        document.getElementById('st_clicks').textContent=s.clicks?.total||0;
        document.getElementById('st_conv').textContent=s.conversions?.total||0;
        document.getElementById('st_rev').textContent='$'+Number(s.conversions?.revenue||0).toFixed(2);
        document.getElementById('st_comm').textContent='$'+Number(s.conversions?.commission||0).toFixed(2);
        document.getElementById('st_rate').textContent=s.conversion_rate||'0%';
    }catch(e){}
    loadWallet();
    loadTierProgress();
    loadTeam();
    loadAffNotifs();
}

function updateLink(){
    const decoded=JSON.parse(atob(affToken.split('.')[1]));
    const campId=document.getElementById('campaignSelect').value;
    const deep=document.getElementById('deepLinkInput').value;
    let url=API+'/track?ref_id='+decoded.ref_id+'&campaign_id='+campId;
    if(deep)url+='&deep='+encodeURIComponent(deep);
    document.getElementById('trackingLink').textContent=url;
}

async function loadTeam(){
    const decoded=JSON.parse(atob(affToken.split('.')[1]));
    try{
        const ts=await fetch(API+'/api/team/'+decoded.id+'/stats',{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
        document.getElementById('teamStats').innerHTML=`
            <div class="stat-card"><div class="label">My Rank</div><div class="value purple">${ts.personal?.rank||1}</div></div>
            <div class="stat-card"><div class="label">Direct Recruits</div><div class="value blue">${ts.direct_recruits?.active||0}</div></div>
            <div class="stat-card"><div class="label">Total Team</div><div class="value blue">${ts.team_totals?.total_members||0}</div></div>
            <div class="stat-card"><div class="label">Team Revenue</div><div class="value green">$${Number(ts.team_totals?.team_revenue||0).toFixed(2)}</div></div>
            <div class="stat-card"><div class="label">Override Earnings</div><div class="value green">$${Number(ts.mlm_earnings?.total||0).toFixed(2)}</div></div>`;
        const levels=ts.levels||[];
        document.querySelector('#teamLevelTable tbody').innerHTML=levels.map(l=>`<tr style="border-bottom:1px solid #1e293b">
            <td style="padding:8px">Level ${l.level}</td><td style="padding:8px">${l.members}</td>
            <td style="padding:8px">${l.active_members}</td><td style="padding:8px">$${Number(l.total_revenue||0).toFixed(2)}</td>
            <td style="padding:8px">$${Number(l.total_commission||0).toFixed(2)}</td>
        </tr>`).join('')||'<tr><td colspan="5" style="padding:8px;color:#64748b">No team members yet</td></tr>';

        // Load tree
        try{
            const tree=await fetch(API+'/api/team/'+decoded.id+'/tree?depth=5',{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
            document.getElementById('teamTree').innerHTML=renderTree(tree.team||[]);
        }catch(e){document.getElementById('teamTree').innerHTML='<p style="color:#64748b">No team members yet</p>'}

        const top=await fetch(API+'/api/team/'+decoded.id+'/top?limit=5',{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
        document.querySelector('#teamTopTable tbody').innerHTML=top.map(t=>`<tr style="border-bottom:1px solid #1e293b">
            <td style="padding:8px">${esc(t.first_name||'')} ${esc(t.last_name||'')}</td>
            <td style="padding:8px"><span style="color:${t.rank_color||'#64748b'}">${esc(t.rank_name||'Rank '+t.rank)}</span></td>
            <td style="padding:8px">${t.total_conversions}</td><td style="padding:8px">$${Number(t.total_revenue||0).toFixed(2)}</td>
        </tr>`).join('')||'<tr><td colspan="4" style="padding:8px;color:#64748b">No team members yet</td></tr>';
    }catch(e){console.error('Team load error:',e)}
}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=String(s);return d.innerHTML}

async function loadTierProgress(){
    try{
        const decoded=JSON.parse(atob(affToken.split('.')[1]));
        const tiers=await fetch(API+'/api/tiers/affiliate/'+decoded.id,{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
        if(!tiers.length){document.getElementById('tierProgress').style.display='none';return}
        document.getElementById('tierProgress').style.display='block';
        document.getElementById('tierContent').innerHTML=tiers.map(t=>{
            const pct=Math.min(100,Math.round((t.conversions_count/(t.min_conversions||1))*100));
            return`<div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px"><strong style="color:#e2e8f0">${esc(t.campaign_name)}</strong><span style="color:#8b5cf6;font-weight:700">${esc(t.tier_name)}</span></div>
                <div style="background:#0f172a;border-radius:8px;height:8px;overflow:hidden"><div style="background:#8b5cf6;height:100%;width:${pct}%;border-radius:8px;transition:width 0.3s"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:#64748b"><span>${t.conversions_count} sales · $${Number(t.revenue_total||0).toFixed(0)} revenue</span><span>${pct}%</span></div>
            </div>`}).join('');
    }catch(e){}
}

async function loadWallet(){
    try{
        const w=await fetch(API+'/api/wallet/balance',{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
        document.getElementById('walletAvailable').textContent='$'+Number(w.available_balance||0).toFixed(2);
        document.getElementById('walletPending').textContent='$'+Number(w.pending_balance||0).toFixed(2);
        document.getElementById('walletEarned').textContent='$'+Number(w.total_earned||0).toFixed(2);
        document.getElementById('walletWithdrawn').textContent='$'+Number(w.total_withdrawn||0).toFixed(2);
        const scheduleMap={on_request:'Withdraw anytime',weekly:'Paid weekly',biweekly:'Paid biweekly',monthly:'Paid monthly'};
        document.getElementById('walletSchedule').textContent=scheduleMap[w.payout_schedule]||'';
        const btn=document.getElementById('withdrawBtn');
        if(!w.can_withdraw){btn.disabled=true;btn.style.opacity='0.5';btn.textContent='Min $'+Number(w.min_withdrawal).toFixed(0)+' to withdraw'}
        window._walletData=w;
    }catch(e){console.error('Wallet error:',e)}
}

function showWithdrawModal(){
    const w=window._walletData||{};
    document.getElementById('txnModal').style.display='block';
    document.getElementById('txnModal').querySelector('h2').textContent='Request Withdrawal';
    document.getElementById('txnList').innerHTML=`
        <p style="color:#94a3b8;margin-bottom:15px">Available: <strong style="color:#22c55e">$${Number(w.available_balance||0).toFixed(2)}</strong></p>
        <label style="color:#94a3b8;font-size:13px;display:block;margin-bottom:4px">Amount</label>
        <input id="wd_amount" type="number" step="0.01" min="${w.min_withdrawal||50}" max="${w.available_balance||0}" value="${w.available_balance||0}" style="width:100%;padding:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:16px;margin-bottom:10px">
        <label style="color:#94a3b8;font-size:13px;display:block;margin-bottom:4px">Payment Method</label>
        <select id="wd_method" style="width:100%;padding:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:16px;margin-bottom:10px">
            <option value="paypal">PayPal</option>
            <option value="wire">Wire Transfer / ACH</option>
            <option value="zelle">Zelle</option>
        </select>
        <label style="color:#94a3b8;font-size:13px;display:block;margin-bottom:4px">PayPal Email / Account Details</label>
        <input id="wd_details" placeholder="your@paypal.com" style="width:100%;padding:12px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:#e2e8f0;font-size:16px;margin-bottom:15px">
        <button onclick="submitWithdrawal()" style="width:100%;padding:14px;background:#22c55e;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer">Submit Request</button>
    `;
}

async function submitWithdrawal(){
    try{
        const r=await fetch(API+'/api/wallet/withdraw',{method:'POST',headers:{'Authorization':'Bearer '+affToken,'Content-Type':'application/json'},body:JSON.stringify({amount:parseFloat(document.getElementById('wd_amount').value),payment_method:document.getElementById('wd_method').value,payment_details:{email:document.getElementById('wd_details').value}})}).then(r=>r.json());
        if(r.error){toast(r.error,'error');return}
        document.getElementById('txnModal').style.display='none';
        toast('Withdrawal request submitted! Status: '+r.status,'success');
        loadWallet();
    }catch(e){toast('Error: '+e.message,'error')}
}

async function showMovements(){
    document.getElementById('txnModal').style.display='block';
    document.getElementById('txnModal').querySelector('h2').textContent='Transactions';
    document.getElementById('txnList').innerHTML='<p style="color:#64748b">Loading...</p>';
    try{
        const d=await fetch(API+'/api/wallet/movements?limit=30',{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
        const movs=d.movements||[];
        document.getElementById('txnList').innerHTML=movs.map(m=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #0f172a">
                <div>
                    <div style="color:#e2e8f0;font-size:13px;font-weight:500">${esc(m.description||m.type.replace(/_/g,' '))}</div>
                    <div style="color:#64748b;font-size:11px">${new Date(m.created_at).toLocaleString()}${!m.is_available?' · <span style="color:#eab308">pending</span>':''}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-weight:700;font-size:14px;color:${m.direction==='credit'?'#22c55e':'#ef4444'}">${m.direction==='credit'?'+':'-'}$${Number(m.amount).toFixed(2)}</div>
                    <div style="color:#64748b;font-size:11px">Bal: $${Number(m.balance_after).toFixed(2)}</div>
                </div>
            </div>
        `).join('')||'<p style="color:#64748b;text-align:center;padding:20px">No transactions yet</p>';
    }catch(e){document.getElementById('txnList').innerHTML='<p style="color:#ef4444">Error loading transactions</p>'}
}

function renderTree(nodes){
    if(!nodes||nodes.length===0)return'<p style="color:#64748b">No team members yet</p>';
    return'<ul style="list-style:none;padding-left:20px;margin:0">'+nodes.map(n=>{
        const color=n.rank_color||'#64748b';
        const name=esc(n.first_name||'')+' '+esc(n.last_name||'');
        const status=n.status==='approved'?'#22c55e':n.status==='pending'?'#eab308':'#ef4444';
        return`<li style="margin:6px 0;position:relative">
            <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#0f172a;border-radius:8px;border-left:3px solid ${color}">
                <span style="width:8px;height:8px;border-radius:50%;background:${status};flex-shrink:0" title="${esc(n.status)}"></span>
                <span style="color:${color};font-weight:600;font-size:12px">${esc(n.rank_name||'R'+n.rank)}</span>
                <span style="color:#e2e8f0;font-weight:500">${name.trim()||esc(n.email)}</span>
                <span style="color:#64748b;font-size:11px;margin-left:auto">${n.total_conversions} sales · $${Number(n.total_revenue||0).toFixed(0)}</span>
            </div>
            ${n.children&&n.children.length>0?renderTree(n.children):''}
        </li>`}).join('')+'</ul>';
}

async function loadAffNotifs(){
    try{
        const d=await fetch(API+'/api/notifications?limit=20',{headers:{'Authorization':'Bearer '+affToken}}).then(r=>r.json());
        const notifs=d.notifications||[];
        const badge=document.getElementById('affNotifBadge');
        if(d.unread>0){badge.textContent=d.unread;badge.style.display='inline'}else{badge.style.display='none'}
        document.getElementById('affNotifList').innerHTML=notifs.slice(0,10).map(n=>`
            <div style="border-left:3px solid ${n.is_read?'#334155':'#8b5cf6'};padding:10px 15px;margin-bottom:6px;border-radius:6px;opacity:${n.is_read?'0.5':'1'}">
                <strong style="font-size:13px;color:${n.is_read?'#94a3b8':'#e2e8f0'}">${esc(n.title)}</strong>
                <p style="color:#94a3b8;font-size:12px;margin-top:3px">${esc(n.message)}</p>
                <span style="color:#64748b;font-size:11px">${new Date(n.created_at).toLocaleString()}</span>
            </div>
        `).join('')||'<p style="color:#64748b;font-size:13px">No notifications yet</p>';
    }catch(e){}
}

async function sendChat(){
    const input=document.getElementById('chatInput');
    const q=input.value.trim();if(!q)return;
    const msgs=document.getElementById('chatMessages');
    msgs.innerHTML+=`<div style="margin-bottom:8px;text-align:right"><span style="background:#8b5cf6;color:#fff;padding:8px 12px;border-radius:12px 12px 0 12px;font-size:13px;display:inline-block;max-width:80%">${esc(q)}</span></div>`;
    input.value='';
    msgs.innerHTML+=`<div id="chatLoading" style="margin-bottom:8px"><span style="background:#334155;color:#94a3b8;padding:8px 12px;border-radius:12px 12px 12px 0;font-size:13px;display:inline-block">Thinking...</span></div>`;
    msgs.scrollTop=msgs.scrollHeight;
    try{
        const r=await fetch(API+'/api/knowledge/chat',{method:'POST',headers:{'Authorization':'Bearer '+affToken,'Content-Type':'application/json'},body:JSON.stringify({question:q})}).then(r=>r.json());
        document.getElementById('chatLoading')?.remove();
        if(r.error){msgs.innerHTML+=`<div style="margin-bottom:8px"><span style="background:#1e293b;color:#ef4444;padding:8px 12px;border-radius:12px 12px 12px 0;font-size:13px;display:inline-block">${esc(r.error)}</span></div>`;return}
        let srcHtml='';
        if(r.sources?.length)srcHtml=`<div style="margin-top:6px;font-size:10px;color:#64748b">${r.sources.map(s=>`[${esc(s.title)}]`).join(' ')}</div>`;
        msgs.innerHTML+=`<div style="margin-bottom:8px"><span style="background:#1e293b;color:#e2e8f0;padding:10px 14px;border-radius:12px 12px 12px 0;font-size:13px;display:inline-block;max-width:85%;line-height:1.5">${esc(r.answer).replace(/\n/g,'<br>')}${srcHtml}</span></div>`;
    }catch(e){document.getElementById('chatLoading')?.remove();msgs.innerHTML+=`<div style="margin-bottom:8px"><span style="background:#1e293b;color:#ef4444;padding:8px 12px;border-radius:12px;font-size:13px">Error connecting to AI</span></div>`}
    msgs.scrollTop=msgs.scrollHeight;
}

function copyEl(id){navigator.clipboard.writeText(document.getElementById(id).textContent);toast('Copied!','success')}
function affLogout(){localStorage.removeItem('mr_aff_token');affToken=null;location.reload()}
