import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function InterpreterNotepad() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // 全量文本
  const [currentSentence, setCurrentSentence] = useState(""); // 当前句
  const [terms, setTerms] = useState([]);
  const [notes, setNotes] = useState("");
  
  // 核心逻辑：监听当前句，发现句号则触发 AI
  useEffect(() => {
    const lastChar = currentSentence.trim().slice(-1);
    if (['。', '？', '！', '.', '?', '!'].includes(lastChar)) {
      triggerAI(currentSentence);
      setCurrentSentence(""); // 清空当前句缓冲
    }
  }, [currentSentence]);

  const triggerAI = async (text) => {
    // 调用后端 API 获取术语和笔记
    const response = await fetch('/api/process', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    setTerms(prev => [...data.terms, ...prev]); // 新术语置顶
    setNotes(prev => data.notes + "\n" + prev);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Head>
        <title>Interpreter Notepad | AI 同传助手</title>
      </Head>

      {/* Header */}
      <header className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <h1 className="font-bold text-slate-800 text-lg">Interpreter Notepad</h1>
        </div>
        <button 
          onClick={() => setIsRecording(!isRecording)}
          className={`px-8 py-2 rounded-full transition-all font-semibold ${
            isRecording ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-blue-600 text-white shadow-lg'
          }`}
        >
          {isRecording ? '停止运行' : '开始实时转录'}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左侧：转录流 (60%) */}
        <section className="w-[60%] bg-white p-8 overflow-y-auto border-r shadow-inner">
          <div className="max-w-2xl mx-auto">
            <div className="text-sm text-slate-400 mb-4 font-mono uppercase tracking-widest">Live Transcript</div>
            <div className="text-xl leading-relaxed text-slate-700 min-h-[500px]">
              {transcript}
              <span className="text-blue-500 font-semibold">{currentSentence}</span>
              <span className="animate-ping ml-1 text-blue-400">|</span>
            </div>
          </div>
        </section>

        {/* 右侧：AI 辅助 (40%) */}
        <section className="w-[40%] flex flex-col bg-slate-50/50">
          {/* 术语区 */}
          <div className="h-1/2 p-6 border-b overflow-y-auto">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Glossary Radar / 术语雷达</h2>
            <div className="grid gap-3">
              {terms.map((t, i) => (
                <div key={i} className="bg-white p-3 rounded shadow-sm border-l-4 border-blue-500 flex justify-between">
                  <span className="font-bold text-slate-800">{t.word}</span>
                  <span className="text-slate-500 text-sm">{t.mean}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 笔记区 */}
          <div className="h-1/2 p-6 overflow-y-auto bg-yellow-50/20">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Short-hand / 口译笔记</h2>
            <pre className="font-mono text-xl text-slate-800 whitespace-pre-wrap leading-loose">
              {notes}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}
