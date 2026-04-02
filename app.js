// Progress Management Task Management App - Main Logic (Firebase Integration)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBZSnVIkelHJcAifnof8hO3ix4I0yL1x7U",
  authDomain: "medapp-schedule.firebaseapp.com",
  projectId: "medapp-schedule",
  storageBucket: "medapp-schedule.firebasestorage.app",
  messagingSenderId: "829296961300",
  appId: "1:829296961300:web:8687a8ae12dbd91f3d4401",
  measurementId: "G-DGCW3650M3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USERS = ['ぶらん', 'うどん2', 'may', 'KA'];

const AVATARS = {
    'ぶらん': 'assets/buran.png',
    'うどん2': 'assets/udon2.png',
    'may': 'assets/may.png',
    'KA': 'assets/ka.png'
};

const AVATAR_COLORS = {
    'ぶらん': 'var(--google-red)',
    'うどん2': 'var(--google-blue)',
    'may': 'var(--google-yellow)',
    'KA': 'var(--google-green)'
};

const IDEA_COLORS = [
    'linear-gradient(135deg, #FFF9C4, #FFF59D)', /* Yellow */
    'linear-gradient(135deg, #E8F5E9, #C8E6C9)', /* Green */
    'linear-gradient(135deg, #E3F2FD, #BBDEFB)', /* Blue */
    'linear-gradient(135deg, #FCE4EC, #F8BBD0)'  /* Pinkish Red */
];

const NOTE_STATUSES = {
    'idea': { label: 'アイデア段階', class: 's-idea' },
    'writing': { label: '執筆中', class: 's-writing' },
    'waiting': { label: '公開待ち', class: 's-waiting' },
    'published': { label: '公開済み', class: 's-published' }
};

let filterUserId = null; /* Global user filter */
let tasks = [], notes = [], ideas = [], events = [];
let unsubTasks, unsubNotes, unsubIdeas, unsubEvents;

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    setupEventListeners();
    fetchAllData();
});

function getAvatarHtml(user, size='44px', fontSize='1rem', addClass='') {
    const color = AVATAR_COLORS[user] || 'var(--text-main)';
    return `<div class="user-avatar ${addClass}" data-user="${user}" title="${user}のみを表示" 
                 style="width:${size}; height:${size}; border: 3px solid ${color}; background-image: url('${AVATARS[user]}');" 
                 onclick="window.toggleUserFilter('${user}')"></div>`;
}

function initUI() {
    renderHeaderAvatars();

    const createCheckboxes = (containerId, items) => {
        document.getElementById(containerId).innerHTML = items.map(item => `
            <label style="border-left: 3px solid ${AVATAR_COLORS[item] || '#ccc'}">
                <input type="checkbox" value="${item}"> ${item}
            </label>
        `).join('');
    };
    createCheckboxes('input-task-assignees', USERS);
    createCheckboxes('input-note-assignees', USERS);
    createCheckboxes('input-event-participants', USERS);

    // Render Note Status Buttons in Modal
    document.getElementById('note-status-buttons').innerHTML = Object.keys(NOTE_STATUSES).map(key => `
        <button class="status-btn ${NOTE_STATUSES[key].class}" onclick="window.updateNoteStatus('${key}')">${NOTE_STATUSES[key].label}</button>
    `).join('');
}

function renderHeaderAvatars() {
    const headerUsers = document.getElementById('header-users');
    headerUsers.className = `user-profiles ${filterUserId ? 'filtered' : ''}`;
    headerUsers.innerHTML = USERS.map(user => 
        getAvatarHtml(user, '44px', '1rem', user === filterUserId ? 'active-filter' : '')
    ).join('');
    
    document.getElementById('btn-reset-filter').style.display = filterUserId ? 'block' : 'none';
}

window.toggleUserFilter = (user) => {
    filterUserId = (filterUserId === user) ? null : user;
    renderHeaderAvatars();
    renderAll();
};

document.getElementById('btn-reset-filter').addEventListener('click', () => {
    filterUserId = null;
    renderHeaderAvatars();
    renderAll();
});

// --- Data Fetching ---
function fetchAllData() {
    if (unsubTasks) unsubTasks(); if (unsubNotes) unsubNotes(); if (unsubIdeas) unsubIdeas(); if (unsubEvents) unsubEvents();
    tasks = []; notes = []; ideas = []; events = [];
    
    unsubTasks = onSnapshot(collection(db, 'tasks'), snap => { tasks = snap.docs.map(d => ({id:d.id, ...d.data()})); renderAll(); }, (error) => handleFirebaseError(error));
    unsubNotes = onSnapshot(collection(db, 'notes'), snap => { notes = snap.docs.map(d => ({id:d.id, ...d.data()})); renderAll(); });
    unsubIdeas = onSnapshot(collection(db, 'ideas'), snap => { ideas = snap.docs.map(d => ({id:d.id, ...d.data()})); renderAll(); });
    unsubEvents = onSnapshot(collection(db, 'events'), snap => { events = snap.docs.map(d => ({id:d.id, ...d.data()})); renderAll(); });
}

function handleFirebaseError(error) {
    console.error("Firebase Snapshot Error:", error);
    if (error.code === 'permission-denied') {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; background: #ffebee; color: #c62828; height: 100vh; overflow-y: auto;">
                <h1 style="font-size: 2rem; margin-bottom: 20px;">🚨 データベースへのアクセスが拒否されています</h1>
                <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 20px;">
                    あなたのFirebase (Firestore) の「ルール」がロックされたままであるため、データの読み書きが一切できません。<br>
                    このため、アプリが【モックアップのように見えたり、何も表示されない状態】になっています！
                </p>
                <div style="background: white; padding: 30px; border-radius: 12px; display: inline-block; text-align: left; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 2px solid #c62828;">
                    <h3 style="color: #c62828; margin-top:0;">【これを直すための超簡単３ステップ】</h3>
                    <ol style="line-height: 1.8; font-size: 1.1rem; margin-top: 16px; margin-bottom:20px;">
                        <li><a href="https://console.firebase.google.com/" target="_blank">Firebaseコンソール</a>を開く。</li>
                        <li>「medapp-schedule」を選択し、左メニューから「<b>Firestore Database</b>」を選んで「<b>ルール</b>」タブを開く。</li>
                        <li>以下のコードを貼り付けて「<b>公開</b>」ボタンを押す！</li>
                    </ol>
                    <pre style="background: #f8f9fa; padding: 16px; border-radius: 8px; font-weight: bold; border: 1px solid #dadce0;">
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}</pre>
                    <p style="margin-top: 24px; font-weight: bold; color: #1565c0; font-size: 1.2rem;">✨設定を保存したら、この画面を「F5」キーで再読み込みしてください！✨</p>
                </div>
            </div>
        `;
    }
}

// --- Routing / General Listeners ---
function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            const target = btn.getAttribute('data-target');
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
            if(target === 'view-calendar') renderCalendar();
        });
    });

    const setupModal = (btnId, modalId) => {
        document.getElementById(btnId).addEventListener('click', () => {
            document.getElementById(modalId).classList.add('active');
        });
    };
    
    document.getElementById('btn-add-task').addEventListener('click', () => {
        document.getElementById('form-task').reset();
        document.getElementById('input-task-id').value = "";
        document.getElementById('modal-task-title').innerText = "タスクの追加";
        document.getElementById('modal-task').classList.add('active');
    });

    document.getElementById('btn-add-note').addEventListener('click', () => {
        document.getElementById('form-note').reset();
        document.getElementById('input-note-id').value = "";
        document.getElementById('modal-note-title').innerText = "note記事・アイデアの追加";
        document.getElementById('modal-note').classList.add('active');
    });

    setupModal('btn-add-dev-idea', 'modal-dev-idea');
    
    document.getElementById('btn-add-event').addEventListener('click', () => {
        document.getElementById('form-event').reset();
        document.getElementById('input-event-id').value = "";
        document.getElementById('modal-event-title').innerText = "イベント登録";
        document.getElementById('modal-event').classList.add('active');
    });

    document.querySelectorAll('.btn-close').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('.modal').classList.remove('active'));
    });

    // Auto-fill form if a matching event title is selected from datalist
    document.getElementById('input-event-title').addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const pastEvent = [...events].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).find(ev => ev.title === val);
        if (pastEvent) {
            document.getElementById('input-event-location').value = pastEvent.location || "";
            document.getElementById('input-event-memo').value = pastEvent.memo || "";
            
            const participants = pastEvent.participants || [];
            document.querySelectorAll('#input-event-participants input[type="checkbox"]').forEach(cb => cb.checked = participants.includes(cb.value));
            
            const targets = pastEvent.targets || [];
            document.querySelectorAll('#input-event-targets input[type="checkbox"]').forEach(cb => cb.checked = targets.includes(cb.value));
        }
    });

    document.getElementById('cal-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('cal-next').addEventListener('click', () => changeMonth(1));

    document.getElementById('form-task').addEventListener('submit', handleTaskSubmit);
    document.getElementById('form-note').addEventListener('submit', handleNoteSubmit);
    document.getElementById('form-event').addEventListener('submit', handleEventSubmit);
    document.getElementById('form-dev-idea').addEventListener('submit', handleDevIdeaSubmit);
    document.getElementById('form-dev-idea-edit').addEventListener('submit', handleDevIdeaEditSubmit);
}

// --- Render Logic ---
function renderAll() {
    renderTasks();
    renderNotes();
    renderIdeas();
    renderEventPrep();
    if(document.getElementById('view-calendar').classList.contains('active')) renderCalendar();
    updateEventDataList();
}

function updateEventDataList() {
    const list = document.getElementById('event-names-list');
    if(!list) return;
    const uniqueNames = [...new Set(events.map(e => e.title))];
    list.innerHTML = uniqueNames.map(name => `<option value="${name}">`).join('');
}

// Check Filters
const isRelatedToFilter = (item) => {
    if(!filterUserId) return true;
    if(item.assignees && item.assignees.some(a => (a.userId || a) === filterUserId)) return true;
    if(item.participants && item.participants.includes(filterUserId)) return true;
    return false; // idea & events without participant match
}

function getCategoryLabel(cat) {
    if(cat === 'idea') return '💡 アイデアリスト';
    if(cat === 'note') return '📝 note記事';
    if(cat === 'event') return '🎪 イベント';
    if(cat === 'other') return '📦 その他';
    return '';
}

function renderTasks() {
    const container = document.getElementById('task-list');

    const noteVirtualTasks = notes.filter(n => n.status !== 'idea').map(n => {
        let prefix = '';
        if (n.status === 'writing') prefix = '記事執筆: ';
        else if (n.status === 'waiting') prefix = '記事の公開: ';
        else if (n.status === 'published') prefix = '記事の公開: ';

        return {
            id: `virt_note_${n.id}`,
            isVirtualNote: true,
            originalNoteId: n.id,
            title: `${prefix}${n.title}`,
            category: 'note',
            deadline: n.date,
            assignees: (n.assignees || []).map(userId => ({
                userId,
                isCompleted: n.status === 'published'
            }))
        };
    });

    const combinedTasks = [...tasks, ...noteVirtualTasks];
    const filteredTasks = combinedTasks.filter(t => !filterUserId || t.assignees.some(a => a.userId === filterUserId));
    
    if (filteredTasks.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary); padding: 20px 0;">表示するタスクがありません✨</p>`; return;
    }

    const now = new Date();
    // Sort logic: 1. Incomplete first, 2. Closest deadline first.
    const sortedTasks = [...filteredTasks].sort((a,b) => {
        const aDone = a.assignees.length > 0 && a.assignees.every(as => as.isCompleted);
        const bDone = b.assignees.length > 0 && b.assignees.every(as => as.isCompleted);
        
        if (aDone !== bDone) return aDone ? 1 : -1;
        if (!a.deadline) return 1; if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
    });

    container.innerHTML = sortedTasks.map(task => {
        const isAllCompleted = task.assignees.length > 0 && task.assignees.every(a => a.isCompleted);
        const deadlineDate = new Date(task.deadline).toLocaleDateString('ja-JP');
        const isUrgent = new Date(task.deadline) < now && !isAllCompleted;
        
        return `
            <div class="task-item ${isAllCompleted ? 'all-completed' : ''}" data-id="${task.id}">
                <div class="task-left-actions">
                    ${task.assignees.filter(a => !filterUserId || a.userId === filterUserId).map(a => `
                        <label class="assignee-checkbox-wrap ${a.isCompleted ? 'completed' : ''}" title="${a.userId}の完了チェック" 
                               style="${a.isCompleted ? 'border-color:' + AVATAR_COLORS[a.userId] + ';' : ''}">
                            <input type="checkbox" ${a.isCompleted ? 'checked' : ''} onchange="toggleTaskAssignee('${task.id}', '${a.userId}')">
                            ${getAvatarHtml(a.userId, '24px', '10px')}
                        </label>
                    `).join('')}
                </div>
                <div class="task-info">
                    <div class="task-title-row">
                        ${task.category && task.category !== 'none' ? `<span class="badge-category ${task.category}">${getCategoryLabel(task.category)}</span>` : ''}
                        <h3 class="task-title ${isUrgent ? 'overdue' : ''}">${task.title}</h3>
                    </div>
                    <div class="task-meta">
                        <span class="${isUrgent ? 'urgent' : ''}"><span class="material-icons-outlined" style="font-size:16px;">event</span> 期限: ${deadlineDate} <span class="hide-on-mobile">${isUrgent ? '(直近!!)' : ''}</span></span>
                    </div>
                </div>
                <div class="task-right-actions">
                    ${task.isVirtualNote ? `
                        <button class="icon-btn edit" style="width:28px; height:28px; min-height:28px;" onclick="window.openEditNote(event, '${task.originalNoteId}')" title="noteを編集"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    ` : `
                        <button class="icon-btn edit" style="width:28px; height:28px; min-height:28px;" onclick="window.openEditTask('${task.id}')" title="編集"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                        <button class="icon-btn delete" style="width:28px; height:28px; min-height:28px;" onclick="window.deleteTask('${task.id}')" title="削除"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

window.openEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('input-task-id').value = task.id;
    document.getElementById('input-task-name').value = task.title;
    document.getElementById('input-task-category').value = task.category || "none";
    document.getElementById('input-task-deadline').value = task.deadline || "";
    
    document.querySelectorAll('#input-task-assignees input[type="checkbox"]').forEach(cb => {
        cb.checked = task.assignees.some(a => a.userId === cb.value);
    });
    
    document.getElementById('modal-task-title').innerText = "タスクの編集";
    document.getElementById('modal-task').classList.add('active');
}

window.deleteTask = async (taskId) => {
    if (confirm("このタスクを削除してもよろしいですか？")) {
        try { await deleteDoc(doc(db, 'tasks', taskId)); } catch(err) { console.error(err); }
    }
}

window.toggleTaskAssignee = async (taskId, userId) => {
    if (taskId.startsWith('virt_note_')) {
        const noteId = taskId.replace('virt_note_', '');
        const note = notes.find(n => n.id === noteId);
        if (note) {
            const isCurrentlyCompleted = note.status === 'published';
            const newStatus = isCurrentlyCompleted ? 'waiting' : 'published';
            try { await updateDoc(doc(db, 'notes', noteId), { status: newStatus }); } catch (err) { console.error(err); }
        }
        return;
    }

    const task = tasks.find(t => t.id === taskId);
    if(task) {
        const updatedAssignees = task.assignees.map(a => a.userId === userId ? { ...a, isCompleted: !a.isCompleted } : a);
        try { await updateDoc(doc(db, 'tasks', taskId), { assignees: updatedAssignees }); } 
        catch(e) { console.error(e); }
    }
}

let activeNoteIdForStatus = null;
function renderNotes() {
    const board = document.getElementById('kanban-board');
    board.innerHTML = Object.keys(NOTE_STATUSES).map(statusKey => {
        const statusObj = NOTE_STATUSES[statusKey];
        const colNotes = notes.filter(n => n.status === statusKey && isRelatedToFilter(n));
        const cardsHtml = colNotes.map(note => `
            <div class="kanban-card status-${statusKey}" onclick="window.openNoteStatusModal('${note.id}', '${note.title.replace(/'/g, "\\'")}')">
                <div class="kanban-card-actions">
                    <button class="icon-btn edit" style="width:28px; height:28px; min-height:28px;" onclick="window.openEditNote(event, '${note.id}')" title="編集"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                    <button class="icon-btn delete" style="width:28px; height:28px; min-height:28px;" onclick="window.deleteNote(event, '${note.id}')" title="削除"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                </div>
                <div class="kanban-card-title">${note.title}</div>
                <div class="kanban-card-meta">
                    <span>${note.date ? '投稿: ' + note.date.substring(5) : '日付未定'}</span>
                    <div class="user-profiles" style="transform: scale(0.65); transform-origin: right;">
                        ${(note.assignees || []).map(u => getAvatarHtml(u, '44px', '1rem')).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        return `<div class="kanban-col"><div class="kanban-col-header">${statusObj.label} <span class="badge badge-blue">${colNotes.length}</span></div>${cardsHtml}</div>`;
    }).join('');
}

window.openNoteStatusModal = (noteId, noteTitle) => {
    activeNoteIdForStatus = noteId;
    document.getElementById('status-target-title').innerText = `「${noteTitle}」`;
    document.getElementById('modal-note-status').classList.add('active');
}

window.openEditNote = (e, noteId) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    document.getElementById('input-note-id').value = note.id;
    document.getElementById('input-note-title').value = note.title;
    document.getElementById('input-note-status').value = note.status;
    document.getElementById('input-note-date').value = note.date || "";
    
    const assignees = note.assignees || [];
    document.querySelectorAll('#input-note-assignees input[type="checkbox"]').forEach(cb => {
        cb.checked = assignees.includes(cb.value);
    });
    
    document.getElementById('modal-note-title').innerText = "note記事の編集";
    document.getElementById('modal-note').classList.add('active');
}

window.deleteNote = async (e, noteId) => {
    e.stopPropagation();
    if (confirm("この記事を削除してもよろしいですか？")) {
        try { await deleteDoc(doc(db, 'notes', noteId)); } catch(err) { console.error(err); }
    }
}
window.updateNoteStatus = async (newStatusKey) => {
    if(activeNoteIdForStatus) {
        try { await updateDoc(doc(db, 'notes', activeNoteIdForStatus), { status: newStatusKey }); } catch(e) { console.error(e); }
        document.getElementById('modal-note-status').classList.remove('active');
    }
}

function renderIdeas() {
    const container = document.getElementById('ideas-grid');
    if (ideas.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary); padding: 20px 0;">アイデアはまだありません💡</p>`; return;
    }
    
    // Sort: incomplete first
    const sortedIdeas = [...ideas].sort((a, b) => (a.isCompleted === b.isCompleted) ? 0 : a.isCompleted ? 1 : -1);

    container.innerHTML = sortedIdeas.map((idea, index) => {
        const bg = IDEA_COLORS[index % IDEA_COLORS.length];
        const isDone = idea.isCompleted || false;
        return `
            <div class="idea-card ${isDone ? 'completed' : ''}" style="background: ${isDone ? '#f1f3f4' : bg};">
                <div class="idea-content">${idea.content.replace(/\n/g, '<br>')}</div>
                <div class="idea-actions">
                    <button class="icon-btn complete ${isDone ? 'active' : ''}" onclick="window.toggleIdeaCompletion('${idea.id}')" title="${isDone ? '未完了に戻す' : '完了にする'}">
                        <span class="material-icons-outlined">${isDone ? 'check_circle' : 'radio_button_unchecked'}</span>
                    </button>
                    <button class="icon-btn edit" onclick="window.openEditIdea('${idea.id}')"><span class="material-icons-outlined">edit</span></button>
                    <button class="icon-btn delete" onclick="window.deleteIdea('${idea.id}')"><span class="material-icons-outlined">delete</span></button>
                </div>
            </div>
        `;
    }).join('');
}

window.openEditIdea = (ideaId) => {
    const idea = ideas.find(i => i.id === ideaId);
    if(!idea) return;
    document.getElementById('edit-idea-id').value = idea.id;
    document.getElementById('edit-idea-content').value = idea.content;
    document.getElementById('modal-dev-idea-edit').classList.add('active');
}
window.deleteIdea = async (ideaId) => {
    if(confirm('このアイデア付箋を削除してもよろしいですか？')) {
        try { await deleteDoc(doc(db, 'ideas', ideaId)); } catch(e) { console.error(e); }
    }
}
window.toggleIdeaCompletion = async (ideaId) => {
    const idea = ideas.find(i => i.id === ideaId);
    if(idea) {
        try { await updateDoc(doc(db, 'ideas', ideaId), { isCompleted: !idea.isCompleted }); }
        catch(e) { console.error(e); }
    }
}

let currentCalDate = new Date();
function renderCalendar() {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    document.getElementById('cal-month-title').innerText = `${year}年 ${month + 1}月`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay();
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    ['日', '月', '火', '水', '木', '金', '土'].forEach(day => {
        grid.innerHTML += `<div style="text-align:center; font-weight:700; color:var(--text-secondary); padding:4px 0;">${day}</div>`;
    });
    for(let i=0; i<startDayOfWeek; i++) grid.innerHTML += `<div></div>`;
    
    const today = new Date();
    for(let day=1; day<=daysInMonth; day++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
        
        const dayTasks = tasks.filter(t => t.deadline === dateStr && isRelatedToFilter(t));
        const dayNotes = notes.filter(n => n.date === dateStr && isRelatedToFilter(n));
        const dayEvents = events.filter(e => e.date === dateStr && isRelatedToFilter(e));
        
        let badgesHtml = '';
        
        const renderBadge = (item, type, icon, title, userList, id) => {
            const usersStr = userList && userList.length > 0 ? (Array.isArray(userList) ? userList : userList.map(u => u.userId || u)) : [];
            const avatarsHtml = usersStr.filter(u => !filterUserId || u === filterUserId).map(uid => {
                return getAvatarHtml(uid, '18px', '0', 'cal-avatar');
            }).join('');
            
            let label = title;
            let typeClass = type;
            if(type === 'task') label = 'タスク';
            if(type === 'note') label = 'note';
            if(type === 'custom') { label = 'イベント'; typeClass = 'custom'; }

            return `<div class="cal-event-badge ${typeClass}" title="${title}" onclick="event.stopPropagation(); window.openCalendarDetail('${type}', '${id}')">
                <span style="flex:1; font-size:11px; text-align:left;">${label}</span>
                <div style="display:flex; gap:2px; margin-left:4px;">${avatarsHtml}</div>
            </div>`;
        };
        
        dayTasks.forEach(t => badgesHtml += renderBadge(t, 'task', 'task_alt', t.title, t.assignees, t.id));
        dayNotes.forEach(n => badgesHtml += renderBadge(n, 'note', 'article', n.title, n.assignees, n.id));
        dayEvents.forEach(e => badgesHtml += renderBadge(e, 'custom', 'event', e.title, e.participants, e.id));
        
        const dayDiv = document.createElement('div');
        dayDiv.className = `cal-day ${isToday ? 'today' : ''}`;
        dayDiv.innerHTML = `<div class="cal-day-header" style="text-align:right; font-size:0.85rem; font-weight:700; color:var(--text-secondary); margin-bottom:4px;">${day}</div><div style="flex:1; display:flex; flex-direction:column; gap:2px; overflow-y:auto; overflow-x:hidden;">${badgesHtml}</div>`;
        grid.appendChild(dayDiv);
    }
}
function changeMonth(delta) { currentCalDate.setMonth(currentCalDate.getMonth() + delta); renderCalendar(); }

window.openCalendarDetail = (type, id) => {
    if (type === 'task') window.openEditTask(id);
    else if (type === 'note') window.openEditNote(new Event('click'), id);
    else if (type === 'custom') window.openEditEvent(id);
};

// --- Event Prep Rendering ---
function renderEventPrep() {
    const container = document.getElementById('event-prep-list');
    const filteredEvents = events.filter(e => isRelatedToFilter(e));
    if(filteredEvents.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary); padding: 20px 0;">統合カレンダーから登録されたイベントがありません🎪</p>`; return;
    }
    
    const sortedEvents = filteredEvents.sort((a,b) => {
        if(!a.date) return 1;
        if(!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });
    
    container.innerHTML = sortedEvents.map(ev => {
        const preps = ev.prepTasks || [];
        const completedCount = preps.filter(p => p.done).length;
        const progressPercent = preps.length === 0 ? 0 : Math.round((completedCount / preps.length) * 100);
        
        return `
            <div class="prep-card">
                <div class="prep-header">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                        <h3 style="margin:0;"><span class="material-icons-outlined">event_available</span> ${ev.title} </h3>
                        <span style="font-size:0.9rem; color:var(--text-secondary);"><span class="hide-on-mobile">(${ev.date})</span></span>
                        <button class="icon-btn edit" style="width:28px; height:28px; min-height:28px;" onclick="window.openEditEvent('${ev.id}')" title="イベントを編集"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
                        <button class="icon-btn delete" style="width:28px; height:28px; min-height:28px;" onclick="window.deleteEvent('${ev.id}')" title="イベントを削除"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
                    </div>
                    <div class="prep-progress"><div class="prep-progress-bar" style="width: ${progressPercent}%;"></div></div>
                    <span style="font-weight:700; font-size:1.2rem; min-width:50px; text-align:right;">${progressPercent}%</span>
                </div>
                <div class="prep-tasks">
                    ${preps.map((p, idx) => `
                        <div class="prep-task-item ${p.done ? 'done' : ''}">
                            <label><input type="checkbox" ${p.done?'checked':''} onchange="window.togglePrepTask('${ev.id}', ${idx}, ${p.done})"> ${p.title}</label>
                            <button class="icon-btn delete" style="width:24px; height:24px; min-height:24px;" onclick="window.deletePrepTask('${ev.id}', ${idx})"><span class="material-icons-outlined" style="font-size:14px;">delete</span></button>
                        </div>
                    `).join('')}
                </div>
                <div class="prep-add-row">
                    <input type="text" id="prep-input-${ev.id}" placeholder="新しい準備タスクを追加 (例: 案内メール送信)">
                    <button class="btn btn-primary" onclick="window.addPrepTask('${ev.id}')">追加</button>
                </div>
            </div>
        `;
    }).join('');
}

window.addPrepTask = async (eventId) => {
    const input = document.getElementById(`prep-input-${eventId}`);
    if(!input.value.trim()) return;
    const ev = events.find(e => e.id === eventId);
    if(ev) {
        const newPreps = [...(ev.prepTasks || []), { title: input.value.trim(), done: false }];
        try { await updateDoc(doc(db, 'events', eventId), { prepTasks: newPreps }); } catch(err) { console.error(err); }
    }
}
window.togglePrepTask = async (eventId, index, currentStatus) => {
    const ev = events.find(e => e.id === eventId);
    if(ev) {
        const newPreps = [...ev.prepTasks];
        newPreps[index].done = !currentStatus;
        try { await updateDoc(doc(db, 'events', eventId), { prepTasks: newPreps }); } catch(err) { console.error(err); }
    }
}
window.deletePrepTask = async (eventId, index) => {
    const ev = events.find(e => e.id === eventId);
    if(ev) {
        const newPreps = ev.prepTasks.filter((_, i) => i !== index);
        try { await updateDoc(doc(db, 'events', eventId), { prepTasks: newPreps }); } catch(err) { console.error(err); }
    }
}

window.openEditEvent = (eventId) => {
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    document.getElementById('input-event-id').value = ev.id;
    document.getElementById('input-event-title').value = ev.title;
    document.getElementById('input-event-date').value = ev.date;
    document.getElementById('input-event-location').value = ev.location || "";
    document.getElementById('input-event-memo').value = ev.memo || "";
    
    const participants = ev.participants || [];
    document.querySelectorAll('#input-event-participants input[type="checkbox"]').forEach(cb => cb.checked = participants.includes(cb.value));
    
    const targets = ev.targets || [];
    document.querySelectorAll('#input-event-targets input[type="checkbox"]').forEach(cb => cb.checked = targets.includes(cb.value));

    document.getElementById('modal-event-title').innerText = "イベント編集";
    document.getElementById('modal-event').classList.add('active');
}

window.deleteEvent = async (eventId) => {
    if (confirm("このイベントを削除してもよろしいですか？（準備リストも一緒に消えます）")) {
        try { await deleteDoc(doc(db, 'events', eventId)); } catch(err) { console.error(err); }
    }
}

// --- Forms Submit Handlers ---
async function handleTaskSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('input-task-id').value;
    const title = document.getElementById('input-task-name').value;
    const category = document.getElementById('input-task-category').value;
    const deadline = document.getElementById('input-task-deadline').value;
    const checks = Array.from(document.querySelectorAll('#input-task-assignees input:checked')).map(cb => cb.value);
    
    if(checks.length === 0) return alert('担当者を1人以上選択してください');

    try {
        if (id) {
            const task = tasks.find(t => t.id === id);
            const assignees = checks.map(userId => {
                const existing = task.assignees.find(a => a.userId === userId);
                return existing ? existing : { userId, isCompleted: false };
            });
            await updateDoc(doc(db, 'tasks', id), { title, category, deadline, assignees });
        } else {
            await addDoc(collection(db, 'tasks'), { title, category, deadline, assignees: checks.map(userId => ({ userId, isCompleted: false })), createdAt: new Date().toISOString() });
        }
        document.getElementById('modal-task').classList.remove('active'); e.target.reset();
    } catch(err) { console.error(err); }
}

async function handleNoteSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('input-note-id').value;
    const title = document.getElementById('input-note-title').value;
    const status = document.getElementById('input-note-status').value;
    const date = document.getElementById('input-note-date').value;
    const assignees = Array.from(document.querySelectorAll('#input-note-assignees input:checked')).map(cb => cb.value);

    try {
        if (id) {
            await updateDoc(doc(db, 'notes', id), { title, status, date: date || null, assignees });
        } else {
            await addDoc(collection(db, 'notes'), { title, status, date: date || null, assignees, createdAt: new Date().toISOString() });
        }
        document.getElementById('modal-note').classList.remove('active'); e.target.reset();
    } catch(err) { console.error(err); }
}

async function handleEventSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('input-event-id').value;
    const title = document.getElementById('input-event-title').value;
    const date = document.getElementById('input-event-date').value;
    const location = document.getElementById('input-event-location').value || "";
    const memo = document.getElementById('input-event-memo').value || "";
    const participants = Array.from(document.querySelectorAll('#input-event-participants input:checked')).map(cb => cb.value);
    const targets = Array.from(document.querySelectorAll('#input-event-targets input:checked')).map(cb => cb.value);
    
    try {
        if (id) {
            await updateDoc(doc(db, 'events', id), { title, date, location, memo, participants, targets });
        } else {
            await addDoc(collection(db, 'events'), { title, date, location, memo, participants, targets, prepTasks: [], createdAt: new Date().toISOString() });
        }
        document.getElementById('modal-event').classList.remove('active'); 
        e.target.reset();
        document.getElementById('input-event-id').value = "";
        document.getElementById('modal-event-title').innerText = "イベント登録";
    } catch(err) { console.error(err); }
}

async function handleDevIdeaSubmit(e) {
    e.preventDefault();
    const content = document.getElementById('input-dev-idea-content').value;
    try {
        await addDoc(collection(db, 'ideas'), { content, isCompleted: false, createdAt: new Date().toISOString() });
        document.getElementById('modal-dev-idea').classList.remove('active'); e.target.reset();
    } catch(err) { console.error(err); }
}

async function handleDevIdeaEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-idea-id').value;
    const content = document.getElementById('edit-idea-content').value;
    try {
        await updateDoc(doc(db, 'ideas', id), { content });
        document.getElementById('modal-dev-idea-edit').classList.remove('active');
    } catch(err) { console.error(err); }
}
