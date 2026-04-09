async function loadOverview(){
    const s=await api('/api/reports/dashboard');
    document.getElementById('companyName').textContent=user?.name||'';
    document.getElementById('statsGrid').innerHTML=`
        <div class="stat-card"><div class="label">Total Affiliates</div><div class="value blue">${s.affiliates}</div></div>
        <div class="stat-card"><div class="label">Total Clicks</div><div class="value blue">${s.total_clicks}</div></div>
        <div class="stat-card"><div class="label">Total Conversions</div><div class="value green">${s.total_conversions}</div></div>
        <div class="stat-card"><div class="label">Total Revenue</div><div class="value green">$${N(s.total_revenue)}</div></div>
        <div class="stat-card"><div class="label">Total Commission</div><div class="value purple">$${N(s.total_commission)}</div></div>
        <div class="stat-card"><div class="label">Today Clicks</div><div class="value yellow">${s.today_clicks}</div></div>
        <div class="stat-card"><div class="label">Today Conversions</div><div class="value yellow">${s.today_conversions}</div></div>
        <div class="stat-card"><div class="label">Pending Commission</div><div class="value purple">$${N(s.pending_commission)}</div></div>`;
    const top=await api('/api/reports/top-affiliates?limit=10');
    document.querySelector('#topAffTable tbody').innerHTML=top.map(a=>`<tr><td>${E(a.first_name)} ${E(a.last_name)}</td><td>${E(a.email)}</td><td>${a.total_clicks}</td><td>${a.total_conversions}</td><td>$${N(a.total_revenue)}</td><td>$${N(a.total_commission)}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;color:#64748b">No affiliates yet</td></tr>';
    loadChart();
}

async function loadChart(){
    try{
        const end=new Date().toISOString().split('T')[0];const start=new Date(Date.now()-30*86400000).toISOString().split('T')[0];
        const data=await api('/api/reports/by-date?start_date='+start+'&end_date='+end+'&group_by=day');
        const ctx=document.getElementById('chartRevenue').getContext('2d');
        if(chartInstance)chartInstance.destroy();
        chartInstance=new Chart(ctx,{type:'bar',data:{labels:data.map(d=>d.date),datasets:[{label:'Revenue ($)',data:data.map(d=>d.revenue),backgroundColor:'#3b82f6'},{label:'Commission ($)',data:data.map(d=>d.commission),backgroundColor:'#8b5cf6'}]},options:{responsive:true,plugins:{legend:{labels:{color:'#94a3b8'}}},scales:{x:{ticks:{color:'#64748b'}},y:{ticks:{color:'#64748b'}}}}});
    }catch(e){}
}

