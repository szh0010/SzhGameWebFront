<template>
  <div class="friends-container">
    <div class="friends-card">
      <div class="friends-header">
        <h2>👥 好友中心</h2>
        <div class="my-id-badge">我的 ID: {{ myUid }}</div>
      </div>

      <div class="search-section">
        <div class="search-bar">
          <input 
            v-model="searchId" 
            type="text" 
            placeholder="输入数字 ID 找人..." 
            @keyup.enter="handleSearch"
          />
          <button @click="handleSearch" :disabled="isSearching">
            {{ isSearching ? '...' : '搜索' }}
          </button>
        </div>

        <transition name="fade">
          <div v-if="searchResult" class="search-result-card">
            <div class="user-brief">
              <img :src="formatUrl(searchResult.avatar)" class="mini-avatar" />
              <div class="text-info">
                <p class="name">{{ searchResult.nickname || searchResult.username }}</p>
                <p class="id">UID: {{ searchResult.uid }}</p>
              </div>
            </div>
            <button class="add-btn" @click="sendFriendRequest(searchResult.uid)">
              + 加好友
            </button>
          </div>
        </transition>
      </div>

      <div class="tabs">
        <div class="tab" :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">我的好友</div>
        <div class="tab" :class="{ active: activeTab === 'requests' }" @click="activeTab = 'requests'">
          申请通知
          <span v-if="pendingCount > 0" class="badge">{{ pendingCount }}</span>
        </div>
      </div>

      <div class="list-content">
        <div v-if="activeTab === 'list'" class="list-wrapper">
          <div v-for="friend in friendList" :key="friend.uid" class="list-item">
            <img :src="formatUrl(friend.avatar)" class="item-avatar" />
            <div class="item-info">
              <p class="item-name">{{ friend.nickname || friend.username }}</p>
              <p class="item-status">在线</p>
            </div>
            <button class="action-btn">对战</button>
          </div>
          <p v-if="friendList.length === 0" class="empty-hint">暂无好友，快去搜索 ID 结识新朋友吧！</p>
        </div>

        <div v-if="activeTab === 'requests'" class="list-wrapper">
          <div v-for="req in requestList" :key="req.id" class="list-item">
            <div class="item-info">
              <p class="item-name">来自 <b>{{ req.from_name }}</b> (UID: {{ req.from_uid }}) 的请求</p>
              <p class="item-time">{{ req.time }}</p>
            </div>
            <div class="request-actions">
              <button class="accept-btn" @click="handleRequest(req.id, 'accept')">同意</button>
              <button class="ignore-btn" @click="handleRequest(req.id, 'reject')">忽略</button>
            </div>
          </div>
          <p v-if="requestList.length === 0" class="empty-hint">目前没有新的好友申请</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; // ✨ 引入 onMounted 生命周期钩子
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000';
const myUid = ref(localStorage.getItem('user_id') || '----');
const searchId = ref('');
const searchResult = ref(null);
const isSearching = ref(false);
const activeTab = ref('list');

const friendList = ref([]);
const requestList = ref([]);
const pendingCount = ref(0);

// --- 1. ✨ 数据初始化加载逻辑 ---
const loadSocialData = async () => {
  try {
    // 同时获取好友列表和待处理申请
    const [friendsRes, requestsRes] = await Promise.all([
      axios.get(`${API_BASE}/api/board/profile/my_friends/`, { withCredentials: true }),
      axios.get(`${API_BASE}/api/board/profile/my_requests/`, { withCredentials: true })
    ]);
    
    friendList.value = friendsRes.data;
    requestList.value = requestsRes.data;
    pendingCount.value = requestsRes.data.length;
  } catch (err) {
    console.error("加载数据失败:", err);
  }
};

// 页面加载完成后立即执行
onMounted(() => {
  loadSocialData();
});

// --- 2. 搜索逻辑 ---
const handleSearch = async () => {
  const cleanId = searchId.value.toString().trim();
  if (!cleanId) return;

  isSearching.value = true;
  searchResult.value = null;

  try {
    const res = await axios.get(`${API_BASE}/api/board/profile/`, {
      params: { uid: cleanId },
      withCredentials: true
    });
    
    if (res.data && (res.data.uid || res.data.id)) {
      searchResult.value = res.data;
    } else {
      alert("🔍 未找到该用户");
    }
  } catch (err) {
    console.error("搜索失败:", err);
    alert("🔍 未找到该用户");
  } finally {
    isSearching.value = false;
  }
};

// --- 3. 发送好友申请 ---
const sendFriendRequest = async (uid) => {
  try {
    const res = await axios.post(`${API_BASE}/api/board/profile/add_friend/`, 
      { to_uid: uid },
      { withCredentials: true }
    );
    alert(`✅ ${res.data.message || '申请已发送'}`);
    searchResult.value = null;
    searchId.value = '';
    loadSocialData(); // 发送完刷新一下，虽然通常不会立刻体现在列表里
  } catch (err) {
    alert(`❌ 发送失败: ${err.response?.data?.error || '服务器忙'}`);
  }
};

// --- 4. ✨ 处理申请逻辑 (同意/忽略) ---
const handleRequest = async (reqId, action) => {
  try {
    const res = await axios.post(`${API_BASE}/api/board/profile/handle_request/`, 
      { req_id: reqId, action: action },
      { withCredentials: true }
    );
    
    alert(action === 'accept' ? "🤝 你们已经是好友啦！" : "🗑️ 已忽略");
    // 成功处理后，重新加载所有列表数据
    loadSocialData();
  } catch (err) {
    console.error("处理失败:", err);
    alert("⚠️ 操作失败，请重试");
  }
};

const formatUrl = (url) => {
  if (!url) return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
};
</script>

<style scoped>
/* 保持你提供的 CSS 样式完全一致 */
.friends-container { padding: 20px; display: flex; justify-content: center; background: #f8fafc; min-height: calc(100vh - 60px); }
.friends-card { background: white; width: 100%; max-width: 480px; border-radius: 24px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.friends-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.friends-header h2 { margin: 0; font-size: 20px; color: #333; }
.my-id-badge { background: #eef2ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }
.search-bar { display: flex; gap: 10px; margin-bottom: 16px; }
.search-bar input { flex: 1; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.3s; }
.search-bar input:focus { border-color: #42b983; box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1); }
.search-bar button { background: #42b983; color: white; border: none; padding: 0 20px; border-radius: 12px; cursor: pointer; font-weight: bold; transition: 0.2s; }
.search-bar button:active { transform: scale(0.95); }
.search-result-card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.user-brief { display: flex; align-items: center; gap: 12px; }
.mini-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: white; }
.text-info .name { margin: 0; font-weight: bold; font-size: 15px; }
.text-info .id { margin: 0; font-size: 12px; color: #666; }
.add-btn { background: #42b983; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: bold; }
.tabs { display: flex; border-bottom: 1px solid #f1f5f9; margin-bottom: 16px; }
.tab { flex: 1; text-align: center; padding: 12px; cursor: pointer; color: #94a3b8; font-weight: bold; position: relative; }
.tab.active { color: #42b983; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 25%; right: 25%; height: 3px; background: #42b983; border-radius: 3px; }
.badge { background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 4px; vertical-align: middle; }
.list-item { display: flex; align-items: center; padding: 16px 0; border-bottom: 1px solid #f8fafc; }
.item-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
.item-info { flex: 1; margin-left: 14px; }
.item-name { margin: 0; font-weight: 600; font-size: 15px; }
.item-status { margin: 0; font-size: 12px; color: #10b981; }
.action-btn { background: #f1f5f9; color: #475569; border: none; padding: 6px 16px; border-radius: 12px; font-size: 13px; cursor: pointer; }
.empty-hint { text-align: center; color: #94a3b8; padding: 40px 20px; font-size: 14px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
button:disabled { background: #cbd5e1; cursor: not-allowed; }
.request-actions { display: flex; gap: 8px; }
.accept-btn { background: #42b983; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.ignore-btn { background: #f1f5f9; color: #64748b; border: none; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
</style>