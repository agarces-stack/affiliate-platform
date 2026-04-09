async function loadSalesReports(){
    const sd=document.getElementById('sr_start').value||new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const ed=document.getElementById('sr_end').value||new Date().toISOString().split('T')[0];
    if(!document.getElementById('sr_start').value)document.getElementById('sr_start').value=sd;
    if(!document.getElementById('sr_end').value)document.getElementById('sr_end').value=ed;

    const [summary,byAgent,byCamp,byRank]=await Promise.all([
        api('/api/sales-reports/summary'),
        api('/api/sales-reports/by-agent?start_date='+sd+'&end_date='+ed),
        api('/api/sales-reports/by-campaign?start_date='+sd+'&end_date='+ed),
        api('/api/sales-reports/by-rank?start_date='+sd+'&end_date='+ed),
    ]);
    const s=summary;const arrow=(v)=>v>0?'<span style="color:#22c55e">+'+v+'%</span>':v<0?'<span style="color:#ef4444">'+v+'%</span>':'<span style="color:#64748b">0%</span>';
    document.getElementById('salesSummary').innerHTML=`
        <div class="stat-card"><div class="label">This Month Sales</div><div class="value blue">${s.this_month.sales}</div><div style="font-size:12px;margin-top:4px">${arrow(s.changes.sales)} vs last month</div></div>
        <div class="stat-card"><div class="label">This Month Revenue</div><div class="value green">$${N(s.this_month.revenue)}</div><div style="font-size:12px;margin-top:4px">${arrow(s.changes.revenue)} vs last month</div></div>
        <div class="stat-card"><div class="label">This Month Commission</div><div class="value purple">$${N(s.this_month.commission)}</div><div style="font-size:12px;margin-top:4px">${arrow(s.changes.commission)} vs last month</div></div>
        <div class="stat-card"><div class="label">Active Agents</div><div class="value blue">${s.this_month.active_agents}</div></div>
        <div class="stat-card"><div class="label">Renewals This Month</div><div class="value green">${s.this_month.renewals}</div><div style="font-size:12px;margin-top:4px">${arrow(s.changes.renewals)} vs last month</div></div>
        <div class="stat-card"><div class="label">Renewal Revenue</div><div class="value green">$${N(s.this_month.renewal_revenue)}</div></div>`;
    const agents=byAgent.agents||[];
    document.querySelector('#srAgentTable tbody').innerHTML=agents.map(x=>`<tr>
        <td>${E(x.first_name||'')} ${E(x.last_name||'')} <span style="color:#64748b;font-size:11px">${E(x.email)}</span></td>
        <td><span style="color:${x.rank_color||'#64748b'};font-weight:600">${E(x.rank_name||'R'+x.rank)}</span></td>
        <td>${x.sales_count} <span style="color:#64748b;font-size:11px">(${x.approved_sales} approved)</span></td>
        <td>$${N(x.total_revenue)}</td><td>$${N(x.total_commission)}</td>
        <td>${x.renewal_count}</td><td>$${N(x.renewal_revenue)}</td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No data</td></tr>';
    const camps=byCamp.campaigns||[];
    document.querySelector('#srCampTable tbody').innerHTML=camps.map(x=>`<tr>
        <td>${E(x.name)}</td><td>${E(x.commission_type)}</td><td>${x.sales_count}</td>
        <td>$${N(x.total_revenue)}</td><td>$${N(x.total_commission)}</td>
        <td>${x.active_agents}</td><td>${x.renewal_count}</td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No data</td></tr>';
    const ranks=byRank.ranks||[];
    document.querySelector('#srRankTable tbody').innerHTML=ranks.map(x=>`<tr>
        <td><span style="color:${E(x.color)};font-weight:700">${E(x.name)}</span></td>
        <td>${x.agent_count}</td><td>${x.sales_count}</td>
        <td>$${N(x.total_revenue)}</td><td>$${N(x.total_commission)}</td>
        <td>$${N(x.avg_revenue_per_agent)}</td>
    </tr>`).join('');
}
