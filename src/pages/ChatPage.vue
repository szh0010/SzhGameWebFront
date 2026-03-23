<template>
  <div class="chat-wrapper">
    <div class="chat-header">
      <button class="back-icon" @click="$router.back()">❮</button>
      <div class="header-info">
        <span class="friend-name">{{ friendName }}</span>
      </div>
      <div class="header-ops">...</div>
    </div>

    <div class="message-container" ref="scrollContainer">
      <div v-for="msg in messages" :key="msg.id" 
           :class="['msg-row', msg.sender == currentUserId ? 'msg-me' : 'msg-other']">
        <div class="avatar">{{ msg.sender_name?.charAt(0) || '?' }}</div>
        <div class="msg-content-box">
          <div class="msg-text">{{ msg.content }}</div>
          <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>
    </div>

    <div class="input-panel">
      <input 
        v-model="newMessage" 
        @keyup.enter="handleSend" 
        placeholder="发送消息..." 
        type="text"
      />
      <button @click="handleSend" :class="{ 'active': newMessage.trim() }">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const scrollContainer = ref(null);

// 数据状态
const friendId = route.params.friendId;
const currentUserId = localStorage.getItem('user_id');
const friendName = ref('加载中...');
const messages = ref([]);
const newMessage = ref('');
let socket = null;

// 1. 加载历史记录
const loadHistory = async () => {
  try {
    const res = await axios.get(`/api/board/chat/history/${friendId}/`);
    messages.value = res.data;
    // 如果历史记录里有对方的名字，更新一下顶部
    if (res.data.length > 0) {
      const firstOther = res.data.find(m => m.sender != currentUserId);
      if (firstOther) friendName.value = firstOther.sender_name;
    }
    await scrollToBottom();
  } catch (err) {
    console.error("无法获取历史记录", err);
  }
};

// 2. 建立 WebSocket 连接
const connectWS = () => {
  const isHttps = window.location.protocol === 'https:';
  const wsUrl = `${isHttps ? 'wss' : 'ws'}://${window.location.host}/ws/chat/`;
  
  socket = new WebSocket(wsUrl);

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    // 核心过滤逻辑：只显示属于当前对话双方的消息
    if (data.sender_id == friendId || data.sender_id == currentUserId) {
      messages.value.push({
        id: Date.now(),
        sender: data.sender_id,
        sender_name: data.sender_name,
        content: data.message,
        timestamp: new Date().toISOString()
      });
      scrollToBottom();
    }
  };

  socket.onclose = () => console.log("聊天连接已断开");
};

// 3. 发送消息
const handleSend = () => {
  if (!newMessage.value.trim() || !socket) return;
  
  socket.send(JSON.stringify({
    'receiver_id': friendId,
    'message': newMessage.value
  }));
  
  newMessage.value = '';
};

// 工具：自动滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

const formatTime = (ts) => {
  const date = new Date(ts);
  return date.getHours().toString().padStart(2, '0') + ':' + 
         date.getMinutes().toString().padStart(2, '0');
};

onMounted(() => {
  loadHistory();
  connectWS();
});

onUnmounted(() => {
  if (socket) socket.close();
});
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f0f2f5;
  font-family: -apple-system, system-ui, sans-serif;
}

/* 顶部导航 */
.chat-header {
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  padding: 0 15px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  z-index: 10;
}
.back-icon {
  border: none; background: none; font-size: 20px; cursor: pointer; color: #555;
}
.header-info { 
  margin-left: 15px; 
  flex: 1; 
  display: flex; 
  flex-direction: column; 
  justify-content: center; /* 确保名字垂直居中 */
}
.friend-name { font-weight: 600; font-size: 16px; color: #333; }

/* 消息区 */
.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.msg-row { display: flex; gap: 10px; max-width: 85%; }
.msg-me { align-self: flex-end; flex-direction: row-reverse; }
.msg-other { align-self: flex-start; }

.avatar {
  width: 35px; height: 35px; background: #007aff; color: #fff;
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 14px; flex-shrink: 0;
}
.msg-me .avatar { background: #07c160; }

.msg-content-box { display: flex; flex-direction: column; gap: 4px; }
.msg-me .msg-content-box { align-items: flex-end; }

.msg-text {
  padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5;
  word-break: break-all;
}
.msg-me .msg-text { background: #95ec69; color: #000; border-top-right-radius: 2px; }
.msg-other .msg-text { background: #fff; color: #333; border-top-left-radius: 2px; }

.msg-time { font-size: 10px; color: #999; }

/* 输入栏 */
.input-panel {
  padding: 15px; background: #fff; display: flex; gap: 10px;
  border-top: 1px solid #eee; padding-bottom: calc(15px + env(safe-area-inset-bottom));
}
input {
  flex: 1; padding: 12px 15px; border: 1px solid #eee; border-radius: 20px;
  background: #f9f9f9; outline: none; transition: 0.3s;
}
input:focus { background: #fff; border-color: #07c160; }
button {
  padding: 0 20px; border: none; border-radius: 20px; background: #eee;
  color: #999; font-weight: 600; cursor: not-allowed; transition: 0.3s;
}
button.active { background: #07c160; color: #fff; cursor: pointer; }
</style>