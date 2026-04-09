async function loadFraud(){
    const stats=await api('/api/fraud/stats');
    document.getElementById('fraudStats').innerHTML=`
        <div class="stat-card"><div class="label">Total Alerts</div><div class="value yellow">${stats.total_alerts}</div></div>
        <div class="stat-card"><div class="label">Today Alerts</div><div class="value yellow">${stats.today_alerts}</div></div>
        <div class="stat-card"><div class="label">Critical</div><div class="value" style="color:#ef4444">${stats.critical_alerts}</div></div>
        <div class="stat-card"><div class="label">High Severity</div><div class="value" style="color:#f97316">${stats.high_alerts}</div></div>
        <div class="stat-card"><div class="label">Blocked IPs</div><div class="value" style="color:#ef4444">${stats.blocked_ips}</div></div>`;

    const suspicious=await api('/api/fraud/suspicious-ips');
    document.querySelector('#suspiciousTable tbody').innerHTML=suspicious.map(x=>`<tr>
        <td><code>${E(x.ip)}</code></td><td>${x.alert_count}</td>
        <td><span class="badge ${x.max_severity==='critical'||x.max_severity==='high'?'badge-red':'badge-yellow'}">${E(x.max_severity)}</span></td>
        <td>${new Date(x.last_alert).toLocaleString()}</td>
        <td><button class="btn btn-red" onclick="blockIP('${E(x.ip)}','Auto-flagged: ${x.alert_count} alerts')">Block</button></td>
    </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#64748b">No suspicious IPs</td></tr>';

    const blocked=await api('/api/fraud/blocked-ips');
    document.querySelector('#blockedTable tbody').innerHTML=blocked.map(x=>`<tr>
        <td><code>${E(x.ip_address)}</code></td><td>${E(x.reason)||'-'}</td><td>${E(x.blocked_by)||'-'}</td>
        <td>${new Date(x.created_at).toLocaleString()}</td>
        <td>${x.is_active?`<button class="btn btn-green" onclick="unblockIP('${E(x.ip_address)}')">Unblock</button>`:'<span class="badge badge-yellow">Inactive</span>'}</td>
    </tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:#64748b">No blocked IPs</td></tr>';

    const logs=await api('/api/fraud/logs?limit=50');
    document.querySelector('#fraudTable tbody').innerHTML=logs.map(x=>{
        const details=typeof x.details==='string'?JSON.parse(x.details):x.details;
        return`<tr>
        <td>${new Date(x.created_at).toLocaleString()}</td>
        <td>${E(x.affiliate_email)||E(x.ref_id)||'-'}</td>
        <td><code>${E(x.rule)}</code></td>
        <td><span class="badge ${x.severity==='critical'||x.severity==='high'?'badge-red':x.severity==='medium'?'badge-yellow':'badge-green'}">${E(x.severity)}</span></td>
        <td style="font-size:12px">${JSON.stringify(details).substring(0,60)}</td>
        <td><span class="badge ${x.action_taken==='blocked'?'badge-red':x.action_taken==='flagged'?'badge-yellow':'badge-green'}">${x.action_taken}</span></td>
    </tr>`}).join('')||'<tr><td colspan="6" style="text-align:center;color:#64748b">No fraud alerts</td></tr>';
}
async function blockIP(ip,reason){await api('/api/fraud/block-ip',{method:'POST',body:JSON.stringify({ip_address:ip,reason:reason||'Manual block'})});loadFraud()}
async function unblockIP(ip){await api('/api/fraud/unblock-ip/'+ip,{method:'DELETE'});loadFraud()}
function showBlockIPModal(){
    openModal(`<h2>Block IP Address</h2>
        <label>IP Address</label><input id="block_ip" placeholder="123.45.67.89">
        <label>Reason</label><input id="block_reason" placeholder="Reason for blocking">
        <div class="modal-actions"><button class="btn btn-red" onclick="blockIP(document.getElementById('block_ip').value,document.getElementById('block_reason').value);closeModal()">Block IP</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
