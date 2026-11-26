(() => {
  const $ = id => document.getElementById(id);
  const pages = ["hide","reveal","inspector","prank","learn"];
  let coverImage = null, stegoBlob = null, stegoUrl = null, revealImage = null;

  function setStatus(id, text, good=false) {
    const el=$(id); el.textContent=text; el.style.color=good ? "var(--green)" : "var(--danger)";
  }
  function loadImage(file) {
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read this image."));};
      img.src=url;
    });
  }
  function bytesLabel(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(2)} MB`;
  }
  function setPage(page) {
    pages.forEach(p=>$(`page-${p}`).classList.toggle("active",p===page));
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const titles={hide:"Hide a secret message",reveal:"Reveal a hidden message",inspector:"Image inspector",prank:"Prank lab",learn:"How SecretPixel works"};
    $("page-title").textContent=titles[page];
  }
  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.page)));

  function refreshEncodeReady() {
    $("encode-btn").disabled=!(coverImage && $("secret-text").value.trim());
    $("char-count").textContent=`${$("secret-text").value.length.toLocaleString()} / 10,000`;
  }
  $("secret-text").addEventListener("input",refreshEncodeReady);
  $("encrypt-toggle").addEventListener("change",()=>{
    $("password-fields").classList.toggle("hidden",!$("encrypt-toggle").checked);
  });
  $("cover-file").addEventListener("change",async e=>{
    const file=e.target.files[0]; if(!file)return;
    try {
      coverImage=await loadImage(file);
      $("cover-preview").src=coverImage.src; $("cover-name").textContent=file.name;
      $("cover-dimensions").textContent=`${coverImage.width} × ${coverImage.height}`;
      $("cover-preview-wrap").classList.remove("hidden");
      const cap=SPXStego.capacityBytes(coverImage.width,coverImage.height);
      $("capacity-value").textContent=`~${bytesLabel(cap)}`;
      $("capacity-bar").style.width="100%";
      $("encode-status").textContent="";
      refreshEncodeReady();
    } catch(err){setStatus("encode-status",err.message);}
  });
  $("remove-cover").addEventListener("click",()=>{
    coverImage=null; $("cover-file").value=""; $("cover-preview-wrap").classList.add("hidden");
    $("capacity-value").textContent="Choose an image"; $("capacity-bar").style.width="0"; refreshEncodeReady();
  });

  $("encode-btn").addEventListener("click",async()=>{
    const message=$("secret-text").value;
    const useEncryption=$("encrypt-toggle").checked;
    const password=$("hide-password").value;
    if(!coverImage || !message.trim()) return;
    if(useEncryption && password.length<8){setStatus("encode-status","Use a password with at least 8 characters.");return;}
    if(useEncryption && password!==$("hide-password-confirm").value){setStatus("encode-status","The passwords do not match.");return;}
    $("encode-btn").disabled=true; setStatus("encode-status","Embedding message…",true);
    try {
      let payload=new TextEncoder().encode(message);
      if(useEncryption) payload=await SPXCrypto.encrypt(message,password);
      const canvas=document.createElement("canvas"); canvas.width=coverImage.width; canvas.height=coverImage.height;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});
      ctx.drawImage(coverImage,0,0);
      const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
      SPXStego.embed(imageData,payload,useEncryption);
      ctx.putImageData(imageData,0,0);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
      if(!blob) throw new Error("Could not create PNG output.");
      if(stegoUrl) URL.revokeObjectURL(stegoUrl);
      stegoBlob=blob; stegoUrl=URL.createObjectURL(blob);
      $("encode-result-detail").textContent=`${bytesLabel(blob.size)} PNG · ${useEncryption?"AES-GCM protected":"Unencrypted message"} · Ready to share`;
      $("encode-result").classList.remove("hidden");
      setStatus("encode-status","Message embedded successfully.",true);
    } catch(err){setStatus("encode-status",err.message || "Encoding failed.");}
    finally{refreshEncodeReady();}
  });
  $("download-stego").addEventListener("click",()=>{
    if(!stegoUrl)return;
    const a=document.createElement("a"); a.href=stegoUrl; a.download="secretpixel-hidden-message.png"; a.click();
  });

  $("stego-file").addEventListener("change",async e=>{
    const file=e.target.files[0]; if(!file)return;
    try {
      revealImage=await loadImage(file);
      $("stego-preview").src=revealImage.src; $("stego-name").textContent=file.name;
      $("stego-dimensions").textContent=`${revealImage.width} × ${revealImage.height}`;
      $("stego-preview-wrap").classList.remove("hidden");
      $("decode-btn").disabled=false; $("revealed-box").classList.add("hidden");
      $("decode-status").textContent="";
    } catch(err){setStatus("decode-status",err.message);}
  });
  $("decode-btn").addEventListener("click",async()=>{
    if(!revealImage)return;
    $("decode-btn").disabled=true; $("revealed-box").classList.add("hidden");
    setStatus("decode-status","Scanning RGB pixel channels…",true);
    try {
      const canvas=document.createElement("canvas"); canvas.width=revealImage.width; canvas.height=revealImage.height;
      const ctx=canvas.getContext("2d",{willReadFrequently:true}); ctx.drawImage(revealImage,0,0);
      const result=SPXStego.extract(ctx.getImageData(0,0,canvas.width,canvas.height));
      let message;
      if(result.encrypted){
        const password=$("reveal-password").value;
        if(!password) { $("reveal-password-wrap").classList.remove("hidden"); throw new Error("This message is password-protected. Enter its password and scan again."); }
        message=await SPXCrypto.decrypt(result.payload,password);
      } else message=new TextDecoder("utf-8",{fatal:true}).decode(result.payload);
      $("revealed-message").textContent=message;
      $("revealed-box").classList.remove("hidden");
      setStatus("decode-status","Secret recovered successfully.",true);
    } catch(err){setStatus("decode-status",err.message || "Could not decode this image.");}
    finally{$("decode-btn").disabled=false;}
  });
  $("copy-message").addEventListener("click",async()=>{
    try {await navigator.clipboard.writeText($("revealed-message").textContent); $("copy-message").textContent="Copied!";}
    catch{$("copy-message").textContent="Select and copy";}
  });

  $("inspect-file").addEventListener("change",async e=>{
    const file=e.target.files[0]; if(!file)return;
    try {
      const img=await loadImage(file);
      $("stat-dimensions").textContent=`${img.width} × ${img.height}`;
      $("stat-size").textContent=bytesLabel(file.size);
      $("stat-format").textContent=file.type || "Unknown";
      $("stat-capacity").textContent=`~${bytesLabel(SPXStego.capacityBytes(img.width,img.height))}`;
      $("inspect-results").classList.remove("hidden"); $("inspect-status").textContent="";
    } catch(err){setStatus("inspect-status",err.message);}
  });

  document.querySelectorAll(".use-prank").forEach(btn=>btn.addEventListener("click",()=>{
    const card=btn.closest(".prank-card");
    $("secret-text").value=card.querySelector("p").textContent;
    refreshEncodeReady(); setPage("hide"); window.scrollTo({top:0,behavior:"smooth"});
  }));
  refreshEncodeReady();
})();
