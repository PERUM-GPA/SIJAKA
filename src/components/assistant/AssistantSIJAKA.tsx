/**
 * SIJAKA - Sistem Informasi Jaminan Kematian
 * Jamaah Tahlil Ar Rohman RT 06, RT 07, RT 10 Perum GPA Ngijo
 * Assistant Phase 1 - UI Component
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  X,
  ChevronRight,
  User,
  HelpCircle,
  CreditCard,
  Users2,
  BookOpen,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { ActiveTab } from '../layout/Sidebar.tsx';

export interface SuggestedAction {
  label: string;
  action: 'NAVIGATE' | 'VIEW_IURAN' | 'VIEW_KELUARGA' | 'INFO' | 'OPEN_MODAL';
  target?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  category?: 'GENERAL' | 'NAVIGATION' | 'SELF_DATA' | 'HELP' | 'REDIRECT';
  suggestedActions?: SuggestedAction[];
  timestamp: Date;
}

interface AssistantSIJAKAProps {
  onNavigate?: (tab: ActiveTab) => void;
  isFloating?: boolean;
  onClose?: () => void;
}

const STARTER_PROMPTS = [
  'Bagaimana cara melihat iuran saya?',
  'Bagaimana melihat data keluarga saya?',
  'Di mana saya bisa melihat tunggakan iuran?',
  'Bagaimana cara menggunakan SIJAKA?',
];

export function AssistantSIJAKA({
  onNavigate,
  isFloating = false,
  onClose,
}: AssistantSIJAKAProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: "Assalamu'alaikum. Saya Asisten Resmi SIJAKA (Sistem Informasi Jaminan Kematian Ar Rohman). Saya siap membantu Anda mengenai informasi status iuran, susunan keluarga, panduan santunan kematian, maupun navigasi sistem.",
      category: 'GENERAL',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setInputMessage('');

    // Add user message to conversation area
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Security: Only send message. Server derives user identity and authorization strictly from session/JWT.
      const response = await api.assistant.chat({ message: query });

      if (response && response.success && response.data) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          text: response.data.message,
          category: response.data.category,
          suggestedActions: response.data.suggestedActions,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(response?.message || 'Gagal memproses pesan asisten.');
      }
    } catch (err: any) {
      console.error('Error sending message to assistant:', err);
      setErrorMessage(
        err.message || 'Terjadi gangguan saat menghubungi Asisten SIJAKA. Silakan coba kembali.'
      );
    } finally {
      setIsLoading(false);
      // Keep focus on input for convenience
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionClick = (action: SuggestedAction) => {
    if (action.action === 'VIEW_IURAN') {
      if (onNavigate) {
        onNavigate('iuran');
      } else {
        handleSendMessage('Bagaimana cara melihat iuran saya?');
      }
      return;
    }

    if (action.action === 'VIEW_KELUARGA') {
      if (onNavigate) {
        onNavigate('keluarga');
      } else {
        handleSendMessage('Bagaimana melihat data keluarga saya?');
      }
      return;
    }

    if (action.action === 'NAVIGATE' && action.target) {
      // Map route targets e.g. /iuran, /buku-kas, /anggota to ActiveTab
      const cleanTarget = action.target.replace(/^\//, '') as ActiveTab;
      if (onNavigate) {
        onNavigate(cleanTarget);
      }
      return;
    }

    if (action.action === 'INFO') {
      handleSendMessage(action.label);
    }
  };

  return (
    <div
      id="assistant-sijaka-card"
      className={`bg-white flex flex-col overflow-hidden ${
        isFloating
          ? 'h-full w-full'
          : 'rounded-2xl border border-slate-200/80 shadow-xs min-h-[580px] max-h-[820px] max-w-4xl mx-auto'
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 text-emerald-300">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">
                Asisten SIJAKA
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 font-medium">
              Bantuan informasi dan navigasi SIJAKA
            </p>
          </div>
        </div>

        {isFloating && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Asisten"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Percakapan Area */}
      <div
        id="assistant-messages-container"
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/70"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-emerald-700 shadow-xs'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-3.5 text-sm shadow-xs ${
                  isUser
                    ? 'bg-emerald-700 text-white rounded-tr-xs leading-relaxed'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs leading-relaxed'
                }`}
              >
                {/* Assistant Category Tag if present */}
                {!isUser && msg.category && (
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-100 text-slate-600 border border-slate-200">
                      {msg.category === 'SELF_DATA'
                        ? 'Data Anda'
                        : msg.category === 'NAVIGATION'
                        ? 'Navigasi'
                        : msg.category === 'REDIRECT'
                        ? 'Prosedur Resmi'
                        : msg.category === 'HELP'
                        ? 'Ketentuan'
                        : 'Informasi'}
                    </span>
                  </div>
                )}

                {/* Message Text */}
                <div className="whitespace-pre-line text-[13.5px] leading-relaxed">
                  {msg.text}
                </div>

                {/* Suggested Actions */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={`${msg.id}-action-${idx}`}
                        type="button"
                        onClick={() => handleActionClick(action)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70 transition-colors shadow-2xs"
                      >
                        {action.action === 'VIEW_IURAN' && <CreditCard className="w-3 h-3" />}
                        {action.action === 'VIEW_KELUARGA' && <Users2 className="w-3 h-3" />}
                        {action.action === 'NAVIGATE' && <BookOpen className="w-3 h-3" />}
                        {action.action === 'INFO' && <HelpCircle className="w-3 h-3" />}
                        <span>{action.label}</span>
                        <ChevronRight className="w-3 h-3 text-emerald-600" />
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-1.5 text-[10px] ${
                    isUser ? 'text-emerald-100 text-right' : 'text-slate-400 text-left'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[75%]">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <span className="flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>Asisten sedang menyiapkan jawaban...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Kendala Komunikasi</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md font-semibold shrink-0 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Ulangi</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts Bar */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200/80 shrink-0">
          <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Contoh pertanyaan awal:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={`starter-${idx}`}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="text-xs px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-left transition-colors shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Pertanyaan & Tombol Kirim */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/90 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            id="assistant-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pertanyaan Anda di sini..."
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 focus:bg-white text-slate-900 placeholder:text-slate-400 disabled:opacity-60 transition-all"
          />
          <button
            id="assistant-send-btn"
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
          >
            <span>Kirim</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="mt-2 text-[10px] text-slate-600 text-center">
          Asisten SIJAKA bersifat informatif & read-only. Seluruh transaksi dan keputusan mengikuti ketentuan resmi pengurus.
        </p>
      </div>
    </div>
  );
}
