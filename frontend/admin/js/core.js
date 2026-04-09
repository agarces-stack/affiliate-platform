const API=window.location.origin;
let token=localStorage.getItem('mr_token'),user=null,chartInstance=null;

async function login(){
    const res=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('loginEmail').value,password:document.getElementById('loginPassword').value})});
    const d=await res.json();
    if(d.token){token=d.token;user=d.user;localStorage.setItem('mr_token',token);showDashboard()}
    else document.getElementById('loginError').textContent=d.error||'Login failed';
}
function logout(){localStorage.removeItem('mr_token');token=null;location.reload()}
async function api(p,opt){const r=await fetch(API+p,{headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},...opt});return r.json()}

async function showDashboard(){
    document.getElementById('loginPage').style.display='none';
    document.getElementById('dashboardPage').style.display='block';
    if(!user){try{const d=JSON.parse(atob(token.split('.')[1]));user={name:d.email,company_id:d.company_id}}catch(e){}}
    document.getElementById('langSelector').innerHTML=getLanguageSelector();
    createCmdKOverlay();
    loadOverview();setupPixelCodes();loadNotifBadge();
    // Onboarding para primera vez
    if(!localStorage.getItem('mr_onboarded')){
        setTimeout(()=>showOnboarding([
            {icon:'&#128075;',title:'Welcome to MagnetRaffic!',description:'Your platform for managing sales teams, commissions, and affiliate tracking. Let\'s get you set up in 4 quick steps.'},
            {icon:'&#128188;',title:'Create Your First Campaign',description:'Campaigns are your products or offers. Go to <strong>Business → Campaigns</strong> to create one, or use the <strong>AI Assistant</strong> bar at the top to describe what you want.'},
            {icon:'&#128101;',title:'Invite Your Agents',description:'Go to <strong>People → Affiliates</strong> to add agents manually, or share your signup link. Each agent gets their own portal with tracking links and team stats.'},
            {icon:'&#128176;',title:'Configure Commissions',description:'Go to <strong>People → Ranks</strong> to set up commission rates per rank. Use <strong>Override Mode</strong> (fixed or difference) to control how team leaders earn from their team\'s sales.'},
            {icon:'&#127881;',title:'You\'re Ready!',description:'Use <strong>Ctrl+K</strong> to search anything fast. Check <strong>Sales Reports</strong> for analytics, and <strong>Knowledge Base</strong> to train your AI assistant. Happy selling!'}
        ]),500);
    }
}


function showSection(name){
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    document.getElementById('sec-'+name).classList.add('active');
    document.querySelectorAll('.sidebar a').forEach(a=>a.classList.remove('active'));
    if(event&&event.target)event.target.classList.add('active');
    switch(name){case'overview':loadOverview();break;case'affiliates':loadAffiliates();break;case'groups':loadGroups();break;case'campaigns':loadCampaigns();break;case'products':loadProducts();break;case'conversions':loadConversions();break;case'renewals':loadRenewals();break;case'salesReports':loadSalesReports();break;case'coupons':loadCoupons();break;case'payouts':loadPayouts();break;case'notifications':loadNotifications();break;case'ranks':loadRanks();break;case'logs':loadLogs();break;case'knowledge':loadKnowledge();break;case'settings':loadSettings();break;case'fraud':loadFraud();break}
}

// MODALS
function openModal(html){document.getElementById('modalContent').innerHTML=html;document.getElementById('modalOverlay').classList.add('show')}
function closeModal(){document.getElementById('modalOverlay').classList.remove('show')}

function N(v){return Number(v||0).toFixed(2)}
function E(s){if(s==null)return'';const d=document.createElement('div');d.textContent=String(s);return d.innerHTML}
