<template>
  <div class="board-wrapper">
    <div class="board-header">
      <div class="header-content">
        <h2>🎨 创意毛毡板</h2>
        <div class="header-info">💡 点击墙面任意空白处，即可在该位置张贴便签</div>
        <button @click="$router.push('/game-selection')" class="btn-back">返回</button>
      </div>
    </div>

    <div 
      class="felt-canvas" 
      @click="handleCanvasClick"
      @dragover.prevent 
      @drop="onBoardDrop"
    >
      <div v-if="notes.length === 0" class="canvas-empty">墙上空空如也，点一下试试？</div>
      
      <div 
        v-for="note in notes" 
        :key="note.id" 
        class="note-sticky"
        :draggable="note.user === currentUsername"
        @dragstart="onNoteDragStart($event, note)"
        @mousedown="bringToFront(note)"
        @click.stop 
        :style="{
          left: note.x_position + '%',
          top: note.y_position + '%',
          transform: `rotate(${note.rotation}deg)`,
          zIndex: note.z_index
        }"
      >
        <div class="pushpin-red"></div>
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

    <div v-if="showPublish" class="modal-overlay" @click.self="showPublish = false">
      <div class="publish-modal">
        <div class="modal-header">
          <h3>新便签</h3>
          <button class="close-modal" @click="showPublish = false">×</button>
        </div>
        <div class="modal-body">
          <input v-model="newNote.title" placeholder="输入标题..." class="modal-input" />
          <textarea v-model="newNote.content" placeholder="写下你的想法..." class="modal-textarea"></textarea>
          
          <div class="file-select-area">
            <label class="btn-select-file">
              <span>📷 添加图片</span>
              <input type="file" @change="onFileChange" accept="image/*" class="hidden-input" ref="fileInput" />
            </label>
            <div v-if="imagePreview" class="modal-preview">
              <img :src="imagePreview" />
              <button @click="removeImage" class="remove-img-btn">删除图片</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="submitNote" :disabled="loading" class="btn-submit-main">
            {{ loading ? '发布中...' : '钉在选定位置' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showFullImage" class="fullscreen-mask" @click="closeImagePreview">
      <img :src="formatImageUrl(previewingImageUrl)" class="full-size-img" @click.stop />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

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
const tempPosition = ref({ x: 0, y: 0 }); // ✨ 记录点击位置
const fileInput = ref(null);
const currentUsername = ref(localStorage.getItem('username') || '');
const showFullImage = ref(false);
const previewingImageUrl = ref('');

// ✨ 处理墙面点击：指哪钉哪
const handleCanvasClick = (e) => {
  // 只有点击墙面背景（非便签）时才触发
  if (e.target.className !== 'felt-canvas') return;

  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  tempPosition.value = { x, y };
  showPublish.value = true; // 弹出编辑框
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
  
  let newX = ((e.clientX - canvas.left - offsetX) / canvas.width) * 100;
  let newY = ((e.clientY - canvas.top - offsetY) / canvas.height) * 100;

  const note = notes.value.find(n => n.id == noteId);
  if (note) {
    note.x_position = newX;
    note.y_position = newY;
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
  
  // ✨ 使用点击时保存的坐标
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

// 基础辅助函数（保持不变）
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
.board-wrapper { width: 100vw; height: 100vh; background: #2c1e1a; overflow: hidden; display: flex; flex-direction: column; }

.board-header { background: rgba(0,0,0,0.5); padding: 10px 20px; color: white; z-index: 50; }
.header-content { display: flex; justify-content: space-between; align-items: center; }
.header-info { font-size: 14px; color: #d4a373; }
.btn-back { background: #6c757d; border: none; padding: 6px 20px; border-radius: 4px; color: #fff; cursor: pointer; }

/* 🎨 画布区 */
.felt-canvas {
  flex: 1; position: relative; margin: 20px;
  background-color: #5d4037;
  background-image: url('https://www.transparenttextures.com/patterns/felt.png');
  border: 15px solid #3e2723;
  box-shadow: inset 0 0 50px rgba(0,0,0,0.8);
  border-radius: 2px;
  overflow: hidden;
}

/* 临时大头针（点击落点） */
.temp-pin {
  position: absolute; width: 20px; height: 20px;
  background: rgba(255, 82, 82, 0.6); border-radius: 50%;
  transform: translate(-50%, -50%); pointer-events: none;
  border: 2px solid #fff; animation: pulse 1s infinite;
}

/* 编辑模态框 */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.publish-modal {
  background: #fff; width: 400px; border-radius: 12px; overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: zoomIn 0.3s;
}
.modal-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.close-modal { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }
.modal-body { padding: 20px; }
.modal-input, .modal-textarea { width: 100%; border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin-bottom: 15px; box-sizing: border-box; }
.modal-textarea { min-height: 100px; resize: none; }

.file-select-area { background: #f9f9f9; padding: 15px; border-radius: 6px; border: 1px dashed #ccc; text-align: center; }
.btn-select-file { background: #1890ff; color: #fff; padding: 6px 15px; border-radius: 4px; cursor: pointer; display: inline-block; }
.modal-preview { margin-top: 10px; }
.modal-preview img { max-width: 100%; max-height: 150px; border-radius: 4px; }
.remove-img-btn { display: block; width: 100%; background: #ff4d4f; color: #fff; border: none; padding: 5px; margin-top: 5px; cursor: pointer; border-radius: 4px; }

.modal-footer { padding: 15px; background: #f4f4f4; text-align: right; }
.btn-submit-main { background: #52c41a; color: #fff; border: none; padding: 10px 30px; border-radius: 6px; cursor: pointer; font-weight: bold; }

/* 便签样式 */
.note-sticky {
  position: absolute; width: 220px; background: #fffbe6; padding: 15px;
  box-shadow: 4px 4px 10px rgba(0,0,0,0.4); border-radius: 2px;
}
.pushpin-red {
  position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
  width: 14px; height: 14px; background: radial-gradient(circle at 30% 30%, #ff5252, #b71c1c);
  border-radius: 50%; box-shadow: 0 4px 4px rgba(0,0,0,0.4);
}
.s-title { font-size: 16px; margin: 0 0 10px 0; border-bottom: 1px dashed #ffe58f; padding-bottom: 5px; }
.s-content { font-size: 14px; line-height: 1.5; color: #333; }
.s-image-box { margin-bottom: 10px; border-radius: 3px; overflow: hidden; cursor: zoom-in; }
.s-image { width: 100%; display: block; max-height: 300px; object-fit: cover; }
.s-footer { display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 8px; font-size: 11px; }

/* 全屏预览 */
.fullscreen-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.full-size-img { max-width: 90%; max-height: 90%; }

@keyframes pulse { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.hidden-input { display: none; }
</style>