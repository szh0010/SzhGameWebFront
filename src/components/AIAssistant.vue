<template>
  <div class="ai-assistant-container">
    <div v-if="!isOpen" class="ai-bubble" @click="isOpen = true">
      <span class="ai-icon">🤖</span>
      <div class="bubble-tip">AI 助手</div>
    </div>

    <div v-else class="ai-window">
      <div class="ai-window-header">
        <div class="header-info">
          <span class="status-dot"></span>
          <span>SZH 智能管家</span>
        </div>
        <button class="btn-close" @click="isOpen = false">×</button>
      </div>

      <div class="ai-messages" ref="messageBox">
        <div v-for="(msg, index) in messages" :key="index" :class="['msg-wrapper', msg.role]">
          <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="msg-content">{{ msg.content }}</div>
        </div>
        <div v-if="loading" class="msg-wrapper assistant">
          <div class="avatar">🤖</div>
          <div class="msg-content loading-dots">正在思考<span>.</span><span>.</span><span>.</span></div>
        </div>
      </div>

      <div class="ai-input-area">
        <input 
          v-model="inputText" 
          @keyup.enter="handleSend"
          placeholder="问点什么吧..." 
          :disabled="loading"
        />
        <button @click="handleSend" :disabled="loading || !inputText.trim()">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';
import { askAI } from '../utils/aiService';

const isOpen = ref(false);
const inputText = ref('');
const loading = ref(false);
const messageBox = ref(null);
const messages = ref([
  { role: 'assistant', content: '你好！我是你的 SZH 空间助手，有什么可以帮你的吗？' }
]);

// 自动滚动到底部
const scrollToBottom = async () => {
  await nextTick();
  if (messageBox.value) {
    messageBox.value.scrollTop = messageBox.value.scrollHeight;
  }
};

const handleSend = async () => {
  if (!inputText.value.trim() || loading.value) return;

  const userMsg = inputText.value;
  messages.value.push({ role: 'user', content: userMsg });
  inputText.value = '';
  loading.value = true;
  scrollToBottom();

  // 调用 DeepSeek 接口
  const reply = await askAI(userMsg, 'general');
  
  messages.value.push({ role: 'assistant', content: reply });
  loading.value = false;
  scrollToBottom();
};

// 监听打开状态，打开时自动滚动
watch(isOpen, (val) => { if (val) scrollToBottom(); });
</script>

<style scoped>
.ai-assistant-container { position: fixed; bottom: 80px; right: 20px; z-index: 9999; font-family: sans-serif; }

/* 悬浮球样式 */
.ai-bubble {
  width: 60px; height: 60px; background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.3s;
}
.ai-bubble:hover { transform: scale(1.1); }
.ai-icon { font-size: 30px; }
.bubble-tip { position: absolute; top: -30px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; }

/* 聊天窗口样式 */
.ai-window {
  width: 320px; height: 450px; background: #fff; border-radius: 12px;
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
}
.ai-window-header {
  background: #2c3e50; color: white; padding: 12px; display: flex; justify-content: space-between; align-items: center;
}
.status-dot { width: 8px; height: 8px; background: #2ecc71; border-radius: 50%; display: inline-block; margin-right: 6px; }

.ai-messages { flex: 1; padding: 15px; overflow-y: auto; background: #f7f9fc; }
.msg-wrapper { display: flex; margin-bottom: 15px; gap: 8px; }
.msg-wrapper.user { flex-direction: row-reverse; }
.msg-content { 
  max-width: 80%; padding: 10px; border-radius: 10px; font-size: 14px; line-height: 1.4;
  word-break: break-all;
}
.assistant .msg-content { background: #fff; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.user .msg-content { background: #007aff; color: #fff; }

.ai-input-area { padding: 10px; border-top: 1px solid #eee; display: flex; gap: 5px; }
.ai-input-area input { flex: 1; border: 1px solid #ddd; padding: 8px; border-radius: 20px; outline: none; }
.ai-input-area button { background: #007aff; color: white; border: none; padding: 0 15px; border-radius: 20px; cursor: pointer; }

/* 加载动画 */
.loading-dots span { animation: blink 1s infinite; margin-left: 2px; }
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0% { opacity: 0; } 100% { opacity: 1; } }
</style>