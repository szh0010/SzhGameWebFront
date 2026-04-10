<template>
  <div class="board-wrapper">
    <div class="board-header">
      <div class="header-content">
        <div class="header-left">
          <h2>🎨 创意毛毡板</h2>
          <span class="header-info pc-only">💡 点击墙面任意空白处即可贴便签</span>
        </div>
        <button @click="$router.push('/game-selection')" class="btn-back">返回</button>
      </div>
    </div>

    <div class="canvas-area">
      <div 
        class="felt-canvas" 
        @click="handleCanvasClick"
        @dragover.prevent 
        @drop="onBoardDrop"
      >
        <div v-if="notes.length === 0" class="canvas-empty">墙上空空如也，点一下试试？</div>
        
        <div 
          v-for="note in processedNotes" 
          :key="note.id" 
          class="note-sticky"
          :class="{ 
            'first-note-anchor': note.isFirst,
            'is-tucked-away': isNoteCollapsed(note) 
          }"
          :draggable="note.user === currentUsername && !isNoteCollapsed(note)"
          @dragstart="onNoteDragStart($event, note)"
          @mousedown="bringToFront(note)"
          @click.stop 
          :style="getDynamicNoteStyle(note)"
        >
          <div class="pushpin-red"></div>
          
          <div v-if="note.isFirst" class="anchor-badge">
            <span class="badge-text">首贴</span>
            <button @click.stop="toggleUserCollapse(note.user)" class="collapse-toggle-btn">
              {{ collapsedUsers.has(note.user) ? '📂 展开 (' + getUserNoteCount(note.user) + ')' : '📁 收拢' }}
            </button>
          </div>

          <button v-if="note.user === currentUsername" class="delete-btn-mini" @click.stop="handleDelete(note.id)">×</button>
          
          <h3 class="s-title">{{ note.title }}</h3>
          
          <div v-if="note.image" class="s-image-box" @click.stop="openImagePreview(note.image)">
            <img :src="formatImageUrl(note.image)" class="s-image" />
          </div>
          
          <p class="s-content">{{ note.content }}</p>
          
          <div class="s-footer">
            <div class="f-left">
              <span class="f-user">👤 {{ note.user }}</span>
              <button class="f-like" :class="{ 'is-liked': note.is_liked }" @click.stop="handleToggleLike(note)">
                {{ note.is_liked ? '❤️' : '🤍' }} {{ note.likes_count || 0 }}
              </button>
            </div>
            <span class="f-date">{{ formatDateShort(note.created_at) }}</span>
          </div>
        </div>

        <div v-if="showPublish" class="temp-pin" :style="{ left: tempPosition.x + '%', top: tempPosition.y + '%' }"></div>
      </div>
    </div>

    <div v-if="showPublish" class="modal-overlay" @click.self="showPublish = false">
      <div class="publish-note-preview">
        <div class="pushpin-red large"></div>
        <div class="preview-card">
          <div class="preview-header">
            <input v-model="newNote.title" placeholder="在此输入标题..." class="preview-input-title" maxlength="15" />
            <button class="close-preview" @click="showPublish = false">×</button>
          </div>
          <div class="preview-body">
            <div class="file-drop-zone" @click="$refs.fileInput.click()">
              <input type="file" @change="onFileChange" accept="image/*" class="hidden-input" ref="fileInput" />
              <div v-if="imagePreview" class="image-wrapper">
                <img :src="imagePreview" class="img-content" />
                <div class="img-mask">更换图片</div>
              </div>
              <div v-else class="upload-placeholder">
                <span>📷 添加图片 (可选)</span>
              </div>
            </div>
            <textarea v-model="newNote.content" placeholder="这一刻的想法..." class="preview-textarea-content"></textarea>
          </div>
          <div class="preview-footer">
            <div class="footer-meta"><span>👤 {{ currentUsername }}</span><span>📅 刚刚</span></div>
            <button @click="submitNote" :disabled="loading" class="btn-publish-confirm">{{ loading ? '同步中...' : '钉在墙上' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showFullImage" class="fullscreen-mask" @click="closeImagePreview">
      <img :src="formatImageUrl(previewingImageUrl)" class="full-size-img" @click.stop />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

// 基础配置保持不变
const getBaseUrl = () => {
  const { protocol, hostname, port } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:8000`;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
};
const API_BASE_URL = getBaseUrl();

const notes = ref([]);
const newNote = ref({ title: '', content: '' });
const selectedFile = ref(null);
const imagePreview = ref(null);
const loading = ref(false);
const showPublish = ref(false);
const tempPosition = ref({ x: 0, y: 0 });
const fileInput = ref(null);
const currentUsername = ref(localStorage.getItem('username') || '');
const showFullImage = ref(false);
const previewingImageUrl = ref('');
const collapsedUsers = ref(new Set());

// ✨ 修复 3：首贴判定逻辑（增加防御性编程）
const userAnchorInfo = computed(() => {
  const anchors = {};
  if (!notes.value.length) return anchors;
  notes.value.forEach(note => {
    // 确保 note.user 存在
    if (!note.user) return;
    if (!anchors[note.user] || Number(note.id) < Number(anchors[note.user].id)) {
      anchors[note.user] = { id: note.id, x: note.x_position, y: note.y_position };
    }
  });
  return anchors;
});

const processedNotes = computed(() => {
  const anchors = userAnchorInfo.value;
  return notes.value.map(note => ({
    ...note,
    isFirst: note.id === anchors[note.user]?.id
  }));
});

const isNoteCollapsed = (note) => {
  // 如果首贴标记不存在，默认不折叠
  const isFirst = note.isFirst || (note.id === userAnchorInfo.value[note.user]?.id);
  return !isFirst && collapsedUsers.value.has(note.user);
};

const getDynamicNoteStyle = (note) => {
  const anchor = userAnchorInfo.value[note.user];
  const isTucked = isNoteCollapsed(note);
  // 如果找不到锚点（可能数据还没加载），保持原位
  const targetX = (isTucked && anchor) ? anchor.x : note.x_position;
  const targetY = (isTucked && anchor) ? anchor.y : note.y_position;

  return {
    left: targetX + '%',
    top: targetY + '%',
    transform: `rotate(${isTucked ? 0 : note.rotation}deg) scale(${isTucked ? 0.2 : 1})`,
    opacity: isTucked ? 0 : 1,
    zIndex: (note.isFirst || isTucked) ? 100 : note.z_index,
    pointerEvents: isTucked ? 'none' : 'auto'
  };
};

const toggleUserCollapse = (username) => {
  if (collapsedUsers.value.has(username)) {
    collapsedUsers.value.delete(username);
  } else {
    collapsedUsers.value.add(username);
  }
};

const getUserNoteCount = (username) => {
  return notes.value.filter(n => n.user === username).length;
};

// 后续 API 请求逻辑保持不变...
const handleCanvasClick = (e) => {
  if (e.target.className !== 'felt-canvas') return;
  const rect = e.currentTarget.getBoundingClientRect();
  tempPosition.value = { 
    x: ((e.clientX - rect.left) / rect.width) * 100, 
    y: ((e.clientY - rect.top) / rect.height) * 100 
  };
  showPublish.value = true;
};

const onNoteDragStart = (e, note) => {
  const rect = e.target.getBoundingClientRect();
  e.dataTransfer.setData('noteId', note.id);
  e.dataTransfer.setData('offsetX', e.clientX - rect.left);
  e.dataTransfer.setData('offsetY', e.clientY - rect.top);
};

const onBoardDrop = async (e) => {
  const noteId = e.dataTransfer.getData('noteId');
  const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
  const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));
  const canvas = e.currentTarget.getBoundingClientRect();
  const note = notes.value.find(n => n.id == noteId);
  if (note) {
    note.x_position = ((e.clientX - canvas.left - offsetX) / canvas.width) * 100;
    note.y_position = ((e.clientY - canvas.top - offsetY) / canvas.height) * 100;
    bringToFront(note);
    saveNotePosition(note);
  }
};

const bringToFront = (note) => {
  const maxZ = notes.value.length > 0 ? Math.max(...notes.value.map(n => n.z_index)) : 1;
  note.z_index = maxZ + 1;
};

const saveNotePosition = async (note) => {
  try {
    const csrfToken = getCookie('csrftoken');
    await axios.patch(`${API_BASE_URL}/api/board/${note.id}/`, {
      x_position: note.x_position, y_position: note.y_position, z_index: note.z_index
    }, { headers: { 'X-CSRFToken': csrfToken }, withCredentials: true });
  } catch (err) { console.error(err); }
};

const submitNote = async () => {
  if (!newNote.value.content) return alert("内容不能为空");
  loading.value = true;
  const formData = new FormData();
  formData.append('title', newNote.value.title || '无标题');
  formData.append('content', newNote.value.content);
  formData.append('x_position', tempPosition.value.x);
  formData.append('y_position', tempPosition.value.y);
  formData.append('rotation', (Math.random() * 10 - 5).toFixed(2));
  if (selectedFile.value) formData.append('image', selectedFile.value);
  try {
    const csrfToken = getCookie('csrftoken');
    await axios.post(`${API_BASE_URL}/api/board/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data', 'X-CSRFToken': csrfToken },
      withCredentials: true 
    });
    newNote.value = { title: '', content: '' };
    removeImage();
    showPublish.value = false;
    fetchNotes();
  } catch (err) { alert("发布失败"); } finally { loading.value = false; }
};

const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};
const formatImageUrl = (url) => url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
const fetchNotes = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/board/`, { withCredentials: true });
    notes.value = res.data;
  } catch (err) { console.error(err); }
};
const handleToggleLike = async (note) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/board/${note.id}/toggle_like/`, {}, {
      headers: { 'X-CSRFToken': getCookie('csrftoken') }, withCredentials: true
    });
    note.likes_count = res.data.likes_count;
    note.is_liked = res.data.is_liked;
  } catch (err) { console.error(err); }
};
const handleDelete = async (noteId) => {
  if (!confirm("确定要撕掉这张便签吗？")) return;
  try {
    await axios.delete(`${API_BASE_URL}/api/board/${noteId}/`, {
      headers: { 'X-CSRFToken': getCookie('csrftoken') }, withCredentials: true
    });
    notes.value = notes.value.filter(n => n.id !== noteId);
  } catch (err) { alert("删除失败"); }
};
const onFileChange = (e) => {
  const file = e.target.files[0];
  if (file) { selectedFile.value = file; imagePreview.value = URL.createObjectURL(file); }
};
const removeImage = () => {
  selectedFile.value = null; imagePreview.value = null;
  if (fileInput.value) fileInput.value.value = '';
};
const openImagePreview = (url) => { previewingImageUrl.value = url; showFullImage.value = true; };
const closeImagePreview = () => { showFullImage.value = false; };
const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};
onMounted(fetchNotes);
</script>

<style scoped>
/* 核心布局 */
.board-wrapper { position: fixed; top: 0; left: 0; width: 100vw; height: calc(100vh - 60px); background: #2c1e1a; display: flex; flex-direction: column; overflow: hidden; z-index: 10; }
.board-header { flex: 0 0 auto; background: rgba(0,0,0,0.9); padding: 10px 15px; color: white; z-index: 100; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.canvas-area { flex: 1; position: relative; width: 100%; overflow: hidden; }
.felt-canvas { width: 100%; height: 100%; background-color: #5d4037; background-image: url('https://www.transparenttextures.com/patterns/felt.png'); border: 4px solid #3e2723; box-shadow: inset 0 0 40px rgba(0,0,0,0.7); position: relative; overflow: auto; }

/* 便签样式 */
.note-sticky {
  position: absolute; width: 160px; background: #fffbe6; padding: 10px;
  box-shadow: 3px 3px 8px rgba(0,0,0,0.4); border-radius: 2px;
  margin-left: -80px; 
  transition: left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s ease, opacity 0.4s ease;
  will-change: left, top, transform, opacity;
}

/* ✨ 修复：限制便签内图片，确保不会顶破边框 */
.s-image-box { margin-top: 5px; border-radius: 2px; overflow: hidden; max-height: 200px; display: flex; align-items: center; }
.s-image { width: 100%; height: auto; max-height: 200px; object-fit: cover; }

/* ✨ 修复：预览弹窗样式（增加显眼的背景遮罩） */
.modal-overlay { 
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
  background: rgba(0, 0, 0, 0.85); /* 调暗背景 */
  display: flex; justify-content: center; align-items: center; 
  z-index: 2000; /* 确保在最顶层 */
}

.publish-note-preview { position: relative; width: 90%; max-width: 380px; }
.preview-card { background: #fffbe6; padding: 25px; border-radius: 4px; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }

/* 预览图片控制 */
.image-wrapper { width: 100%; max-height: 300px; overflow: hidden; border-radius: 4px; }
.img-content { width: 100%; height: auto; display: block; }

/* 其他细节保持不变 */
.pushpin-red { position: absolute; top: -8px; left: 50%; transform: translateX(-50%); width: 10px; height: 10px; background: radial-gradient(circle at 30% 30%, #ff5252, #b71c1c); border-radius: 50%; }
.pushpin-red.large { width: 20px; height: 20px; top: -10px; z-index: 10; }
.anchor-badge { position: absolute; top: -18px; left: 5px; display: flex; align-items: center; gap: 5px; z-index: 2; }
.badge-text { background: #fadb14; color: #856404; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px; border: 1px solid #856404; }
.collapse-toggle-btn { background: rgba(255, 255, 255, 0.9); border: 1px solid #ddd; border-radius: 4px; font-size: 10px; padding: 1px 6px; cursor: pointer; color: #666; }
.preview-input-title { width: 80%; background: transparent; border: none; border-bottom: 1px dashed #ffe58f; font-size: 20px; font-weight: bold; color: #856404; outline: none; }
.preview-textarea-content { width: 100%; min-height: 120px; background: transparent; border: none; font-size: 16px; line-height: 1.6; color: #333; outline: none; resize: none; margin-top: 10px; }
.btn-publish-confirm { background: #52c41a; color: white; border: none; padding: 12px 25px; border-radius: 10px; font-weight: bold; cursor: pointer; }
.fullscreen-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.full-size-img { max-width: 95%; max-height: 95%; object-fit: contain; }
.hidden-input { display: none; }
</style>