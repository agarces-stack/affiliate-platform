async function loadGroups(){
    const groups=await api('/api/groups');
    document.querySelector('#groupTable tbody').innerHTML=groups.map(x=>`<tr>
        <td><span style="color:${E(x.color)};font-weight:700">${E(x.name)}</span></td>
        <td>${x.member_count}</td>
        <td>${E(x.manager_name||x.manager_email||'-')}</td>
        <td>${N(x.default_commission_percent)}%</td>
        <td>$${N(x.default_commission_fixed)}</td>
        <td>${E(x.manager_commission_type)} ${N(x.manager_commission_value)}${x.manager_commission_type==='fixed'?'$':'%'}</td>
        <td><button class="btn btn-blue" onclick="showEditGroupModal(${x.id})">Edit</button> <button class="btn btn-gray" onclick="showGroupMembers(${x.id},'${E(x.name)}')">Members</button></td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;color:#64748b">No groups yet</td></tr>';
}
function showAddGroupModal(){
    openModal(`<h2>Create Commission Group</h2>
        <label>Name</label><input id="gr_name" placeholder="VIP Agents">
        <label>Color</label><input id="gr_color" type="color" value="#3b82f6">
        <label>Default Commission %</label><input id="gr_pct" type="number" value="0" step="0.01">
        <label>Default Commission Fixed $</label><input id="gr_fix" type="number" value="0" step="0.01">
        <label>Manager Affiliate ID (optional)</label><input id="gr_mgr" type="number" placeholder="Leave empty for no manager">
        <label>Manager Commission Type</label><select id="gr_mtype"><option value="commission_based">% of affiliate commission</option><option value="fixed">Fixed per sale</option><option value="amount_based">% of sale amount</option><option value="split">Split from affiliate commission</option></select>
        <label>Manager Commission Value</label><input id="gr_mval" type="number" value="0" step="0.01">
        <div class="modal-actions"><button class="btn btn-blue" onclick="createGroup()">Create</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`);
}
async function createGroup(){
    await api('/api/groups',{method:'POST',body:JSON.stringify({name:document.getElementById('gr_name').value,color:document.getElementById('gr_color').value,default_commission_percent:parseFloat(document.getElementById('gr_pct').value)||0,default_commission_fixed:parseFloat(document.getElementById('gr_fix').value)||0,manager_id:parseInt(document.getElementById('gr_mgr').value)||null,manager_commission_type:document.getElementById('gr_mtype').value,manager_commission_value:parseFloat(document.getElementById('gr_mval').value)||0})});
    closeModal();loadGroups();
}
async function showGroupMembers(gid,name){
    const d=await api('/api/groups/'+gid);
    const members=d.members||[];
    openModal(`<h2>${name} - Members</h2>
        <div style="margin-bottom:15px"><input id="grm_add" type="number" placeholder="Affiliate ID" style="padding:8px;border:1px solid #334155;border-radius:6px;background:#0f172a;color:#e2e8f0;width:120px"> <button class="btn btn-blue" onclick="addGroupMember(${gid})">Add</button></div>
        <div>${members.map(m=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #0f172a"><span>${E(m.first_name||'')} ${E(m.last_name||'')} <span style="color:#64748b">${E(m.email)}</span></span><button class="btn btn-red" style="padding:2px 8px;font-size:11px" onclick="removeGroupMember(${gid},${m.id},'${E(name)}')">Remove</button></div>`).join('')||'<p style="color:#64748b">No members</p>'}</div>`);
}
async function addGroupMember(gid){const id=parseInt(document.getElementById('grm_add').value);if(!id)return;await api('/api/groups/'+gid+'/members',{method:'POST',body:JSON.stringify({affiliate_ids:[id]})});closeModal();loadGroups()}
async function removeGroupMember(gid,affId,name){await api('/api/groups/'+gid+'/members/'+affId,{method:'DELETE'});showGroupMembers(gid,name)}
async function showEditGroupModal(gid){const d=await api('/api/groups/'+gid);openModal(`<h2>Edit: ${E(d.name)}</h2>
    <label>Name</label><input id="gre_name" value="${E(d.name)}">
    <label>Default Commission %</label><input id="gre_pct" type="number" value="${d.default_commission_percent||0}" step="0.01">
    <label>Default Commission $</label><input id="gre_fix" type="number" value="${d.default_commission_fixed||0}" step="0.01">
    <label>Manager ID</label><input id="gre_mgr" type="number" value="${d.manager_id||''}">
    <label>Manager Commission Type</label><select id="gre_mtype"><option value="commission_based" ${d.manager_commission_type==='commission_based'?'selected':''}>% of affiliate commission</option><option value="fixed" ${d.manager_commission_type==='fixed'?'selected':''}>Fixed per sale</option><option value="amount_based" ${d.manager_commission_type==='amount_based'?'selected':''}>% of sale amount</option><option value="split" ${d.manager_commission_type==='split'?'selected':''}>Split from affiliate</option></select>
    <label>Manager Commission Value</label><input id="gre_mval" type="number" value="${d.manager_commission_value||0}" step="0.01">
    <label>Active</label><select id="gre_active"><option value="true" ${d.is_active?'selected':''}>Yes</option><option value="false" ${!d.is_active?'selected':''}>No</option></select>
    <div class="modal-actions"><button class="btn btn-blue" onclick="updateGroup(${gid})">Save</button><button class="btn btn-gray" onclick="closeModal()">Cancel</button></div>`)}
async function updateGroup(gid){await api('/api/groups/'+gid,{method:'PUT',body:JSON.stringify({name:document.getElementById('gre_name').value,default_commission_percent:parseFloat(document.getElementById('gre_pct').value)||0,default_commission_fixed:parseFloat(document.getElementById('gre_fix').value)||0,manager_id:parseInt(document.getElementById('gre_mgr').value)||null,manager_commission_type:document.getElementById('gre_mtype').value,manager_commission_value:parseFloat(document.getElementById('gre_mval').value)||0,is_active:document.getElementById('gre_active').value==='true'})});closeModal();loadGroups()}
