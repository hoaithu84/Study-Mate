const sampleTasks=[
{id:1,name:"Bài tập Toán chương 2",subject:"Toán",deadline:"2026-10-09T20:00",priority:"high",done:false},
{id:2,name:"Học Unit 4 - Tiếng Anh",subject:"Tiếng Anh",deadline:"2026-10-11T20:00",priority:"medium",done:false},
{id:3,name:"Đọc trước bài Vợ nhặt",subject:"Ngữ văn",deadline:"2026-10-10T20:00",priority:"high",done:true},
{id:4,name:"Ôn bài 5 - Sinh học",subject:"Sinh học",deadline:"2026-10-13T20:00",priority:"low",done:false}
];
const $=id=>document.getElementById(id);
const CLIENT_ID_KEY="studymate_client_id";
function getClientId(){
 let id=localStorage.getItem(CLIENT_ID_KEY);
 if(!id){id=(crypto.randomUUID?crypto.randomUUID():"sm-"+Date.now()+"-"+Math.random().toString(36).slice(2));localStorage.setItem(CLIENT_ID_KEY,id);}
 return id;
}
const CLIENT_ID=getClientId();
let pushSubscriptionReady=false;
let installPromptEvent=null;
function setPushStatus(message,good=false){const el=$("pushStatus");if(el){el.textContent=message;el.classList.toggle("push-status-good",good);}}
function normalizeTask(t){
  // Keep old tasks created with date-only deadlines usable; assume 23:59 local time.
  if(t.deadline && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline)) t.deadline += "T23:59";
  return {...t, attachment:t.attachment||null};
}
let tasks;
try { tasks=(JSON.parse(localStorage.getItem("studymate_tasks")||"null")||sampleTasks).map(normalizeTask); }
catch { tasks=sampleTasks.map(normalizeTask); }
function save(){
  try { localStorage.setItem("studymate_tasks",JSON.stringify(tasks)); syncTasksToServer(); return true; }
  catch(e){ alert("Không lưu được dữ liệu. File đính kèm có thể quá lớn; hãy thử file nhỏ hơn."); return false; }
}
function todayText(){const d=new Date();return d.toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});}
$("today").textContent=todayText();
function showPage(page){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 $(page).classList.add("active");
 document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
 document.querySelector(`[data-page="${page}"]`).classList.add("active");
 const titles={dashboard:"Tổng quan",tasks:"Bài tập",calendar:"Lịch học",stats:"Tiến độ"};
 $("pageTitle").textContent=titles[page];
 renderAll();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
function deadlineDate(d){ return d ? new Date(d.length===10 ? d+"T23:59" : d) : null; }
function fmt(d){const x=deadlineDate(d);if(!x||Number.isNaN(x.getTime()))return"Chưa đặt";return x.toLocaleString("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function hoursLeft(d){const x=deadlineDate(d);return x?(x.getTime()-Date.now())/3600000:Infinity;}
function daysLeft(d){return Math.ceil(hoursLeft(d)/24);}
function priorityLabel(p){return p==="high"?"Cao":p==="medium"?"Vừa":"Thấp";}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function attachmentHTML(t){
 if(!t.attachment || !t.attachment.data) return "";
 return `<div class="attachment-line">📎 <a href="${t.attachment.data}" download="${escapeHtml(t.attachment.name)}">${escapeHtml(t.attachment.name)}</a> <span class="muted">(${(t.attachment.size/1024).toFixed(0)} KB)</span></div>`;
}
function taskHTML(t){
 return `<div class="task"><div class="check ${t.done?"done":""}" onclick="toggleDone(${t.id})" role="button" tabindex="0" aria-label="Đánh dấu hoàn thành">${t.done?"✓":""}</div>
 <div class="task-info"><div class="task-name ${t.done?"done-text":""}">${escapeHtml(t.name)}</div>
 <div class="meta">${escapeHtml(t.subject)} · Deadline: ${fmt(t.deadline)}</div>${attachmentHTML(t)}</div>
 <span class="badge ${t.priority}">${priorityLabel(t.priority)}</span>
 <button class="text-btn" onclick="removeTask(${t.id})">Xóa</button></div>`;
}
function renderDashboard(){
 const total=tasks.length,done=tasks.filter(t=>t.done).length,pending=total-done,high=tasks.filter(t=>!t.done&&t.priority==="high").length;
 $("totalCount").textContent=total;$("doneCount").textContent=done;$("pendingCount").textContent=pending;$("highCount").textContent=high;
 const rate=total?Math.round(done/total*100):0;
 $("progressPercent").textContent=rate+"%";$("progressText").textContent=`${done}/${total} nhiệm vụ hoàn thành`;
 const deg=rate*3.6;document.querySelector(".progress-circle").style.background=`conic-gradient(#4355d9 ${deg}deg,#edf0f5 ${deg}deg)`;
 const urgent=tasks.filter(t=>!t.done&&hoursLeft(t.deadline)<=12&&hoursLeft(t.deadline)>0);
 const overdue=tasks.filter(t=>!t.done&&hoursLeft(t.deadline)<=0);
 let warning="";
 if(overdue.length) warning+=`<div class="warning overdue">⏰ <b>${overdue.length} nhiệm vụ đã quá deadline.</b> Hãy kiểm tra và cập nhật tiến độ.</div>`;
 if(urgent.length) warning+=`<div class="warning">🔔 <b>${urgent.length} nhiệm vụ sẽ đến hạn trong 12 giờ tới!</b> Hãy ưu tiên hoàn thành.</div>`;
 $("warningBox").innerHTML=warning;
 const upcoming=[...tasks].filter(t=>!t.done).sort((a,b)=>deadlineDate(a.deadline)-deadlineDate(b.deadline)).slice(0,5);
 $("dashboardTasks").innerHTML=upcoming.length?upcoming.map(taskHTML).join(""):`<div class="empty">🎉 Không còn nhiệm vụ chưa hoàn thành.</div>`;
}
function renderTasks(){
 let arr=[...tasks];const q=($("search").value||"").toLowerCase(),f=$("filter").value;
 if(q)arr=arr.filter(t=>(t.name+t.subject).toLowerCase().includes(q));
 if(f==="pending")arr=arr.filter(t=>!t.done);if(f==="done")arr=arr.filter(t=>t.done);if(f==="high")arr=arr.filter(t=>t.priority==="high");
 arr.sort((a,b)=>deadlineDate(a.deadline)-deadlineDate(b.deadline));
 $("taskList").innerHTML=arr.length?arr.map(taskHTML).join(""):`<div class="empty">Không tìm thấy nhiệm vụ phù hợp.</div>`;
}
function renderCalendar(){
 const arr=[...tasks].sort((a,b)=>deadlineDate(a.deadline)-deadlineDate(b.deadline));
 $("calendarList").innerHTML=arr.length?arr.map(t=>`<div class="calendar-item"><div class="date">${fmt(t.deadline)}</div><div><b class="${t.done?"done-text":""}">${escapeHtml(t.name)}</b><div class="meta">${escapeHtml(t.subject)} · ${t.done?"Đã hoàn thành":hoursLeft(t.deadline)<=0?"Đã quá hạn":"Còn "+Math.max(0,daysLeft(t.deadline))+" ngày"}</div>${attachmentHTML(t)}</div><span class="badge ${t.priority}">${priorityLabel(t.priority)}</span></div>`).join(""):`<div class="empty">Chưa có nhiệm vụ.</div>`;
}
function renderStats(){
 const total=tasks.length,done=tasks.filter(t=>t.done).length,pending=total-done,rate=total?Math.round(done/total*100):0;
 const overdue=tasks.filter(t=>!t.done&&hoursLeft(t.deadline)<=0).length;
 $("statRate").textContent=rate+"%";$("statHigh").textContent=tasks.filter(t=>t.priority==="high"&&!t.done).length;
 $("chartRate").textContent=rate+"%";$("chartDone").textContent=done;$("chartPending").textContent=pending;$("chartOverdue").textContent=overdue;
 const doneAngle=total?done/total*360:0;$("statusDonut").style.background=`conic-gradient(#4355d9 0deg ${doneAngle}deg,#e9edf5 ${doneAngle}deg 360deg)`;
 const subjects={};tasks.forEach(t=>{subjects[t.subject]??={total:0,done:0,overdue:0};subjects[t.subject].total++;if(t.done)subjects[t.subject].done++;else if(hoursLeft(t.deadline)<=0)subjects[t.subject].overdue++;});
 const max=Math.max(1,...Object.values(subjects).map(x=>x.total));
 $("subjectStats").innerHTML=Object.entries(subjects).sort((a,b)=>a[0].localeCompare(b[0],"vi")).map(([subject,v])=>{const donePct=v.done/v.total*100,overduePct=v.overdue/v.total*100;return `<div class="subject-progress"><div class="subject-progress-head"><b>${escapeHtml(subject)}</b><span>${v.done}/${v.total} hoàn thành</span></div><div class="stacked-bar" role="img" aria-label="${escapeHtml(subject)}: ${v.done} hoàn thành, ${v.total-v.done} chưa hoàn thành"><i class="bar-done" style="width:${donePct}%"></i><i class="bar-overdue" style="width:${overduePct}%"></i></div></div>`;}).join("")||`<div class="empty">Thêm nhiệm vụ để xem biểu đồ tiến độ.</div>`;
}
function renderAll(){renderDashboard();renderTasks();renderCalendar();renderStats();}
function toggleDone(id){const t=tasks.find(x=>x.id===id);if(t){t.done=!t.done;save();renderAll();}}
function removeTask(id){if(confirm("Bạn có chắc muốn xóa nhiệm vụ này?")){tasks=tasks.filter(t=>t.id!==id);save();renderAll();}}
function localDateTimeValue(date){const pad=n=>String(n).padStart(2,"0");return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;}
function openModal(){ $("modal").classList.add("show"); const due=new Date();due.setHours(23,59,0,0);$("deadline").value=localDateTimeValue(due); }
function closeModal(){$("modal").classList.remove("show");}
function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Không đọc được file"));reader.readAsDataURL(file);});}
$("taskForm").onsubmit=async e=>{
 e.preventDefault();
 const file=$("taskFile").files[0];
 if(file && file.size>1.5*1024*1024){alert("File quá lớn. Vui lòng chọn file nhỏ hơn 1,5 MB để website lưu ổn định.");return;}
 const task={id:Date.now(),name:$("taskName").value.trim(),subject:$("subject").value,deadline:$("deadline").value,priority:$("priority").value,done:false,attachment:null};
 if(file){try{task.attachment={name:file.name,type:file.type||"application/octet-stream",size:file.size,data:await readFileAsDataURL(file)};}catch{alert("Không đọc được file đính kèm.");return;}}
 tasks.push(task);
 if(!save()){tasks=tasks.filter(t=>t.id!==task.id);return;}
 e.target.reset();closeModal();renderAll();
};
window.onclick=e=>{if(e.target===$("modal"))closeModal();};
const REMINDER_SETTING_KEY="studymate_reminder_offset_minutes";
function getReminderMinutes(){
 const choice=$("reminderOffset").value;
 if(choice==="custom"){
  const hours=Number($("customReminderHours").value);
  if(!Number.isFinite(hours)||hours<0.25||hours>168){
   alert("Vui lòng chọn thời gian tùy chỉnh từ 0,25 đến 168 giờ.");
   $("customReminderHours").value="12";
   return 720;
  }
  return Math.round(hours*60);
 }
 return Number(choice)||720;
}
function reminderLabel(minutes){
 if(minutes<60)return `${minutes} phút`;
 if(minutes%1440===0)return `${minutes/1440} ngày`;
 if(minutes%60===0)return `${minutes/60} giờ`;
 return `${Math.floor(minutes/60)} giờ ${minutes%60} phút`;
}
function updateReminderSetting(){
 const minutes=getReminderMinutes();
 try{localStorage.setItem(REMINDER_SETTING_KEY,String(minutes));}catch{}
 $("customReminderWrap").hidden=$("reminderOffset").value!=="custom";
 const button=$("enableNotifications");
 if(button)button.title=`Nhắc trước deadline ${reminderLabel(minutes)}`;
}
function loadReminderSetting(){
 let saved=720;
 try{saved=Number(localStorage.getItem(REMINDER_SETTING_KEY))||720;}catch{}
 const presets=[30,60,180,360,720,1440];
 if(presets.includes(saved))$("reminderOffset").value=String(saved);
 else{$("reminderOffset").value="custom";$("customReminderHours").value=String(saved/60);}
 $("customReminderWrap").hidden=$("reminderOffset").value!=="custom";
}
$("reminderOffset").addEventListener("change",()=>{updateReminderSetting();checkDeadlineReminders();});
$("customReminderHours").addEventListener("change",()=>{updateReminderSetting();checkDeadlineReminders();});
loadReminderSetting();
updateReminderSetting();

function urlBase64ToUint8Array(base64String){
 const padding="=".repeat((4-base64String.length%4)%4);
 const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(base64);const output=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)output[i]=raw.charCodeAt(i);
 return output;
}
async function syncTasksToServer(){
 if(!navigator.onLine)return;
 try{
  const tasksForServer=tasks.map(t=>({
   id:t.id,name:t.name,subject:t.subject,deadlineEpoch:deadlineDate(t.deadline)?.getTime(),
   deadlineLabel:fmt(t.deadline),reminderMinutes:getReminderMinutes(),done:t.done
  })).filter(t=>Number.isFinite(t.deadlineEpoch));
  const response=await fetch("/api/tasks/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:CLIENT_ID,tasks:tasksForServer})});
  if(response.ok){if(pushSubscriptionReady)setPushStatus("Thông báo nền: đã kết nối",true);}
 }catch(_){setPushStatus("Chưa kết nối máy chủ thông báo");}
}
async function enableNotifications(){
 if(!("Notification" in window)){alert("Trình duyệt này không hỗ trợ thông báo. Bạn vẫn có thể xem cảnh báo trên trang Tổng quan.");return;}
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){alert("Trình duyệt chưa hỗ trợ Push API. Hãy dùng phiên bản Chrome hoặc Edge mới trên HTTPS.");return;}
 try{
  const configResponse=await fetch("/api/config");
  if(!configResponse.ok)throw new Error("Không lấy được cấu hình máy chủ");
  const config=await configResponse.json();
  if(!config.pushEnabled||!config.vapidPublicKey){
   alert("Máy chủ chưa cấu hình dịch vụ thông báo đẩy. Nếu đang chạy bản dự án trên máy tính, hãy chạy npm install rồi npm run setup và npm start. Nếu đã đưa lên mạng, hãy cấu hình VAPID trên máy chủ.");
   setPushStatus("Máy chủ chưa cấu hình push");return;
  }
  const permission=await Notification.requestPermission();
  if(permission!=="granted"){alert("Bạn chưa cấp quyền thông báo. Hãy cho phép thông báo trong cài đặt trình duyệt.");return;}
  const registration=await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription){subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(config.vapidPublicKey)});}
  const response=await fetch("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:CLIENT_ID,subscription})});
  if(!response.ok){const err=await response.json().catch(()=>({}));throw new Error(err.error||"Không lưu được đăng ký thông báo");}
  pushSubscriptionReady=true;
  localStorage.setItem("studymate_push_enabled","1");
  $("enableNotifications").textContent="🔔 Đã bật thông báo nền";
  $("testPushBtn").hidden=false;
  setPushStatus("Thông báo nền: đã bật",true);
  await syncTasksToServer();
  alert("Đã bật thông báo nền cho StudyMate! Máy chủ sẽ kiểm tra deadline định kỳ. Hãy giữ máy chủ hoạt động và thử nghiệm một deadline gần để xác nhận.");
 }catch(err){
  console.error(err);
  setPushStatus("Chưa bật được thông báo nền");
  alert("Chưa bật được thông báo nền. Hãy kiểm tra website đã chạy trên HTTPS/localhost, máy chủ đang hoạt động và VAPID đã được cấu hình. Chi tiết: "+(err.message||"lỗi không xác định"));
 }
}
async function testPushNotification(){
 try{
  const response=await fetch("/api/push/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId:CLIENT_ID})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Không gửi được thông báo thử");
  alert("Máy chủ đã nhận yêu cầu gửi thông báo thử. Hãy kiểm tra thông báo của trình duyệt/thiết bị.");
 }catch(err){alert("Chưa gửi được thông báo thử: "+(err.message||"lỗi kết nối"));}
}
async function installStudyMate(){
 if(!installPromptEvent)return;
 installPromptEvent.prompt();
 await installPromptEvent.userChoice;
 installPromptEvent=null;
 $("installAppBtn").hidden=true;
}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPromptEvent=event;$("installAppBtn").hidden=false;});
window.addEventListener("appinstalled",()=>{setPushStatus("StudyMate đã được cài đặt",true);$("installAppBtn").hidden=true;});
function checkDeadlineReminders(){
 if(localStorage.getItem("studymate_push_enabled")==="1")return;
 if(!( "Notification" in window) || Notification.permission!=="granted")return;
 const now=Date.now();
 tasks.forEach(t=>{
  if(t.done||!t.deadline)return;
  const due=deadlineDate(t.deadline),ms=due.getTime()-now;
  const offset=getReminderMinutes()*60*1000;
  const key=`studymate_reminded_${t.id}_${t.deadline}_${getReminderMinutes()}`;
  if(ms>0&&ms<=offset&&!localStorage.getItem(key)){
   try{new Notification("StudyMate: Deadline sắp đến",{body:`“${t.name}” (${t.subject}) đến hạn lúc ${fmt(t.deadline)}.`});localStorage.setItem(key,"1");}catch{}
  }
 });
}
if(localStorage.getItem("studymate_push_enabled")==="1"){
 pushSubscriptionReady=true;
 $("enableNotifications").textContent="🔔 Đã bật thông báo nền";
 $("testPushBtn").hidden=false;
 setPushStatus("Đang kiểm tra thông báo nền…");
}else if("Notification" in window && Notification.permission==="granted"){
 $("enableNotifications").textContent="🔔 Bật thông báo nền";
}
fetch("/api/health").then(r=>r.ok?r.json():null).then(data=>{
 if(data&&data.pushEnabled){if(pushSubscriptionReady)setPushStatus("Thông báo nền: đã bật",true);else setPushStatus("Máy chủ sẵn sàng — hãy bật thông báo",true);}
 else if(data)setPushStatus("Máy chủ chạy, chưa cấu hình push");
}).catch(()=>setPushStatus("Chưa kết nối máy chủ thông báo"));
const feedbackLabels={idea:"Ý tưởng cải tiến",bug:"Báo lỗi",good:"Điểm mình thích"};
async function loadFeedback(){
 const list=$("feedbackList");
 try{const r=await fetch("/api/feedback");if(!r.ok)throw new Error("Không tải được");const data=await r.json();
 list.innerHTML=data.items.length?data.items.map(item=>`<div class="feedback-item"><span class="feedback-type">${escapeHtml(feedbackLabels[item.type]||"Góp ý")}</span><p>${escapeHtml(item.message)}</p><small>${escapeHtml(item.createdAt||"")}</small></div>`).join(""):`<p class="muted">Chưa có góp ý nào. Bạn có thể là người đầu tiên!</p>`;
 }catch{list.innerHTML=`<p class="muted">Phần góp ý dùng được khi website đã chạy trên máy chủ. Bạn vẫn có thể thử các chức năng quản lý nhiệm vụ.</p>`;}
}
$("feedbackForm").addEventListener("submit",async e=>{e.preventDefault();const message=$("feedbackMessage").value.trim();if(!message)return;const status=$("feedbackStatus");status.textContent="Đang gửi…";
 try{const r=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:$("feedbackType").value,message})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Gửi thất bại");$("feedbackMessage").value="";status.textContent="Cảm ơn bạn! Góp ý đã được ghi nhận.";await loadFeedback();}
 catch(err){status.textContent="Chưa gửi được: "+err.message+". Hãy kiểm tra kết nối máy chủ.";}
});
loadFeedback();
renderAll();
syncTasksToServer();
checkDeadlineReminders();
setInterval(()=>{checkDeadlineReminders();renderDashboard();syncTasksToServer();},60*1000);
