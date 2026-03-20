<template>
  <div class="profile-container">
    <div class="profile-card">
      <div class="card-header-visual"></div>

      <div class="profile-content">
        <div class="avatar-section">
          <div class="avatar-wrapper" @click="$refs.fileInput.click()">
            <img :src="avatarPreview || formatUrl(profile.avatar)" class="avatar-img" />
            <div class="avatar-hover-mask">更换头像</div>
          </div>
          <input type="file" @change="handleFileChange" accept="image/*" ref="fileInput" hidden />
          
          <div class="user-titles">
            <p class="username-display">@{{ profile.username || '用户名' }}</p>
            </div>
        </div>

        <div class="form-body">
          <div class="input-group">
            <label>昵称</label>
            <input v-model="profile.nickname" placeholder="起个响亮的昵称" />
          </div>

          <div class="input-group">
            <label>性别</label>
            <select v-model="profile.gender">
              <option value="M">男</option>
              <option value="F">女</option>
              <option value="O">其他 / 保密</option>
            </select>
          </div>

          <div class="input-group">
            <label>生日</label>
            <input type="date" v-model="profile.birthday" />
          </div>

          <div class="input-group">
            <label>个人简介</label>
            <textarea v-model="profile.bio" rows="3" placeholder="向大家介绍一下自己吧..."></textarea>
          </div>

          <div class="button-group">
            <button @click="saveProfile" :disabled="isSaving" class="save-btn">
              {{ isSaving ? '正在同步...' : '保存资料修改' }}
            </button>
            <button @click="handleLogout" class="logout-btn">
              退出当前账号
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const API_BASE = ''; 

const profile = ref({ 
  username: '', 
  nickname: '', 
  gender: 'O', 
  birthday: '', 
  bio: '', 
  avatar: null 
});
const avatarPreview = ref(null);
const selectedFile = ref(null);
const isSaving = ref(false);

// 获取个人资料
const fetchProfile = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/board/profile/me/`, { withCredentials: true });
    profile.value = res.data;
  } catch (err) {
    console.error("加载资料失败", err);
  }
};

// 选择头像预览
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedFile.value = file;
    avatarPreview.value = URL.createObjectURL(file); 
  }
};

// 保存修改
const saveProfile = async () => {
  isSaving.value = true;
  const formData = new FormData();
  formData.append('nickname', profile.value.nickname || '');
  formData.append('gender', profile.value.gender);
  formData.append('birthday', profile.value.birthday || '');
  formData.append('bio', profile.value.bio || '');
  if (selectedFile.value) {
    formData.append('avatar', selectedFile.value);
  }

  try {
    await axios.patch(`${API_BASE}/api/board/profile/me/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      withCredentials: true
    });
    alert("✅ 资料已同步至云端");
    fetchProfile(); 
    selectedFile.value = null;
    avatarPreview.value = null;
  } catch (err) {
    alert("保存失败，请检查网络连接");
  } finally {
    isSaving.value = false;
  }
};

// 退出登录
const handleLogout = () => {
  if(confirm("确定要退出登录吗？")) {
    localStorage.removeItem('username');
    localStorage.removeItem('user_id');
    router.push('/login');
  }
};

// 格式化图片地址
const formatUrl = (url) => {
  if (!url) return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
};

onMounted(fetchProfile);
</script>

<style scoped>
.profile-container { 
  display: flex; justify-content: center; padding: 20px; 
  background: #f0f2f5; min-height: calc(100vh - 60px); 
}

.profile-card { 
  background: white; width: 100%; max-width: 480px; 
  border-radius: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.05); 
  overflow: hidden; position: relative;
}

.card-header-visual {
  height: 100px;
  background: linear-gradient(120deg, #42b983, #35495e);
}

.profile-content {
  padding: 0 25px 30px;
  margin-top: -55px;
}

.avatar-section { 
  display: flex; flex-direction: column; align-items: center; 
  margin-bottom: 25px; 
}

.avatar-wrapper { 
  position: relative; width: 110px; height: 110px; 
  cursor: pointer; border-radius: 50%; overflow: hidden; 
  border: 5px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  background: #eee;
}

.avatar-img { width: 100%; height: 100%; object-fit: cover; }

.avatar-hover-mask { 
  position: absolute; bottom: 0; background: rgba(0,0,0,0.6); 
  color: white; width: 100%; text-align: center; 
  font-size: 11px; padding: 5px 0; opacity: 0; transition: 0.3s; 
}

.avatar-wrapper:hover .avatar-hover-mask { opacity: 1; }

.user-titles { text-align: center; margin-top: 10px; }

.username-display {
  font-weight: bold; color: #333; font-size: 18px; margin-bottom: 5px;
}

.form-body { text-align: left; }
.input-group { margin-bottom: 18px; }
.input-group label { 
  display: block; font-size: 13px; font-weight: 600; 
  margin-bottom: 6px; color: #666; 
}

input, select, textarea { 
  width: 100%; padding: 12px; border: 1px solid #e0e0e0; 
  border-radius: 10px; font-size: 14px; transition: 0.2s;
}

input:focus, select:focus, textarea:focus {
  border-color: #42b983; outline: none; box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1);
}

.button-group { margin-top: 30px; display: flex; flex-direction: column; gap: 12px; }

.save-btn { 
  width: 100%; padding: 14px; background: #42b983; 
  color: white; border: none; border-radius: 12px; 
  font-size: 15px; font-weight: bold; cursor: pointer; transition: 0.3s; 
}

.save-btn:hover { background: #3aa876; transform: translateY(-1px); }

.logout-btn {
  width: 100%; padding: 12px; background: white; 
  color: #ff4d4f; border: 1px solid #ff4d4f; border-radius: 12px; 
  font-size: 14px; cursor: pointer; transition: 0.2s;
}

.logout-btn:hover { background: #fff1f0; }
</style>