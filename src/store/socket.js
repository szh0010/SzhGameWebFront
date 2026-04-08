// src/store/socket.js
import { reactive, computed } from 'vue'

// --- 1. 全局状态存储 (唯一真理来源) ---
export const socketStore = reactive({
  socket: null,
  isFriendOnline: {},      // 格式: { 10001: true }
  unreadMessages: [],      // 原始消息记录
  unreadCounts: {},        // ✨ 这里的 Key 是动态增加的，需要小心处理
  pendingRequestsCount: 0, // 待处理的好友申请
  isConnected: false
})

// --- 2. 逻辑封装 ---
export const useSocket = () => {
  
  /**
   * ✨ 强化版：汇总所有未读聊天消息
   * 通过显式遍历 Object.keys 来强制 Vue 的响应式系统收集依赖
   */
  const totalUnreadCount = computed(() => {
    let total = 0;
    const keys = Object.keys(socketStore.unreadCounts);
    for (const key of keys) {
      total += (Number(socketStore.unreadCounts[key]) || 0);
    }
    return total;
  });

  /**
   * ✨ 全局红点显示开关
   */
  const hasGlobalFriendNotify = computed(() => {
    return totalUnreadCount.value > 0 || socketStore.pendingRequestsCount > 0;
  });

  /**
   * 声音提醒：修复了链接并添加了更加健壮的错误处理
   */
  const playNotificationSound = () => {
    // 换成一个更短促、加载更快的提示音
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.volume = 0.4;
    audio.play().catch(() => {
      // 这里的报错通常是由于用户还没跟页面互动过，浏览器禁止自动播放声音
      // 只要用户在页面点过任意地方，之后就能响了，不影响主逻辑
    });
  };

  /**
   * 私聊未读计数逻辑
   */
  const handleUnreadLogic = (data) => {
    const senderId = Number(data.sender_id);
    const currentUserId = Number(localStorage.getItem('user_id'));

    if (senderId !== currentUserId) {
      const chatPath = `/chat/${senderId}`;
      const isCurrentlyChatting = window.location.hash.includes(chatPath) || 
                                  window.location.pathname.includes(chatPath);

      if (!isCurrentlyChatting) {
        // ✨ 关键修复：显式初始化并更新，确保 Vue 监听到新 Key 的加入
        if (!(senderId in socketStore.unreadCounts)) {
          socketStore.unreadCounts[senderId] = 0;
        }
        socketStore.unreadCounts[senderId] += 1;
        
        playNotificationSound();
        console.log(`[Socket] 📩 数据已更新：${senderId} 的未读数变为 ${socketStore.unreadCounts[senderId]}`);
      }
    }
  };

  /**
   * 建立 WebSocket 连接
   */
  const connect = () => {
    if (socketStore.socket) {
      if (socketStore.socket.readyState === WebSocket.OPEN || 
          socketStore.socket.readyState === WebSocket.CONNECTING) {
        return;
      }
    }

    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
      console.warn("[Socket] ⚠️ 未找到 Token，连接请求被拦截。");
      return;
    }

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const wsUrl = isDev 
      ? `ws://127.0.0.1:8000/ws/chat/?token=${token.trim()}`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/chat/?token=${token.trim()}`;

    console.log("[Socket] 🚀 正在开启全局实时通讯流水线...");
    socketStore.socket = new WebSocket(wsUrl);

    socketStore.socket.onopen = () => {
      socketStore.isConnected = true;
      console.log("[Socket] ✅ 全局 WebSocket 连接已达成");
    };

    socketStore.socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        
        if (data.type === 'status_update') {
          socketStore.isFriendOnline[Number(data.uid)] = !!data.is_online;
        }

        if (data.type === 'new_message') {
          socketStore.unreadMessages.push(data);
          handleUnreadLogic(data);
          window.dispatchEvent(new CustomEvent('new-global-msg', { detail: data }));
        }

        if (data.type === 'new_friend_request') {
          socketStore.pendingRequestsCount += 1;
          playNotificationSound();
          console.log("[Socket] 👥 监测到新的好友申请");
        }

        if (data.type === 'game_invite') {
          window.dispatchEvent(new CustomEvent('game-request-received', { detail: data }));
        }
        
        if (data.type === 'game_invite_rejected') {
          alert(`${data.sender_name || '对方'} 拒绝了挑战`);
        }
        
        if (data.type === 'game_invite_accepted') {
          window.dispatchEvent(new CustomEvent('game-start-redirect', { 
            detail: { roomId: data.room_id, gameId: data.game_type || 'gomoku' } 
          }));
        }

      } catch (err) {
        console.error("[Socket] 数据包解析失败:", err);
      }
    };

    socketStore.socket.onclose = (e) => {
      socketStore.isConnected = false;
      socketStore.socket = null;
      if (localStorage.getItem('token')) {
        setTimeout(() => connect(), 5000); // 掉线自动重连
      }
    };
  };

  const send = (data) => {
    if (socketStore.socket && socketStore.socket.readyState === WebSocket.OPEN) {
      socketStore.socket.send(JSON.stringify(data));
    } else {
      connect();
    }
  };

  /**
   * ✨ 清空未读数
   */
  const clearUnread = (uid) => {
    const userId = Number(uid);
    if (socketStore.unreadCounts[userId] !== undefined) {
      socketStore.unreadCounts[userId] = 0;
      console.log(`[Socket] 🧹 已归零用户 ${userId} 的未读计数`);
    }
  };

  return { 
    connect, 
    send, 
    clearUnread, 
    socketStore,
    totalUnreadCount,
    hasGlobalFriendNotify 
  }
}