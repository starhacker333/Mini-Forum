// Простая client-side логика: users, topics, comments, contacts сохраняются в localStorage
const LS = {
  users: 'mini_users',
  current: 'mini_current',
  topics: 'mini_topics',
  contacts: 'mini_contacts'
};

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8) }

// ---- helpers to store/read
function read(key){ return JSON.parse(localStorage.getItem(key) || '[]') }
function write(key,val){ localStorage.setItem(key, JSON.stringify(val)) }

// ---- init sample data if empty
if(read(LS.topics).length === 0){
  const demo = [
    { id: uid(), title:'Советы по сессии', body:'Как лучше готовиться к экзаменам?', tag:'Учёба', author:'Алия', authorEmail:'alia@mail', created:Date.now(), likes:12, comments:[] },
    { id: uid(), title:'Где взять идеи для курсовой?', body:'Поделитесь темами и источниками', tag:'Диплом', author:'Ермек', authorEmail:'erm@mail', created:Date.now(), likes:7, comments:[] }
  ];
  write(LS.topics, demo);
}

// ---- UI refs
const pages = {
  home: document.getElementById('home'),
  newTopic: document.getElementById('new-topic'),
  profile: document.getElementById('profile'),
  contacts: document.getElementById('contacts'),
  topicView: document.getElementById('topic-view')
};
const feedEl = document.getElementById('feed');
const userDisplay = document.getElementById('user-display');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const modal = document.getElementById('modal');
const loginForm = document.getElementById('login-form');

// navigation
document.getElementById('btn-home').onclick = ()=>show('home');
document.getElementById('btn-new').onclick = ()=>{ if(!getCurrent()){alert('Войдите чтобы создавать темы'); return } show('newTopic'); }
document.getElementById('btn-profile').onclick = ()=>{ if(!getCurrent()){alert('Войдите чтобы просмотреть профиль'); return } renderProfile(); show('profile'); }
document.getElementById('btn-contacts').onclick = ()=>show('contacts');
document.getElementById('quick-create').onclick = ()=>{ if(!getCurrent()){alert('Войдите чтобы создавать темы'); return } show('newTopic'); }
document.getElementById('cancel-new').onclick = ()=>show('home');

// login modal
btnLogin.onclick = ()=>{ modal.style.display='flex'; document.getElementById('login-name').focus() }
document.getElementById('modal-close').onclick = ()=>modal.style.display='none';
btnLogout.onclick = ()=>{ localStorage.removeItem(LS.current); updateAuthUI(); show('home') }

// login form handler
loginForm.onsubmit = (e)=>{
  e.preventDefault();
  const name = document.getElementById('login-name').value.trim();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  if(!name || !email) return alert('Заполните поля');
  let users = read(LS.users);
  let user = users.find(u=>u.email === email);
  if(!user){
    user = { id: uid(), name, email, registered: Date.now() };
    users.push(user);
    write(LS.users, users);
  } else {
    user.name = name; // обновим имя
    write(LS.users, users);
  }
  localStorage.setItem(LS.current, JSON.stringify(user));
  modal.style.display='none';
  loginForm.reset();
  updateAuthUI();
  show('home');
};

// topic create
document.getElementById('topic-form').onsubmit = (e)=>{
  e.preventDefault();
  const t = document.getElementById('topic-title').value.trim();
  const b = document.getElementById('topic-body').value.trim();
  const tag = document.getElementById('topic-tag').value.trim();
  if(!t||!b) return alert('Заполните заголовок и текст');
  const cur = getCurrent();
  if(!cur) return alert('Войдите');
  const topics = read(LS.topics);
  const item = { id: uid(), title:t, body:b, tag:tag||'Без тега', author:cur.name, authorEmail:cur.email, created:Date.now(), likes:0, comments:[] };
  topics.unshift(item);
  write(LS.topics, topics);
  document.getElementById('topic-form').reset();
  show('home');
  renderFeed();
};

// render feed
function renderFeed(filter){
  const topics = read(LS.topics).filter(t => {
    if(!filter) return true;
    const q = filter.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q) || (t.tag||'').toLowerCase().includes(q);
  });
  feedEl.innerHTML = '';
  if(topics.length===0){ feedEl.innerHTML = '<p class="note">Тем нет.</p>'; return }
  topics.forEach(t=>{
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `
      <div class="meta">${new Date(t.created).toLocaleString()} · ${t.tag || ''}</div>
      <div class="title">${escapeHtml(t.title)}</div>
      <div class="body">${escapeHtml(truncate(t.body, 220))}</div>
      <div class="meta">Автор: ${escapeHtml(t.author)}</div>
      <div class="actions">
        <button class="small-btn" data-id="${t.id}" data-act="open">Открыть</button>
        <button class="small-btn" data-id="${t.id}" data-act="like">❤️ ${t.likes}</button>
        <button class="small-btn" data-id="${t.id}" data-act="author">Профиль автора</button>
      </div>
    `;
    feedEl.appendChild(card);
  });
}

// event delegation for feed
feedEl.onclick = (e)=>{
  const btn = e.target.closest('button');
  if(!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.act;
  if(act === 'open') openTopic(id);
  if(act === 'like'){ toggleLike(id); renderFeed(); }
  if(act === 'author'){ openAuthorProfile(id); }
};

// open topic
function openTopic(id){
  const topic = read(LS.topics).find(t=>t.id===id);
  if(!topic) return alert('Тема не найдена');
  const el = document.getElementById('topic-content');
  el.innerHTML = `
    <div class="card">
      <div class="meta">${new Date(topic.created).toLocaleString()} · ${topic.tag || ''}</div>
      <div class="title">${escapeHtml(topic.title)}</div>
      <div class="body">${escapeHtml(topic.body)}</div>
      <div class="meta">Автор: ${escapeHtml(topic.author)} · ❤️ ${topic.likes}</div>
    </div>
  `;
  renderComments(topic);
  show('topicView');
  // attach current topic id to forms
  document.getElementById('comment-form').dataset.topic = id;
}

// back button
document.getElementById('back-to-feed').onclick = ()=>show('home');

// comments
document.getElementById('comment-form').onsubmit = (e)=>{
  e.preventDefault();
  const cur = getCurrent();
  if(!cur) { alert('Войдите чтобы комментировать'); return }
  const txt = document.getElementById('comment-text').value.trim();
  if(!txt) return;
  const topicId = e.target.dataset.topic;
  const topics = read(LS.topics);
  const topic = topics.find(t=>t.id===topicId);
  topic.comments.push({ id:uid(), text:txt, author:cur.name, email:cur.email, created:Date.now() });
  write(LS.topics, topics);
  document.getElementById('comment-text').value='';
  renderComments(topic);
};

// render comments
function renderComments(topic){
  const list = document.getElementById('comments-list');
  list.innerHTML = '';
  if(!topic.comments || topic.comments.length===0){ list.innerHTML = '<p class="note">Пока нет комментариев</p>'; return }
  topic.comments.forEach(c=>{
    const d = document.createElement('div'); d.className='card';
    d.style.padding='8px';
    d.innerHTML = `<div class="meta">${new Date(c.created).toLocaleString()} · ${escapeHtml(c.author)}</div>
                   <div>${escapeHtml(c.text)}</div>`;
    list.appendChild(d);
  });
}

// toggle like (simple increment)
function toggleLike(id){
  const topics = read(LS.topics);
  const t = topics.find(x=>x.id===id);
  if(!t) return;
  t.likes = (t.likes||0) + 1;
  write(LS.topics, topics);
}

// open author profile via topic id
function openAuthorProfile(topicId){
  const topics = read(LS.topics);
  const t = topics.find(x=>x.id===topicId);
  if(!t) return;
  const users = read(LS.users);
  const user = users.find(u=>u.email === t.authorEmail) || { name: t.author, email: t.authorEmail || '' };
  show('profile');
  renderProfile(user);
}

// profile render
function renderProfile(userProvided){
  const cur = getCurrent();
  const target = userProvided || cur;
  if(!target){ alert('Нет пользователя'); return }
  const info = document.getElementById('profile-info');
  info.innerHTML = `<div class="card"><div><strong>${escapeHtml(target.name)}</strong></div><div class="meta">${escapeHtml(target.email || '')}</div></div>`;
  // my topics
  const all = read(LS.topics);
  const mine = all.filter(t => t.authorEmail === (cur?cur.email:target.email));
  const list = document.getElementById('my-topics');
  list.innerHTML = '';
  if(mine.length===0) list.innerHTML = '<p class="note">Тем нет</p>';
  mine.forEach(t=>{
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<div class="title">${escapeHtml(t.title)}</div><div class="meta">${new Date(t.created).toLocaleString()}</div>`;
    list.appendChild(el);
  });
  show('profile');
}

// contact form
document.getElementById('contact-form').onsubmit = (e)=>{
  e.preventDefault();
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const msg = document.getElementById('contact-message').value.trim();
  if(!name||!email||!msg) return alert('Заполните все поля');
  const contacts = read(LS.contacts);
  contacts.push({ id:uid(), name, email, msg, created:Date.now() });
  write(LS.contacts, contacts);
  e.target.reset();
  alert('Спасибо! Сообщение сохранено (демо).');
};

// search
document.getElementById('search-btn').onclick = ()=> renderFeed(document.getElementById('search-input').value.trim());
document.getElementById('clear-search').onclick = ()=>{ document.getElementById('search-input').value=''; renderFeed(); }

// small utilities
function show(name){
  Object.values(pages).forEach(p=>p.style.display='none');
  if(name==='home') pages.home.style.display='block';
  if(name==='newTopic') pages.newTopic.style.display='block';
  if(name==='profile') pages.profile.style.display='block';
  if(name==='contacts') pages.contacts.style.display='block';
  if(name==='topicView') pages.topicView.style.display='block';
}
function getCurrent(){ return JSON.parse(localStorage.getItem(LS.current) || 'null') }
function updateAuthUI(){
  const cur = getCurrent();
  if(cur){ userDisplay.textContent = cur.name; btnLogin.style.display='none'; btnLogout.style.display='inline-block'; } 
  else { userDisplay.textContent=''; btnLogin.style.display='inline-block'; btnLogout.style.display='none'; }
}
function truncate(s,n){ return s.length>n ? s.slice(0,n-1)+'…' : s }
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// initial render
updateAuthUI();
renderFeed();
show('home');
