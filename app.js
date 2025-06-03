const scheduleList = document.getElementById('schedule-list');
const tabBtns = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');
const roomFilter = document.getElementById('roomFilter');

let sessions = [];
let speakers = {};
let rooms = {};
let currentTab = 'date';
let searchTerm = '';
let selectedRoom = '';
let selectedDate = '';

// 读取JSON数据
document.addEventListener('DOMContentLoaded', () => {
  fetch('data/session_latest_only34.json')
    .then(res => res.json())
    .then(data => {
      // 处理speakers，存储完整对象
      if (Array.isArray(data.speakers)) {
        data.speakers.forEach(s => {
          speakers[s.id] = s; // 保留完整speaker对象
        });
      }
      // 处理rooms
      if (Array.isArray(data.rooms)) {
        data.rooms.forEach(r => {
          rooms[r.id] = r.name;
        });
        // 填充roomFilter下拉框
        const options = ['<option value="">All Rooms</option>'];
        data.rooms.forEach(r => {
          options.push(`<option value="${r.id}">${r.name}</option>`);
        });
        roomFilter.innerHTML = options.join('');
      }
      // 处理sessions
      sessions = Array.isArray(data.sessions) ? data.sessions.filter(session => {
        const date = new Date(session.startsAt);
        const day = date.getDay();
        return day === 3 || day === 4; // 3代表周三，4代表周四
      }) : [];
      renderSchedule();
    });
});

// Tab切换
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    renderSchedule();
  });
});

// 搜索
document.getElementById('searchInput').addEventListener('input', e => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderSchedule();
});

// 会议室筛选
document.getElementById('roomFilter').addEventListener('change', e => {
  selectedRoom = e.target.value;
  renderSchedule();
});

// 日期tab筛选
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.date-tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.date-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDate = btn.dataset.date;
      renderSchedule();
    });
  });
});

function getSessionTheme(session) {
  // categoryItems可能为空，直接返回空或"General"
  if (session.categoryItems && session.categoryItems.length > 0) {
    return session.categoryItems.map(c => c.name || c).join(', ');
  }
  return 'General';
}

function getSessionSpeakers(session) {
  if (!session.speakers || session.speakers.length === 0) return [];
  return session.speakers.map(id => speakers[id] || id);
}

function getSessionRoom(session) {
  return rooms[session.roomId] || '';
}

function getSessionDate(session) {
  // startsAt: "2025-06-03T09:00:00"
  return session.startsAt ? session.startsAt.slice(0, 10) : '';
}

function getSessionTime(session) {
  if (!session.startsAt || !session.endsAt) return '';
  return session.startsAt.slice(11, 16) + ' - ' + session.endsAt.slice(11, 16);
}

function getSessionPeriod(session) {
  if (!session.startsAt) return 'Other';
  const hour = parseInt(session.startsAt.slice(11, 13), 10);
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

function getSpeakerInfo(id) {
  const s = speakers[id];
  if (!s) return { name: id, avatar: '', tagLine: '', profilePicture: '' };
  if (typeof s === 'string') return { name: s, avatar: '', tagLine: '', profilePicture: '' };
  return {
    name: s.fullName || (s.firstName + ' ' + s.lastName),
    avatar: s.profilePicture || '',
    tagLine: s.tagLine || '',
    profilePicture: s.profilePicture || '',
    ...s
  };
}

function renderSchedule() {
  let filtered = sessions.filter(item => {
    if (selectedRoom && String(item.roomId) !== selectedRoom) return false;
    if (currentTab === 'date' && selectedDate && getSessionDate(item) !== selectedDate) return false;
    if (currentTab === 'favorites' && !favoritesManager.isFavorite(item.id)) return false;
    const text = (
      item.title + ' ' +
      getSessionSpeakers(item).join(' ') + ' ' +
      getSessionDate(item) + ' ' +
      (item.description || '')
    ).toLowerCase();
    return text.includes(searchTerm);
  });

  // 全局按时间排序
  filtered.sort((a, b) => (a.startsAt || '').localeCompare(b.startsAt || ''));

  let html = '';
  const defaultAvatar = 'https://ui-avatars.com/api/?name=AI&background=EAF1FB&color=4f8cff&size=40';

  if (currentTab === 'date' || currentTab === 'favorites') {
    // 先按日期分组
    const dateMap = {};
    filtered.forEach(item => {
      const date = getSessionDate(item);
      if (!dateMap[date]) dateMap[date] = [];
      dateMap[date].push(item);
    });

    html += `<div class="schedule-list">`;
    // 日期排序
    const sortedDates = Object.keys(dateMap).sort();
    for (const date of sortedDates) {
      // 按时间排序
      dateMap[date].sort((a, b) => (a.startsAt || '').localeCompare(b.startsAt || ''));
      
      html += dateMap[date].map((item, idx) => {
        const cardId = `card-${date}-${idx}`;
        let speakersHtml = '';
        if (item.speakers && item.speakers.length > 0) {
          speakersHtml = item.speakers.map(sid => {
            const info = getSpeakerInfo(sid);
            return `<span class="speaker-info" data-speaker-id="${sid}"><img class="speaker-avatar" src="${info.avatar || defaultAvatar}" alt="${info.name}">${info.name}</span>`;
          }).join('');
        }
        return `
          <div class="schedule-card" id="${cardId}">
            <div class="schedule-title" data-talk-idx="${item.id}">${item.title}</div>
            <div class="schedule-meta-time">${getSessionDate(item)} | ${getSessionTime(item)}</div>
            <div class="schedule-meta-room"> ${getSessionRoom(item)}</div>
            <div class="schedule-speakers">${speakersHtml}</div>
            <button class="favorite-btn ${favoritesManager.isFavorite(item.id) ? 'active' : ''}" 
                    data-talk-id="${item.id}">
              <i class="fas fa-star"></i>
            </button>
            <div class="schedule-details">
              <div class="schedule-meta"><b>Theme:</b> ${getSessionTheme(item)}</div>
              <div class="schedule-desc"><b>Description:</b> ${item.description ? item.description : ''}</div>
            </div>
          </div>
        `;
      }).join('');
    }
    html += '</div>';
  } else if (currentTab === 'speaker') {
    // 渲染所有speaker详细信息卡片
    const speakerArr = Object.values(speakers).filter(s => s && s.id);
    // 按姓名排序
    speakerArr.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    html += `<div class="schedule-list">`;
    html += speakerArr.map((s, idx) => {
      const avatar = s.profilePicture || 'https://ui-avatars.com/api/?name=AI&background=EAF1FB&color=4f8cff&size=40';
      return `
        <div class="schedule-card" id="speaker-${s.id}">
          <div class="speaker-info"><img class="speaker-avatar" src="${avatar}" alt="${s.fullName || s.firstName + ' ' + s.lastName}" data-speaker-id="${s.id}"></div>
          <div class="schedule-title">${s.fullName || s.firstName + ' ' + s.lastName}</div>
          <div class="schedule-meta">${s.tagLine || ''}</div>
          <div class="schedule-desc">${s.bio ? s.bio.replace(/\n/g, '<br>') : ''}</div>
        </div>
      `;
    }).join('');
    html += '</div>';
  }
  if (!html) html = '<p style="text-align:center;color:#888;">No schedule found.</p>';
  scheduleList.innerHTML = html;

  // 打印时全部展开
  window.onbeforeprint = () => {
    document.querySelectorAll('.schedule-card').forEach(card => {
      card.classList.add('expanded');
    });
  };
  window.onafterprint = () => {
    document.querySelectorAll('.schedule-card').forEach(card => {
      card.classList.remove('expanded');
    });
  };
}

// 事件委托：点击speaker-info弹出模态框
scheduleList.addEventListener('click', function(e) {
  // 收藏按钮点击
  const favoriteBtn = e.target.closest('.favorite-btn');
  if (favoriteBtn && favoriteBtn.dataset.talkId) {
    const talkId = favoriteBtn.dataset.talkId;
    const talk = sessions.find(item => String(item.id) === String(talkId));
    if (talk) {
      if (favoritesManager.isFavorite(talkId)) {
        favoritesManager.removeFavorite(talkId);
      } else {
        favoritesManager.addFavorite(talk);
      }
    }
    return;
  }

  // speaker弹窗
  const speakerEl = e.target.closest('.speaker-info');
  if (speakerEl && speakerEl.dataset.speakerId) {
    showSpeakerModal(speakerEl.dataset.speakerId);
    return;
  }
  // talk弹窗
  const detailBtn = e.target.closest('.schedule-title');
  
  if (detailBtn && detailBtn.dataset.talkIdx) {
    showTalkModal(detailBtn.dataset.talkIdx);
    return;
  }
});

function showSpeakerModal(speakerId) {
  const s = getSpeakerInfo(speakerId);
  const avatar = s.profilePicture || 'https://ui-avatars.com/api/?name=AI&background=EAF1FB&color=4f8cff&size=80';
  const company = s.company || s.organization || s.tagLine || '';
  const html = `
    <div style="text-align:center;">
      <img src="${avatar}" alt="${s.name}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:0.7rem;border:2px solid #eaf1fb;">
      <div style="font-size:1.2rem;font-weight:700;color:#4f8cff;">${s.name}</div>
      <div style="color:#555;margin-bottom:0.5rem;">${company}</div>
      <div style="font-size:0.98rem;color:#333;text-align:left;margin-top:0.7rem;max-height: 300px; overflow-y: auto;">${s.bio ? s.bio.replace(/\n/g, '<br>') : ''}</div>
    </div>
  `;
  document.getElementById('modalSpeakerDetail').innerHTML = html;
  document.getElementById('speakerModal').style.display = 'flex';
}

document.getElementById('modalCloseBtn').onclick = function() {
  document.getElementById('speakerModal').style.display = 'none';
};
window.onclick = function(event) {
  const modal = document.getElementById('speakerModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
};

function showTalkModal(sessionId) {
  const talk = sessions.find(item => String(item.id) === String(sessionId));
  if (!talk) return;
  const speakersHtml = (talk.speakers || []).map(sid => {
    const info = getSpeakerInfo(sid);
    return `<span class="speaker-info" data-speaker-id="${sid}"><img class="speaker-avatar" src="${info.avatar || ''}" alt="${info.name}">${info.name}</span>`;
  }).join('');
  const html = `
    <div style="text-align:left;">
      <div style="font-size:1.2rem;font-weight:700;color:#4f8cff;margin-bottom:0.5rem;">${talk.title}</div>
      <div style="color:#555;margin-bottom:0.5rem;">${getSessionDate(talk)} | ${getSessionTime(talk)} | ${getSessionRoom(talk)}</div>
      <div style="margin-bottom:0.5rem;">${speakersHtml}</div>
      <div style="margin-bottom:0.5rem;"><b>Theme:</b> ${getSessionTheme(talk)}</div>
      <div style="margin-bottom:0.5rem;max-height: 300px; overflow-y: auto;"><b>Description:</b><br>${talk.description ? talk.description.replace(/\n/g, '<br>') : ''}</div>
    </div>
  `;
  document.getElementById('modalTalkDetail').innerHTML = html;
  document.getElementById('talkModal').style.display = 'flex';
}

document.getElementById('talkModalCloseBtn').onclick = function() {
  document.getElementById('talkModal').style.display = 'none';
};
window.addEventListener('click', function(event) {
  const modal = document.getElementById('talkModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

// 收藏功能
class FavoritesManager {
  constructor() {
    this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    this.favoritesLink = document.getElementById('favoritesLink');
    this.favoritesSection = document.getElementById('favorites');
    this.favoritesList = document.getElementById('favorites-list');
    
    this.init();
  }

  init() {
    // 初始化收藏按钮点击事件
    this.favoritesLink.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleFavoritesSection();
    });

    // 渲染收藏列表
    this.renderFavorites();
  }

  toggleFavoritesSection() {
    const isVisible = this.favoritesSection.style.display !== 'none';
    this.favoritesSection.style.display = isVisible ? 'none' : 'block';
    this.favoritesLink.classList.toggle('active', !isVisible);
    if (!isVisible) {
      this.renderFavorites();
    }
  }

  addFavorite(talk) {
    if (!this.favorites.some(f => f.id === talk.id)) {
      this.favorites.push(talk);
      this.saveFavorites();
      this.updateFavoriteButton(talk.id, true);
    }
  }

  removeFavorite(talkId) {
    this.favorites = this.favorites.filter(f => f.id !== talkId);
    this.saveFavorites();
    this.updateFavoriteButton(talkId, false);
    this.renderFavorites();
  }

  isFavorite(talkId) {
    return this.favorites.some(f => f.id === talkId);
  }

  saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  }

  updateFavoriteButton(talkId, isFavorite) {
    const btn = document.querySelector(`.favorite-btn[data-talk-id="${talkId}"]`);
    if (btn) {
      btn.classList.toggle('active', isFavorite);
    }
  }

  renderFavorites() {
    this.favoritesList.innerHTML = '';
    this.favorites.forEach(talk => {
      const talkElement = document.createElement('div');
      talkElement.className = 'favorite-item';
      talkElement.innerHTML = `
        <button class="remove-favorite" data-talk-id="${talk.id}">
          <i class="fas fa-times"></i>
        </button>
        <h3>${talk.title}</h3>
        <p>${talk.speaker}</p>
        <p>${talk.time} - ${talk.room}</p>
      `;
      
      const removeBtn = talkElement.querySelector('.remove-favorite');
      removeBtn.addEventListener('click', () => this.removeFavorite(talk.id));
      
      this.favoritesList.appendChild(talkElement);
    });
  }
}

// 初始化收藏管理器
const favoritesManager = new FavoritesManager(); 