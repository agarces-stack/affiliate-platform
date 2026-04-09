async function loadLogs(){
    const [stats]=await Promise.all([api('/api/logs/postbacks/stats')]);
    document.getElementById('logStats').innerHTML=`
        <div class="stat-card"><div class="label">Total Requests</div><div class="value blue">${stats.total}</div></div>
        <div class="stat-card"><div class="label">Today</div><div class="value green">${stats.today}</div></div>
        <div class="stat-card"><div class="label">Errors</div><div class="value" style="color:#ef4444">${stats.errors}</div></div>
        <div class="stat-card"><div class="label">Avg Processing</div><div class="value yellow">${stats.avg_processing_ms}ms</div></div>`;
    loadPostbackLogs();loadActivityLogs();
}
async function loadPostbackLogs(){
    const st=document.getElementById('log_status').value;
    const ep=document.getElementById('log_endpoint').value;
    let url='/api/logs/postbacks?limit=50';
    if(st)url+='&status='+st;if(ep)url+='&endpoint='+ep;
    const d=await api(url);
    const logs=d.logs||[];
    document.querySelector('#postbackLogTable tbody').innerHTML=logs.map(x=>{
        const params=x.query_params||{};
        const paramStr=Object.entries(params).map(([k,v])=>k+'='+v).join(', ');
        const respStr=JSON.stringify(x.response||{}).substring(0,60);
        const statusColor=x.status==='success'?'badge-green':x.status==='error'?'badge-red':'badge-yellow';
        return`<tr>
            <td style="font-size:11px;white-space:nowrap">${new Date(x.created_at).toLocaleString()}</td>
            <td><code style="font-size:11px">${E(x.endpoint)}</code></td>
            <td><span class="badge ${statusColor}" style="font-size:10px">${E(x.status)}</span></td>
            <td style="font-size:11px">${E(x.ip_address||'-')}</td>
            <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${E(paramStr)}">${E(paramStr.substring(0,50))}</td>
            <td style="font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;color:#64748b" title="${E(respStr)}">${E(respStr)}</td>
            <td style="font-size:11px;color:${(x.processing_time_ms||0)>1000?'#ef4444':'#64748b'}">${x.processing_time_ms||'-'}ms</td>
        </tr>`}).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No logs yet</td></tr>';
}
async function loadActivityLogs(){
    const logs=await api('/api/logs/activity?limit=30');
    document.querySelector('#activityLogTable tbody').innerHTML=(logs||[]).map(x=>{
        const details=x.details||{};
        const detailStr=Object.entries(details).map(([k,v])=>`${k}: ${v}`).join(', ');
        return`<tr>
            <td style="font-size:11px;white-space:nowrap">${new Date(x.created_at).toLocaleString()}</td>
            <td style="font-size:12px">${E(x.user_name||x.user_email||'-')}</td>
            <td><code style="font-size:11px;color:#8b5cf6">${E(x.action)}</code></td>
            <td style="font-size:12px">${E(x.entity_type||'')} ${x.entity_id?'#'+x.entity_id:''}</td>
            <td style="font-size:11px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis">${E(detailStr.substring(0,80))}</td>
        </tr>`}).join('')||'<tr><td colspan="5" style="text-align:center;color:#64748b">No activity yet</td></tr>';
}
