// src/utils/aiService.js
import axios from 'axios';

/**
 * 全站通用的 DeepSeek AI 调用工具（带页面上下文感知）
 * @param {string} message - 用户输入的内容
 * @param {string} type - 场景类型：'general', 'gomoku', 'sticky'
 * @param {string} page - 当前所在页面路径，默认自动获取
 * @returns {Promise<string>} - AI 的回复内容
 */
export const askAI = async (message, type = 'general', page = window.location.pathname) => {
  try {
    // 1. 获取本地存储的 Token
    const token = localStorage.getItem('token');

    // 2. 发送请求
    const response = await axios.post('/api/board/ai/chat/', 
      {
        message: message,
        type: type,
        page: page // ✨ 新增：将当前页面路径发送给后端
      },
      {
        headers: {
          // Django Token 认证规范
          'Authorization': token ? `Token ${token}` : ''
        }
      }
    );

    // 3. 解析结果
    if (response.data.status === 'success') {
      return response.data.reply;
    } else {
      console.warn('AI 业务错误:', response.data.message);
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('AI Service Error:', error);
    
    // 401 认证失败处理
    if (error.response && error.response.status === 401) {
      return '【系统消息】你的会话已过期，请重新登录后再与我聊天哦。';
    }

    return '【系统消息】小助手暂时走神了，请稍后再试。';
  }
};