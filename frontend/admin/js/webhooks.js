// WEBHOOKS
async function loadWebhooks(){
    const hooks=await api('/api/webhooks');
    const list=document.getElementById('webhookList');
    if(!Array.isArray(hooks)||hooks.length===0){list.innerHTML='<p style="color:#64748b;text-align:center;padding:40px">No webhooks configured yet. Click "+ New Webhook" to create one.</p>';return}
    list.innerHTML=hooks.map(h=>{
        const events=(h.events||[]).map(e=>`<span style="background:#334155;padding:2px 8px;border-radius:10px;font-size:11px;margin-right:4px">${E(e)}</span>`).join('');
        const statusColor=h.is_active?'#22c55e':'#64748b';
        const lastStatus=h.last_status?(h.last_status>=200&&h.last_status<300?'#22c55e':'#ef4444'):'#64748b';
        return `<div style="background:#1e293b;padding:18px 20px;border-radius:12px;margin-bottom:10px;border-left:3px solid ${statusColor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <div>
                    <strong>${E(h.name)}</strong>
                    <span style="color:${statusColor};font-size:12px;margin-left:8px">${h.is_active?'ACTIVE':'DISABLED'}</span>
                </div>
                <div style="display:flex;gap:6px">
                    <button class="btn btn-gray" style="padding:4px 10px;font-size:12px" onclick="testWebhook(${h.id})">Test</button>
                    <button class="btn btn-gray" style="padding:4px 10px;font-size:12px" onclick="toggleWebhook(${h.id},${!h.is_active})">${h.is_active?'Disable':'Enable'}</button>
                    <button class="btn btn-gray" style="padding:4px 10px;font-size:12px;color:#ef4444" onclick="deleteWebhook(${h.id})">Delete</button>
                </div>
            </div>
            <code style="color:#94a3b8;font-size:12px;word-break:break-all">${E(h.url)}</code>
            <div style="margin-top:8px">${events}</div>
            ${h.last_triggered_at?`<div style="color:#64748b;font-size:11px;margin-top:8px">Last triggered: ${new Date(h.last_triggered_at).toLocaleString()} · Status: <span style="color:${lastStatus}">${h.last_status||'error'}</span> · Failures: ${h.fail_count||0}</div>`:''}
        </div>`;
    }).join('');
}
function showWebhookForm(){document.getElementById('webhookForm').style.display='block';document.getElementById('whName').value='';document.getElementById('whUrl').value='';document.getElementById('whSecret').value='';document.querySelectorAll('.whEvent').forEach(c=>c.checked=false)}
async function createWebhook(){
    const name=document.getElementById('whName').value.trim();
    const url=document.getElementById('whUrl').value.trim();
    const secret=document.getElementById('whSecret').value.trim();
    const events=Array.from(document.querySelectorAll('.whEvent:checked')).map(c=>c.value);
    if(!name||!url||events.length===0){alert('Name, URL and at least one event are required');return}
    const res=await api('/api/webhooks',{method:'POST',body:JSON.stringify({name,url,secret:secret||null,events})});
    if(res.error){alert(res.error);return}
    document.getElementById('webhookForm').style.display='none';
    loadWebhooks();
}
async function testWebhook(id){const r=await api('/api/webhooks/'+id+'/test',{method:'POST'});alert(r.status==='test_sent'?'Test webhook sent!':r.error||'Failed')}
async function toggleWebhook(id,active){await api('/api/webhooks/'+id,{method:'PUT',body:JSON.stringify({is_active:active})});loadWebhooks()}
async function deleteWebhook(id){if(!confirm('Delete this webhook?'))return;await api('/api/webhooks/'+id,{method:'DELETE'});loadWebhooks()}
