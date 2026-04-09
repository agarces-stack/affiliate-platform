function exportCSV(type){
    let data,headers,rows;
    if(type==='affiliates'){
        const trs=document.querySelectorAll('#affTable tbody tr');
        let csv='ID,Ref ID,Name,Email,Status,Clicks,Conversions,Balance\n';
        trs.forEach(tr=>{const tds=tr.querySelectorAll('td');if(tds.length>1)csv+=[...tds].map(td=>'"'+td.textContent.trim()+'"').join(',')+'\n'});
        download(csv,'affiliates.csv');
    }
}
function download(content,filename){
    const blob=new Blob([content],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();
}
