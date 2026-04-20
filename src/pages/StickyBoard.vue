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
          :style="getDynamicNoteStyle(note)"
          @mousedown="bringToFront(note)"
          @click.stop 
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
              <button 
                class="f-like" 
                :class="{ 'is-liked': note.is_liked }" 
                @click.stop="handleToggleLike(note)"
              >
                <span class="heart-icon">{{ note.is_liked ? '❤️' : '🤍' }}</span>
                <span class="like-count">{{ note.likes_count || 0 }}</span>
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
            <input 
              v-model="newNote.title" 
              placeholder="输入标题..." 
              class="preview-input-title" 
              maxlength="15" 
            />
            <button class="close-preview" @click="showPublish = false">×</button>
          </div>
          
          <div class="preview-body">
            <div class="file-drop-zone" @click="$refs.fileInput.click()">
              <input type="file" @change="onFileChange" accept="image/*" class="hidden-input" ref="fileInput" />
              
              <div v-if="imagePreview" class="image-wrapper">
                <img :src="imagePreview" class="img-content" />
                <div class="img-mask">点击更换图片</div>
              </div>
              
              <div v-else class="upload-placeholder">
                <span class="icon">📸</span>
                <span>添加配图 (可选)</span>
              </div>
            </div>

            <textarea 
              v-model="newNote.content" 
              placeholder="写下你此刻的想法..." 
              class="preview-textarea-content"
            ></textarea>
          </div>

          <div class="preview-footer">
            <div class="footer-meta">
              <span>👤 {{ currentUsername }}</span>
              <span>📅 刚刚</span>
            </div>
            <button @click="submitNote" :disabled="loading" class="btn-publish-confirm">
              {{ loading ? '发布中...' : '钉在墙上' }}
            </button>
          </div>
        </div>
        <p class="preview-hint">✨ 预览模式：发布后即为该效果</p>
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

// --- 1. 基础配置逻辑 ---
const getBaseUrl = () => {
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000`;
  }
  return `${protocol}//${hostname}`;
};
const API_BASE_URL = getBaseUrl();

/**
 * ✨ 终极版：全自动环境适配的图片清洗函数
 * 彻底告别“精神分裂”，本地找本地拿，线上找线上拿！
 */
const formatImageUrl = (url) => {
  if (!url) return '';

  // 1. 暴力切头：不管后端传过来的是带本地 IP 还是什么乱七八糟的域名，只留 /media/...
  let path = url;
  if (url.includes('/media/')) {
    path = '/media/' + url.split('/media/').pop();
  }

  // 2. 动态拼装：API_BASE_URL 已经在上面定义好了（本地带 8000 端口，线上不带）
  const base = API_BASE_URL.replace(/\/$/, '');
  const finalPath = path.startsWith('/') ? path : `/${path}`;
  
  // 保留一行控制台输出，方便以后你排查问题
  console.log("🖼️ 图片地址解析:", finalPath, "➡️", `${base}${finalPath}`);
  
  return `${base}${finalPath}`;
};

// --- 2. 逻辑部分 ---
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

const userAnchorInfo = computed(() => {
  const anchors = {};
  if (!notes.value.length) return anchors;
  notes.value.forEach(note => {
    if (!note.user) return;
    const nid = Number(note.id);
    if (!anchors[note.user] || nid < Number(anchors[note.user].id)) {
      anchors[note.user] = { id: nid, x: note.x_position, y: note.y_position };
    }
  });
  return anchors;
});

const processedNotes = computed(() => {
  const anchors = userAnchorInfo.value;
  return notes.value.map(note => ({
    ...note,
    isFirst: Number(note.id) === Number(anchors[note.user]?.id)
  }));
});

const isNoteCollapsed = (note) => !note.isFirst && collapsedUsers.value.has(note.user);

const getDynamicNoteStyle = (note) => {
  const anchors = userAnchorInfo.value;
  const isTucked = isNoteCollapsed(note);
  const anchor = anchors[note.user];
  return {
    left: (isTucked && anchor ? anchor.x : note.x_position) + '%',
    top: (isTucked && anchor ? anchor.y : note.y_position) + '%',
    transform: `rotate(${isTucked ? 0 : note.rotation}deg) scale(${isTucked ? 0.2 : 1})`,
    opacity: isTucked ? 0 : 1,
    zIndex: note.isFirst ? 100 : note.z_index,
    pointerEvents: isTucked ? 'none' : 'auto'
  };
};

const toggleUserCollapse = (username) => {
  if (collapsedUsers.value.has(username)) collapsedUsers.value.delete(username);
  else collapsedUsers.value.add(username);
};

const getUserNoteCount = (username) => notes.value.filter(n => n.user === username).length;

const fetchNotes = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/board/`, { withCredentials: true });
    notes.value = res.data;
  } catch (err) { console.error(err); }
};

const handleToggleLike = async (note) => {
  const originalNote = notes.value.find(n => n.id === note.id);
  if (!originalNote) return;
  const wasLiked = originalNote.is_liked;
  const oldCount = originalNote.likes_count || 0;
  originalNote.is_liked = !wasLiked;
  originalNote.likes_count = wasLiked ? Math.max(0, oldCount - 1) : oldCount + 1;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/board/${note.id}/toggle_like/`, {}, { withCredentials: true });
    originalNote.likes_count = res.data.likes_count;
    originalNote.is_liked = res.data.is_liked;
  } catch (err) {
    originalNote.is_liked = wasLiked;
    originalNote.likes_count = oldCount;
  }
};

const handleCanvasClick = (e) => {
  if (e.target.className !== 'felt-canvas') return;
  const rect = e.currentTarget.getBoundingClientRect();
  tempPosition.value = { 
    x: ((e.clientX - rect.left) / rect.width) * 100, 
    y: ((e.clientY - rect.top) / rect.height) * 100 
  };
  showPublish.value = true;
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
    await axios.patch(`${API_BASE_URL}/api/board/${note.id}/`, {
      x_position: note.x_position, y_position: note.y_position, z_index: note.z_index
    }, { withCredentials: true });
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
    await axios.post(`${API_BASE_URL}/api/board/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true 
    });
    newNote.value = { title: '', content: '' };
    removeImage();
    showPublish.value = false;
    fetchNotes();
  } catch (err) { alert("发布失败"); } finally { loading.value = false; }
};

const handleDelete = async (noteId) => {
  if (!confirm("确定要撕掉这张便签吗？")) return;
  try {
    await axios.delete(`${API_BASE_URL}/api/board/${noteId}/`, { withCredentials: true });
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
.board-wrapper { 
  position: fixed; top: 0; left: 0; width: 100vw; height: calc(100vh - 65px); 
  background: #2c1e1a; display: flex; flex-direction: column; overflow: hidden; z-index: 10;
  color: #ffffff;
}
.board-header { flex: 0 0 auto; background: rgba(0,0,0,0.9); padding: 10px 15px; z-index: 100; border-bottom: 1px solid rgba(255,255,255,0.1); }
.header-left h2 { color: #ffffff !important; }
.header-info { color: #d4a373 !important; }
.canvas-area { flex: 1; position: relative; width: 100%; overflow: hidden; }
.felt-canvas { width: 100%; height: 100%; background-color: #5d4037; background-image: url('https://www.transparenttextures.com/patterns/felt.png'); border: 4px solid #3e2723; box-shadow: inset 0 0 40px rgba(0,0,0,0.7); position: relative; }
.note-sticky { position: absolute; width: 160px; background: #fffbe6; padding: 10px; box-shadow: 3px 3px 8px rgba(0,0,0,0.4); border-radius: 2px; margin-left: -80px; transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); color: #4a3701 !important; }

/* ✨ Bug 2 修复：已发布便签的图片适配 */
.s-image-box { margin-top: 5px; border-radius: 2px; overflow: hidden; height: 110px; display: flex; align-items: center; justify-content: center; background: #eee; }
.s-image { width: 100%; height: 100%; object-fit: cover; } /* 墙上图铺满 */

.s-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; color: #856404 !important; }
.s-content { font-size: 12px; color: #5d4037 !important; line-height: 1.3; word-break: break-all; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 2000; padding: 10px; }
.publish-note-preview { position: relative; width: 100%; max-width: 360px; animation: modalEnter 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
.preview-card { background: #fffbe6; padding: 20px; border-radius: 4px; box-shadow: 0 15px 50px rgba(0,0,0,0.6); max-height: 90vh; overflow-y: auto; }

/* ✨ Bug 2 修复：编辑器图片预览适配 */
.file-drop-zone { width: 100%; height: 180px; background: rgba(0,0,0,0.05); border: 2px dashed #ffe58f; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; margin-top: 10px; }
.image-wrapper { width: 100%; height: 100%; position: relative; }
.img-content { width: 100%; height: 100%; object-fit: contain; background: #f9f9f9; } /* 预览图完整显示 */
.img-mask { position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.5); color: white; font-size: 12px; padding: 4px 0; text-align: center; }

/* 其他样式保持 */
.preview-input-title { width: 80%; background: transparent; border: none; border-bottom: 1px dashed #ffe58f; font-size: 18px; font-weight: bold; color: #856404 !important; outline: none; }
.close-preview { background: none; border: none; font-size: 24px; cursor: pointer; color: #856404; }
.preview-textarea-content { width: 100%; min-height: 80px; background: transparent; border: none; font-size: 15px; line-height: 1.5; color: #333 !important; outline: none; resize: none; margin-top: 15px; }
.btn-publish-confirm { background: #52c41a; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; }
.fullscreen-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; justify-content: center; align-items: center; }
.full-size-img { max-width: 95%; max-height: 95%; object-fit: contain; }
@media (max-width: 600px) { .file-drop-zone { height: 150px; } .preview-card { padding: 15px; } }
@keyframes modalEnter { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>