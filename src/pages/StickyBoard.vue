<template>
  <div class="sticky-board">
    <div class="header-box">
      <h2>📌 毛毡便签墙</h2>
      <button @click="$router.push('/game-selection')" class="btn-back">返回选择页</button>
    </div>

    <div class="publish-section">
      <input v-model="newNote.title" placeholder="输入标题..." class="input-title" />
      <textarea v-model="newNote.content" placeholder="写下你的想法..." class="input-content"></textarea>
      
      <div class="file-group">
        <label class="file-label">
          <span>+ 添加图片</span>
          <input type="file" @change="onFileChange" accept="image/*" class="hidden-input" ref="fileInput" />
        </label>
        <div v-if="imagePreview" class="preview-box">
          <img :src="imagePreview" />
          <button @click="removeImage" class="remove-btn">×</button>
        </div>
      </div>

      <button @click="submitNote" :disabled="loading" class="submit-btn">
        {{ loading ? '发布中...' : '发布便签' }}
      </button>
    </div>

    <hr />

    <div class="notes-container">
      <div v-if="notes.length === 0" class="no-data">暂时还没有便签，快来发布第一条吧！</div>
      <div v-for="note in notes" :key="note.id" class="note-card">
        <h3>{{ note.title }}</h3>
        <img v-if="note.image" :src="formatImageUrl(note.image)" class="note-image" />
        <p>{{ note.content }}</p>
        <div class="note-footer">
          <span>👤 {{ note.user }}</span>
          <span>📅 {{ formatDate(note.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// 配置后端基地址，方便统一修改
const API_BASE_URL = 'http://127.0.0.1:8000';

const notes = ref([]);
const newNote = ref({ title: '', content: '' });
const selectedFile = ref(null);
const imagePreview = ref(null);
const loading = ref(false);
const fileInput = ref(null);

// 获取 Cookie
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

// 格式化图片地址
const formatImageUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

// 获取便签列表
const fetchNotes = async () => {
  try {
    // 确保 URL 以斜杠结尾
    const res = await axios.get(`${API_BASE_URL}/api/board/`, {
      withCredentials: true 
    });
    notes.value = res.data;
  } catch (err) {
    console.error("加载便签失败:", err.response?.data || err.message);
  }
};

// 处理图片选择
const onFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
};

const removeImage = () => {
  selectedFile.value = null;
  imagePreview.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

// 提交发布
const submitNote = async () => {
  if (!newNote.value.content) return alert("内容不能为空");
  
  loading.value = true;
  const formData = new FormData();
  formData.append('title', newNote.value.title || '无标题');
  formData.append('content', newNote.value.content);
  if (selectedFile.value) {
    formData.append('image', selectedFile.value);
  }

  try {
    const csrfToken = getCookie('csrftoken');
    // 调试：如果这里打印 null，说明你还没在 127.0.0.1 下登录
    console.log("发送请求时的 CSRF Token:", csrfToken);

    // 关键：URL 必须以斜杠 / 结尾，否则 Django 可能会重定向导致 405
    await axios.post(`${API_BASE_URL}/api/board/`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'X-CSRFToken': csrfToken
      },
      withCredentials: true 
    });

    newNote.value = { title: '', content: '' };
    removeImage();
    fetchNotes();
  } catch (err) {
    console.error("POST 请求详细错误:", err.response);
    const detail = err.response?.data?.detail || "请检查登录状态或后端路由配置";
    alert("发布失败：" + detail);
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
};

onMounted(fetchNotes);
</script>

<style scoped>
.sticky-board { padding: 20px; max-width: 800px; margin: 0 auto; }
.header-box { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.btn-back { padding: 5px 15px; background: #8c8c8c; color: white; border: none; border-radius: 4px; cursor: pointer; }
.publish-section { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ddd; }
.input-title, .input-content { width: 100%; margin-bottom: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.input-content { min-height: 100px; resize: vertical; }
.file-group { margin-bottom: 15px; }
.note-card { background: #fffbe6; border: 1px solid #ffe58f; padding: 15px; margin-bottom: 20px; border-radius: 4px; box-shadow: 2px 2px 5px rgba(0,0,0,0.1); }
.note-image { max-width: 100%; height: auto; border-radius: 4px; margin: 10px 0; display: block; border: 1px solid #eee; }
.preview-box { position: relative; display: inline-block; margin-top: 10px; border: 1px dashed #ccc; padding: 5px; }
.preview-box img { max-width: 200px; max-height: 200px; border-radius: 4px; }
.remove-btn { position: absolute; top: -10px; right: -10px; background: #ff4d4f; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-weight: bold; }
.hidden-input { display: none; }
.file-label { background: #1890ff; color: white; padding: 8px 16px; cursor: pointer; border-radius: 4px; display: inline-block; }
.submit-btn { background: #52c41a; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 16px; }
.submit-btn:disabled { background: #ccc; cursor: not-allowed; }
.note-footer { margin-top: 10px; font-size: 12px; color: #888; display: flex; justify-content: space-between; }
.no-data { text-align: center; color: #999; padding: 40px; }
</style>