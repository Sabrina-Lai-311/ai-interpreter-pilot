import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function InterpreterNotepad() {
  // --- 状态管理 ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]); // 存储已完成的句子
  const [currentSentence, setCurrentSentence] = useState(""); // 正在说的词
  const [terms, setTerms] = useState([]); // 术语库
  const [notes, setNotes] = useState(""); // 笔记区内容
  
  // --- 引用管理 (用于保持 WebSocket 和音频连接) ---
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);

  // --- 核心逻辑：触发 AI 处理 ---
  const triggerAI = async (text) => {
    if (!text || text.length < 2) return; // 太短就不处理

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      
      // 更新术语（置顶显示）
      if (data.terms && data.terms.length > 0) {
        setTerms(prev => [...data.terms, ...prev]);
      }
      // 更新笔记（换行追加）
      if (data.notes) {
        setNotes(prev => data.notes + "\n" + prev);
      }
    } catch (error) {
      console.error("AI处理出错:", error);
    }
  };

  // --- 语音转录核心引擎 ---
  const startRecording = async () => {
    try {
      // 1. 获取鉴权 Token
      const authRes = await fetch('/api/get-asr-token');
      const { token, timestamp, appId } = await authRes.json();

      // 2. 建立火山 WebSocket 连接
      const url = `wss://openspeech.bytedance.com/api/v2/asr?appid=${appId}&token=${token}&timestamp=${timestamp}`;
      socketRef.current = new WebSocket(url);

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.payload_msg && data.payload_msg.text) {
          const resultText = data.payload_msg.text;
          
          // 如果是正在识别中
          setCurrentSentence(resultText);

          // 如果火山判断这一句结束了 (is_final)
          if (data.is_final) {
            setTranscript(prev => [...prev, resultText]); // 存入历史区
            setCurrentSentence(""); // 清空实时区
            triggerAI(resultText); // 【方案B触发】立即送去给 AI 分析
          }
        }
      };

      // 3. 启动麦克风录音
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      processor.onaudioprocess = (e) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          socketRef.current.send(pcmData.buffer);
        }
      };

      setIsRecording(true);
    } catch (err) {
      alert("请允许麦克风权限或检查配置");
      console.error(err);
    }
  };

  const stopRecording = () => {
    socketRef.current?.close();
    audioContextRef.current?.close();
    setIsRecording(false);
    setCurrentSentence("");
  };

  // --- UI 界面渲染 ---
  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC]">
      <Head>
        <title>Interpreter Notepad | 智能同传笔记</title>
      </Head>

      {/* 顶部状态栏 */}
      <header className="h-16 bg-white border-b px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Interpreter Notepad
          </h1>
        </div>
        
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-10 py-2 rounded-full font-bold transition-all transform active:scale-95 ${
            isRecording 
            ? 'bg-red-50 text-red-600 border border-red-200' 
            : 'bg-blue-600 text-white shadow-lg hover:bg-blue-700'
          }`}
        >
          {isRecording ? '停止运行' : '开始实时同传'}
        </button>
      </header>

      {/* 主工作区 */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* 左侧：实时转录流 (60%) */}
        <section className="w-[60%] bg-white p-10 overflow-y-auto border-r shadow-inner">
          <div className="max-w-3xl mx-auto">
            <div className="text-[10px] text-slate-400 font-mono mb-6 uppercase tracking-[0.2em]">Live Transcript Stream</div>
            
            <div className="space-y-4 text-xl leading-relaxed text-slate-600">
              {/* 已完成的历史文本 */}
              {transcript.map((text, idx) => (
                <span key={idx} className="mr-2">{text}。</span>
              ))}
              
              {/* 正在生成的当前文本 */}
              <span className="text-blue-600 font-medium border-b-2 border-blue-100">
                {currentSentence}
              </span>
              
              {isRecording && <span className="inline-block w-1 h-6 ml-1 bg-blue-400 animate-blink" />}
            </div>
          </div>
        </section>

        {/* 右侧：AI 辅助区 (40%) */}
        <section className="w-[40%] flex flex-col bg-slate-50/30">
          
          {/* 上半部分：术语提示 */}
          <div className="h-1/2 p-8 border-b overflow-y-auto">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full" /> Glossary Radar
            </h2>
            <div className="grid gap-4">
              {terms.length === 0 && <p className="text-slate-300 italic text-sm">暂无术语识别...</p>}
              {terms.map((t, i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center animate-slideIn">
                  <span className="font-bold text-slate-800 text-lg">{t.word}</span>
                  <span className="text-blue-500 font-medium bg-blue-50 px-3 py-1 rounded-lg text-sm">{t.mean}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 下半部分：口译笔记 */}
          <div className="h-1/2 p-8 overflow-y-auto bg-[#FFFDF5]">
            <h2 className="text-xs font-black text-amber-500/60 uppercase tracking-widest mb-6">
              AI Shorthand / 笔记逻辑
            </h2>
            <pre className="font-serif text-2xl text-slate-700 whitespace-pre-wrap leading-loose">
              {notes || <span className="text-slate-300 italic text-sm font-sans">等待笔记生成...</span>}
            </pre>
          </div>

        </section>
      </main>

      <style jsx>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blink 1s infinite; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
