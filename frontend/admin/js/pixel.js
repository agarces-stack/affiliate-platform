function setupPixelCodes(){
    const base=API;
    document.getElementById('jsPixelCode').textContent=`<!-- MagnetRaffic Conversion Pixel -->
<script>
(function(){
  var ck=document.cookie.match('_aff_click=([^;]+)');
  var clickId=ck?ck[1]:new URLSearchParams(window.location.search).get('click_id');
  if(clickId){
    var img=new Image();
    img.src='${base}/postback?click_id='+clickId+'&amount=ORDER_AMOUNT&order_id=ORDER_ID&email=CUSTOMER_EMAIL';
  }
})();
<\/script>`;
    document.getElementById('imgPixelCode').textContent=`<!-- MagnetRaffic Image Pixel -->
<img src="${base}/postback?click_id=CLICK_ID&amount=ORDER_AMOUNT&order_id=ORDER_ID" width="1" height="1" style="display:none" />`;
    document.getElementById('s2sCode').textContent=`# Server-to-Server Postback URL
GET ${base}/postback?click_id={click_id}&campaign_id={campaign_id}&amount={amount}&order_id={order_id}&email={email}&first_name={name}

# With ref_id instead of click_id
GET ${base}/postback?ref_id={affiliate_ref_id}&campaign_id={campaign_id}&amount={amount}&order_id={order_id}

# With coupon
GET ${base}/postback?coupon={coupon_code}&amount={amount}&order_id={order_id}`;
    document.getElementById('landingCode').textContent=`<!-- Add to your landing page to capture click_id -->
<script>
(function(){
  var params=new URLSearchParams(window.location.search);
  var clickId=params.get('click_id');
  var refId=params.get('ref_id');
  if(clickId)document.cookie='_aff_click='+clickId+';path=/;max-age=2592000';
  if(refId)document.cookie='_aff_ref='+refId+';path=/;max-age=2592000';
})();
<\/script>`;
}
function copyPixel(type){
    const el=document.getElementById(type==='js'?'jsPixelCode':type==='img'?'imgPixelCode':type==='s2s'?'s2sCode':'landingCode');
    navigator.clipboard.writeText(el.textContent);toast('Copied!','success');
}

