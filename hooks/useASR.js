// hooks/useASR.js
import { useState, useRef } from 'react';

export function useASR(onResult, onFinal) {
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);

  const startStreaming = async () => {
    // 1. 获取后端生成的鉴权信息
    const authRes = await fetch('/api/get-asr-token');
    const { token, timestamp, appId } = await authRes.json();

    // 2. 连接火山 WebSocket
    const url = `wss://openspeech.bytedance.com/api/v2/asr?appid=${appId}&token=${token}&timestamp=${timestamp}`;
    socketRef.current = new WebSocket(url);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.payload_msg && data.payload_msg.text) {
        const text = data.payload_msg.text;
        onResult(text); // 实时预览
        if (data.is_final) onFinal(text); // 句点触发处理
      }
    };

    // 3. 捕捉麦克风并转换为 16kHz PCM 格式
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContextRef.current = new AudioContext({ sampleRate: 16000 });
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    processor.onaudioprocess = (e) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        // 将浮点数转换为 16bit Int 流
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        socketRef.current.send(pcmData.buffer);
      }
    };
  };

  const stopStreaming = () => {
    socketRef.current?.close();
    audioContextRef.current?.close();
  };

  return { startStreaming, stopStreaming };
}
