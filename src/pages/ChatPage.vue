<template>
  <div class="chat-wrapper">
    <div class="chat-header">
      <button class="back-icon" @click="$router.back()">❮</button>
      <div class="header-info">
        <span class="friend-name">{{ friendName }}</span>
        <span :class="['status-label', isFriendOnline ? 'online' : 'offline']">
          {{ isFriendOnline ? '● 在线' : '○ 离线' }}
        </span>
      </div>
      <div class="header-ops">...</div>
    </div>

    <div class="message-container" ref="scrollContainer">
      <div v-for="msg in messages" :key="msg.id" 
           :class="['msg-row', Number(msg.sender_id) === currentUserId ? 'msg-me' : 'msg-other']">
        <div class="avatar">{{ msg.sender_name?.charAt(0) || '?' }}</div>
        <div class="msg-content-box">
          <div class="msg-text">{{ msg.content || msg.message }}</div>
          <div class="msg-time">{{ formatTime(msg.timestamp || msg.time) }}</div>
        </div>
      </div>
    </div>

    <div class="input-panel">
      <input 
        id="chat-message-input"
        name="chat-message"
        v-model="newMessage" 
        @keyup.enter="handleSend" 
        placeholder="发送消息..." 
        type="text"
        autocomplete="off"
      />
      <button @click="handleSend" :class="{ 'active': newMessage.trim() }">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
// 从全局 Socket 仓库获取状态和连接方法
import { socketStore, useSocket } from '../store/socket'; 

const route = useRoute();
const { connect, clearUnread } = useSocket(); // ✨ 引入 clearUnread 方法
const scrollContainer = ref(null);

// --- 数据状态 ---
// 将 friendId 改为响应式，以便在路由切换时更新
const friendId = ref(Number(route.params.uid || route.params.friendId)); 
const currentUserId = Number(localStorage.getItem('user_id'));
const friendName = ref('加载中...');
const messages = ref([]);
const newMessage = ref('');

/**
 * ✨ 在线状态计算属性
 */
const isFriendOnline = computed(() => socketStore.isFriendOnline[friendId.value] || false);

/**
 * 1. 加载历史聊天记录
 */
const loadHistory = async () => {
  try {
    const targetId = friendId.value;
    const [historyRes, friendsRes] = await Promise.all([
      axios.get(`/api/board/chat/history/${targetId}/`),
      axios.get('/api/board/profile/my_friends/') 
    ]);

    messages.value = historyRes.data.map(m => ({
      ...m,
      sender_id: Number(m.sender), 
      content: m.content
    }));
    
    const friendData = friendsRes.data.find(f => Number(f.uid) === targetId);
    if (friendData) {
      friendName.value = friendData.nickname || friendData.username;
      socketStore.isFriendOnline[targetId] = friendData.is_online;
    }

    await scrollToBottom();
  } catch (err) {
    console.error("[ChatPage] 初始化数据失败:", err);
  }
};

/**
 * ✨ 清理未读消息计数
 */
const handleClearUnread = () => {
  if (friendId.value) {
    clearUnread(friendId.value);
    console.log(`[ChatPage] 已清空与用户 ${friendId.value} 的未读计数`);
  }
};

/**
 * 2. 处理实时消息到达
 */
const handleGlobalMsg = (e) => {
  const data = e.detail;
  if (data.type === 'new_message') {
    const sId = Number(data.sender_id);
    const rId = Number(data.receiver_id);
    const currentFriendId = friendId.value;

    if (sId === currentFriendId || (sId === currentUserId && rId === currentFriendId)) {
      messages.value.push({
        id: Date.now(),
        sender_id: sId,
        sender_name: data.sender_name,
        content: data.message,
        timestamp: new Date().toISOString()
      });
      scrollToBottom();
      
      // ✨ 既然已经在聊天窗口内收到了，再次触发清理确保状态同步
      handleClearUnread();
    }
  }
};

/**
 * 3. 发送消息逻辑
 */
const handleSend = () => {
  const text = newMessage.value.trim();
  if (!text) return;
  
  const ws = socketStore.socket;
  if (ws && ws.readyState === WebSocket.OPEN) {
    const payload = {
      type: 'new_message',      
      receiver_id: friendId.value,    
      message: text 
    };
    
    ws.send(JSON.stringify(payload));
    newMessage.value = '';
  } else {
    alert("实时连接已断开，请稍后重试");
    connect();
  }
};

/**
 * 自动滚动到底部
 */
const scrollToBottom = async () => {
  await nextTick();
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

const formatTime = (ts) => {
  if (!ts) return '';
  const date = new Date(ts);
  return date.getHours().toString().padStart(2, '0') + ':' + 
         date.getMinutes().toString().padStart(2, '0');
};

// --- ✨ 路由监听：处理切换聊天对象的情况 ---
watch(() => route.params.uid || route.params.friendId, (newVal) => {
  if (newVal) {
    friendId.value = Number(newVal);
    loadHistory();       // 重新加载新好友的历史记录
    handleClearUnread(); // 清理新好友的未读数
  }
});

// --- 生命周期 ---

onMounted(() => {
  connect();
  loadHistory();
  handleClearUnread(); // ✨ 进入页面即清理未读
  window.addEventListener('new-global-msg', handleGlobalMsg);
});

onUnmounted(() => {
  window.removeEventListener('new-global-msg', handleGlobalMsg);
});
</script>

<style scoped>
/* 样式部分保持不变 */
.chat-wrapper { display: flex; flex-direction: column; height: 100vh; background: #f0f2f5; }
.chat-header { height: 60px; background: #fff; display: flex; align-items: center; padding: 0 15px; border-bottom: 1px solid #eee; flex-shrink: 0; z-index: 10; }
.back-icon { border: none; background: none; font-size: 20px; cursor: pointer; color: #555; }
.header-info { margin-left: 10px; flex: 1; display: flex; flex-direction: column; }
.friend-name { font-weight: 600; font-size: 16px; color: #333; }
.status-label { font-size: 11px; margin-top: 2px; }
.status-label.online { color: #07c160; font-weight: bold; }
.status-label.offline { color: #999; }

.message-container { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.msg-row { display: flex; gap: 10px; max-width: 85%; }
.msg-me { align-self: flex-end; flex-direction: row-reverse; }
.msg-other { align-self: flex-start; }

.avatar { width: 36px; height: 36px; background: #007aff; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; }
.msg-me .avatar { background: #07c160; }

.msg-content-box { display: flex; flex-direction: column; gap: 4px; }
.msg-me .msg-content-box { align-items: flex-end; }

.msg-text { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; word-break: break-all; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.msg-me .msg-text { background: #95ec69; color: #000; border-top-right-radius: 2px; }
.msg-other .msg-text { background: #fff; color: #333; border-top-left-radius: 2px; }

.msg-time { font-size: 10px; color: #bbb; }

.input-panel { padding: 10px 15px; background: #f7f7f7; display: flex; gap: 10px; border-top: 1px solid #ddd; padding-bottom: calc(10px + env(safe-area-inset-bottom)); }
input { flex: 1; padding: 10px 15px; border: 1px solid #ddd; border-radius: 20px; background: #fff; outline: none; }
button { padding: 0 18px; border: none; border-radius: 20px; background: #e1e1e1; color: #aaa; font-weight: 600; transition: 0.3s; }
button.active { background: #07c160; color: #fff; cursor: pointer; }
</style>