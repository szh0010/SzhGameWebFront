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
            id="friend-search-input"
            name="friend-id-search"
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
              <div class="avatar-wrapper">
                <img :src="formatUrl(searchResult.avatar)" class="item-avatar" />
              </div>
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
            <div class="avatar-wrapper">
              <img :src="formatUrl(friend.avatar)" class="item-avatar" />
              <transition name="scale">
                <span v-if="unreadCounts[Number(friend.uid)] > 0" class="msg-badge">
                  {{ unreadCounts[Number(friend.uid)] > 99 ? '99+' : unreadCounts[Number(friend.uid)] }}
                </span>
              </transition>
            </div>

            <div class="item-info">
              <p class="item-name">{{ friend.nickname || friend.username }}</p>
              <p :class="['item-status', getFriendStatus(friend.uid) ? 'status-online' : 'status-offline']">
                {{ getFriendStatus(friend.uid) ? '● 在线' : '○ 离线' }}
              </p>
            </div>
            <div class="item-actions">
              <button class="chat-btn" @click="goToChat(friend.uid)">💬 私聊</button>
              <button class="action-btn" @click="startGomoku(friend.uid)">对战</button>
            </div>
          </div>
          <p v-if="friendList.length === 0" class="empty-hint">暂无好友，快去搜索 ID 结识新朋友吧！</p>
        </div>

        <div v-if="activeTab === 'requests'" class="list-wrapper">
          <div v-for="req in requestList" :key="req.request_id" class="list-item">
            
            <div class="avatar-wrapper">
              <img :src="formatUrl(req.avatar)" class="item-avatar" />
            </div>

            <div class="item-info">
              <p class="item-name"><b>{{ req.nickname || req.username }}</b> (UID: {{ req.uid }})</p>
              <p class="item-time">申请加你为好友 · {{ formatDate(req.created_at) }}</p>
            </div>

            <div class="request-actions">
              <button class="accept-btn" @click="handleRequest(req.request_id, 'accept')">同意</button>
              <button class="ignore-btn" @click="handleRequest(req.request_id, 'reject')">忽略</button>
            </div>
          </div>
          <p v-if="requestList.length === 0" class="empty-hint">目前没有新的好友申请</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { socketStore, useSocket } from '../store/socket'; 

const router = useRouter();
const { connect } = useSocket();

const getBaseUrl = () => {
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000`;
  }
  return `${protocol}//${hostname}`;
};
const API_BASE_URL = getBaseUrl();

const formatUrl = (url) => {
  if (!url) return 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix';
  
  if (url.startsWith('http')) {
      if (url.includes('api.dicebear.com')) return url;
  }
  
  let path = url;
  if (url.includes('/media/')) {
    path = '/media/' + url.split('/media/').pop();
  }
  
  const { protocol, hostname } = window.location;
  let targetHost = hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    targetHost = '47.98.240.67'; 
  }
  
  const base = `${protocol}//${targetHost}`;
  const finalPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${finalPath}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '刚刚';
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const searchId = ref('');
const searchResult = ref(null);
const isSearching = ref(false);
const activeTab = ref('list');
const myUid = ref(localStorage.getItem('user_id') || '----');
const friendList = ref([]);
const requestList = ref([]);
const pendingCount = ref(0);

const unreadCounts = computed(() => socketStore.unreadCounts || {});

const getFriendStatus = (uid) => {
  return socketStore.isFriendOnline[Number(uid)] || false;
};

const loadSocialData = async () => {
  try {
    const [friendsRes, requestsRes] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/board/profile/my_friends/`, { withCredentials: true }),
      axios.get(`${API_BASE_URL}/api/board/profile/my_requests/`, { withCredentials: true })
    ]);
    
    friendList.value = friendsRes.data;
    friendsRes.data.forEach(friend => {
      socketStore.isFriendOnline[Number(friend.uid)] = friend.is_online;
    });

    requestList.value = requestsRes.data;
    pendingCount.value = requestsRes.data.length;
    socketStore.pendingRequestsCount = requestsRes.data.length;
    
  } catch (err) {
    console.error("加载数据失败:", err);
  }
};

onMounted(() => {
  connect();
  loadSocialData();
});

const goToChat = (uid) => router.push(`/chat/${uid}`);
const startGomoku = (uid) => router.push({ name: 'room-selection', params: { gameId: 'gomoku' } });

const handleSearch = async () => {
  const cleanId = searchId.value.toString().trim();
  if (!cleanId) return;
  isSearching.value = true;
  searchResult.value = null;

  try {
    const res = await axios.get(`${API_BASE_URL}/api/board/profile/`, {
      params: { uid: cleanId },
      withCredentials: true
    });
    const data = Array.isArray(res.data) ? res.data[0] : res.data;
    if (data && (data.uid || data.id)) {
      searchResult.value = data;
    } else {
      alert("🔍 未找到该用户");
    }
  } catch (err) {
    alert(`🔍 ${err.response?.data?.error || "未找到该用户"}`);
  } finally {
    isSearching.value = false;
  }
};

const sendFriendRequest = async (uid) => {
  try {
    const res = await axios.post(`${API_BASE_URL}/api/board/profile/add_friend/`, 
      { to_uid: Number(uid) },
      { withCredentials: true }
    );
    alert(`✅ ${res.data.message || '申请已发送'}`);
    searchResult.value = null;
    searchId.value = '';
    loadSocialData();
  } catch (err) {
    alert(`❌ 发送失败: ${err.response?.data?.error || '服务器忙'}`);
  }
};

const handleRequest = async (reqId, action) => {
  try {
    // ✨ 核心修复：req_id 改为 request_id，对齐后端暗号！
    await axios.post(`${API_BASE_URL}/api/board/profile/handle_request/`, 
      { request_id: reqId, action: action },
      { withCredentials: true }
    );
    alert(action === 'accept' ? "🤝 你们已经是好友啦！" : "🗑️ 已忽略");
    loadSocialData();
  } catch (err) {
    alert("⚠️ 操作失败，请重试");
  }
};
</script>

<style scoped>
.friends-container { padding: 20px; display: flex; justify-content: center; background: #f8fafc; min-height: calc(100vh - 60px); }
.friends-card { background: white; width: 100%; max-width: 480px; border-radius: 24px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
.friends-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.friends-header h2 { margin: 0; font-size: 20px; color: #333; }
.my-id-badge { background: #eef2ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; }

.avatar-wrapper { 
  position: relative; 
  display: inline-block; 
  flex-shrink: 0; 
  width: 48px; 
  height: 48px; 
}
.item-avatar { 
  width: 100%; 
  height: 100%; 
  border-radius: 50%; 
  object-fit: cover; 
  border: 2px solid #fff; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
  display: block;
}

.msg-badge {
  position: absolute; top: -2px; right: -2px; background: #ff4d4f; color: white;
  font-size: 10px; font-weight: bold; min-width: 18px; height: 18px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center; border: 2px solid #fff; padding: 0 4px;
}

.search-bar { display: flex; gap: 10px; margin-bottom: 16px; }
.search-bar input { flex: 1; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px; outline: none; transition: 0.3s; }
.search-bar input:focus { border-color: #42b983; box-shadow: 0 0 0 3px rgba(66, 185, 131, 0.1); }
.search-bar button { background: #42b983; color: white; border: none; padding: 0 20px; border-radius: 12px; cursor: pointer; font-weight: bold; transition: 0.2s; }

.search-result-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;
  margin-top: 10px; margin-bottom: 20px;
}
.user-brief { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.text-info { flex: 1; min-width: 0; }
.text-info .name { margin: 0; font-weight: bold; font-size: 15px; color: #166534; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.text-info .id { margin: 0; font-size: 12px; color: #15803d; margin-top: 2px; }
.add-btn { background: #22c55e; color: white; border: none; padding: 6px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; font-weight: bold; flex-shrink: 0; }

.tabs { display: flex; border-bottom: 1px solid #f1f5f9; margin-bottom: 16px; }
.tab { flex: 1; text-align: center; padding: 12px; cursor: pointer; color: #94a3b8; font-weight: bold; position: relative; }
.tab.active { color: #42b983; }
.tab.active::after { content: ''; position: absolute; bottom: 0; left: 25%; right: 25%; height: 3px; background: #42b983; border-radius: 3px; }
.badge { background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 4px; vertical-align: middle; }

.list-item { display: flex; align-items: center; padding: 16px 0; border-bottom: 1px solid #f8fafc; }
.item-info { flex: 1; margin-left: 14px; min-width: 0; }
.item-name { margin: 0; font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-status { margin: 0; font-size: 11px; margin-top: 4px; }
.item-time { margin: 0; font-size: 12px; color: #94a3b8; margin-top: 4px; }
.status-online { color: #10b981; font-weight: bold; }
.status-offline { color: #94a3b8; }

.item-actions { display: flex; gap: 8px; flex-shrink: 0; }
.chat-btn { background: #e0f2fe; color: #0369a1; border: none; padding: 6px 12px; border-radius: 12px; font-size: 13px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.chat-btn:hover { background: #bae6fd; }
.action-btn { background: #f1f5f9; color: #475569; border: none; padding: 6px 12px; border-radius: 12px; font-size: 13px; cursor: pointer; font-weight: 600; }

.scale-enter-active, .scale-leave-active { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s; }
.scale-enter-from, .scale-leave-to { transform: scale(0); opacity: 0; }

.empty-hint { text-align: center; color: #94a3b8; padding: 40px 20px; font-size: 14px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
button:disabled { background: #cbd5e1; cursor: not-allowed; }

.request-actions { display: flex; gap: 8px; flex-shrink: 0; }
.accept-btn { background: #42b983; color: white; border: none; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; }
.ignore-btn { background: #f1f5f9; color: #64748b; border: none; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; }
</style>