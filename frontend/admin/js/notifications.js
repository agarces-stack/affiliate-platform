async function loadNotifBadge(){
    try{const d=await api('/api/notifications?unread_only=true&limit=1');const b=document.getElementById('notifBadge');if(d.unread>0){b.textContent=d.unread;b.style.display='inline'}else{b.style.display='none'}}catch(e){}
}
async function loadNotifications(){
    const d=await api('/api/notifications?limit=50');
    const notifs=d.notifications||[];
    document.getElementById('notifList').innerHTML=notifs.map(n=>`
        <div style="background:${n.is_read?'#1e293b':'#1e293b'};border-left:3px solid ${n.is_read?'#334155':'#3b82f6'};padding:15px 20px;border-radius:8px;margin-bottom:8px;cursor:pointer;opacity:${n.is_read?'0.6':'1'}" onclick="markRead(${n.id},this)">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <strong style="color:${n.is_read?'#94a3b8':'#e2e8f0'}">${E(n.title)}</strong>
                <span style="color:#64748b;font-size:12px">${new Date(n.created_at).toLocaleString()}</span>
            </div>
            <p style="color:#94a3b8;font-size:13px;margin-top:5px">${E(n.message)}</p>
        </div>
    `).join('')||'<p style="color:#64748b;text-align:center;padding:40px">No notifications</p>';
    const b=document.getElementById('notifBadge');if(d.unread>0){b.textContent=d.unread;b.style.display='inline'}else{b.style.display='none'}
}
async function markRead(id,el){await api('/api/notifications/'+id+'/read',{method:'PATCH'});if(el){el.style.opacity='0.6';el.style.borderLeftColor='#334155'}loadNotifBadge()}
async function markAllRead(){await api('/api/notifications/read-all',{method:'PATCH'});loadNotifications()}
