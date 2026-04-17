/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Link as LinkIcon, Loader2, AlertCircle, Video, Image as ImageIcon, User, Scissors, Wand2, Music, MessageSquare, FileText, Copy, Check, ClipboardPaste } from 'lucide-react';
import Markdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";

interface MediaResult {
  type: 'video' | 'image';
  title: string;
  desc: string;
  author: string;
  videoUrl?: string;
  coverUrl?: string;
  images?: string[];
}

export default function App() {
  const [url, setUrl] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MediaResult | null>(null);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [noWatermark, setNoWatermark] = useState(true);
  
  // Custom Watermark states
  const [customWatermarkType, setCustomWatermarkType] = useState<'none' | 'text' | 'image'>('none');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  
  // Edit states
  const [showEditor, setShowEditor] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(10);
  const [isEditing, setIsEditing] = useState(false);
  const [voiceoverScript, setVoiceoverScript] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentUrl = isBulkMode ? bulkUrls : url;
    if (!currentUrl.trim()) {
      setError(isBulkMode ? 'Vui lòng nhập danh sách link' : 'Vui lòng nhập link Xiaohongshu hoặc TikTok');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);
    setBulkResults([]);
    setShowEditor(false);

    try {
      if (isBulkMode) {
        const urls = bulkUrls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
        if (urls.length === 0) {
          setError('Vui lòng nhập ít nhất một link');
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/bulk-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls, noWatermark })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Đã xảy ra lỗi khi tải hàng loạt');
        setBulkResults(data.results);
      } else {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: url.trim(),
            noWatermark: noWatermark
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Đã xảy ra lỗi khi lấy dữ liệu');
        }

        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkUrls(content);
      setIsBulkMode(true);
    };
    reader.readAsText(file);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (isBulkMode) {
        setBulkUrls(text);
      } else {
        setUrl(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError('Không thể truy cập clipboard. Vui lòng dán thủ công.');
    }
  };

  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setWatermarkImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async (downloadUrl: string, filename: string) => {
    if (customWatermarkType === 'none') {
      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}`;
      window.location.href = proxyUrl;
      return;
    }

    if (customWatermarkType === 'image' && !watermarkImage) {
      setError('Vui lòng tải lên ảnh watermark');
      return;
    }
    if (customWatermarkType === 'text' && !watermarkText.trim()) {
      setError('Vui lòng nhập chữ watermark');
      return;
    }

    setIsEditing(true);
    setError('');
    try {
      const response = await fetch('/api/edit/custom-watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: downloadUrl,
          type: customWatermarkType,
          text: watermarkText,
          image: watermarkImage,
          filename
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Lỗi khi chèn watermark');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `watermarked_${filename}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Không thể tải video với watermark');
    } finally {
      setIsEditing(false);
    }
  };

  const handleAutoCut = () => {
    if (!result?.videoUrl) return;
    setIsEditing(true);
    const editUrl = `/api/edit/auto-cut?url=${encodeURIComponent(result.videoUrl)}&threshold=0.3`;
    window.location.href = editUrl;
    setTimeout(() => setIsEditing(false), 3000); // Reset state after a short delay
  };

  const handleTrim = () => {
    if (!result?.videoUrl) return;
    setIsEditing(true);
    const editUrl = `/api/edit/trim?url=${encodeURIComponent(result.videoUrl)}&start=${startTime}&end=${endTime}`;
    window.location.href = editUrl;
    setTimeout(() => setIsEditing(false), 3000);
  };

  const handleExtractAudio = () => {
    if (!result?.videoUrl) return;
    setIsEditing(true);
    const editUrl = `/api/edit/extract-audio?url=${encodeURIComponent(result.videoUrl)}`;
    window.location.href = editUrl;
    setTimeout(() => setIsEditing(false), 3000);
  };

  const handleAutoSubtitle = async () => {
    if (!result?.videoUrl) return;
    setIsEditing(true);
    setError('');
    
    try {
      // 1. Fetch video and convert to base64
      const videoResponse = await fetch(`/api/proxy-download?url=${encodeURIComponent(result.videoUrl)}`);
      if (!videoResponse.ok) throw new Error('Không thể tải video để tạo phụ đề');
      const blob = await videoResponse.blob();
      
      const base64Video = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 2. Call Gemini API from frontend to get SRT
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là một chuyên gia làm phụ đề video. Hãy nghe âm thanh/xem video đầu vào và tạo tệp phụ đề định dạng ASS (Advanced SubStation Alpha) với các yêu cầu sau:

1. Ngôn ngữ & Nội dung: Nếu ngôn ngữ gốc là tiếng Việt, hãy chép lời chính xác. Nếu là ngôn ngữ khác, hãy dịch sát nghĩa sang tiếng Việt. Chia nhỏ phụ đề một cách tự nhiên theo ngữ điệu (tối đa khoảng 10 từ mỗi dòng).

2. Cấu trúc File ASS: Bạn PHẢI xuất ra đầy đủ 3 phần chuẩn của một file ASS: [Script Info], [V4+ Styles], và [Events].
3. Cấu hình như sau:
- PlayResX: 1080
- PlayResY: 1920
- BorderStyle=3
- Alignment=2
- MarginV=30
- PrimaryColour=&H00FFFFFF 
- BackColour=&H00000000
- WrapStyle=0
- Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
- Style: Default,Arial,75,&H00FFFFFF,&H000000FF,&H0000A5FF,&H00000000,-1,0,0,0,100,100,0,0,3,10,0,2,10,10,120,1

4. Định dạng thời gian: Tuân thủ nghiêm ngặt chuẩn thời gian của ASS là H:MM:SS.cc (Giờ:Phút:Giây.Phần_trăm_giây, ví dụ: 0:01:23.45).

5. Định dạng Dòng thoại (Dialogue): Cấu trúc mỗi dòng trong phần [Events] phải tuân theo mẫu:
Dialogue: 0,Start_Time,End_Time,Default,,0,0,0,,Nội dung phụ đề

6. Định dạng hiển thị thêm (Tùy chọn): Nếu cần in nghiêng giọng nói suy nghĩ/nhạc, dùng thẻ {\i1}văn bản{\i0}.

7. Xử lý khoảng lặng: Nếu video hoàn toàn không có lời nói, xuất phần [Events] với một dòng duy nhất:
Dialogue: 0,0:00:00.00,0:00:02.00,Default,,0,0,0,,{\i1}[Không có tiếng]{\i0}

8. Định dạng xuất ra: CHỈ xuất ra văn bản định dạng ASS thô. Tuyệt đối KHÔNG bọc trong khối mã (code block như ass), không dùng Markdown, không có lời chào hay giải thích thừa.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: base64Video,
              mimeType: 'video/mp4'
            }
          },
          prompt
        ]
      });
      
      let srtText = aiResponse.text || '';
      srtText = srtText.replace(/^```srt\n/i, '').replace(/^```\n/i, '').replace(/\n```$/i, '').trim();
      
      if (!srtText) {
        srtText = "1\n00:00:00,000 --> 00:00:02,000\n[No Speech Detected]";
      }

      // 3. Send SRT to server to burn into video
      const burnUrl = `/api/edit/burn-subtitles?url=${encodeURIComponent(result.videoUrl)}&srt=${encodeURIComponent(srtText)}`;
      window.location.href = burnUrl;
      
      setTimeout(() => setIsEditing(false), 3000);
    } catch (err: any) {
      console.error('Auto subtitle error:', err);
      setError(err.message || 'Không thể tạo phụ đề');
      setIsEditing(false);
    }
  };

  const handleVoiceoverRewrite = async () => {
    if (!result?.videoUrl) return;
    setIsEditing(true);
    setVoiceoverScript('');
    setError('');
    
    try {
      // 1. Fetch video and convert to base64
      const videoResponse = await fetch(`/api/proxy-download?url=${encodeURIComponent(result.videoUrl)}`);
      if (!videoResponse.ok) throw new Error('Không thể tải video để phân tích');
      const blob = await videoResponse.blob();
      
      const base64Video = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 2. Call Gemini API from frontend
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Bạn là một chuyên gia biên kịch và lồng tiếng. Hãy xem video này và thực hiện các bước sau:
1. Phân tích nội dung hình ảnh và âm thanh gốc của video.
2. Viết lại kịch bản lời thoại (voice over) bằng tiếng Việt.
3. Yêu cầu quan trọng: Lời thoại mới phải bám sát nội dung video, hấp dẫn, tự nhiên và đặc biệt là phải có độ dài (số chữ/tốc độ nói) phù hợp hoàn hảo với thời lượng của video để khi lồng tiếng không bị quá nhanh hay quá chậm.
4. Trình bày kịch bản theo định dạng: Voiceover Script liên tục, không phân đoạn theo thời gian, không có timestamp, chỉ có nội dung lời thoại thuần túy.

Chỉ trả về nội dung kịch bản bằng tiếng Việt.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: base64Video,
              mimeType: 'video/mp4'
            }
          },
          prompt
        ]
      });
      
      setVoiceoverScript(aiResponse.text || '');
    } catch (err: any) {
      console.error('Voiceover rewrite error:', err);
      setError(err.message || 'Không thể kết nối đến Gemini API');
    } finally {
      setIsEditing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-red-200">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-red-100 rounded-2xl mb-4"
          >
            <Download className="w-8 h-8 text-red-600" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-neutral-950 mb-3"
          >
            Video Downloader
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-neutral-500"
          >
            Tải video không logo & hình ảnh chất lượng cao từ Tiểu Hồng Thư và TikTok
          </motion.p>
        </div>

        {/* Input Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-2">
            <button 
              onClick={() => setIsBulkMode(false)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!isBulkMode ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            >
              Tải đơn lẻ
            </button>
            <button 
              onClick={() => setIsBulkMode(true)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isBulkMode ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
            >
              Tải hàng loạt
            </button>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-neutral-200/60">
            <form onSubmit={handleFetch} className="relative flex flex-col">
              {!isBulkMode ? (
                <div className="relative flex items-center w-full">
                  <div className="absolute left-4 text-neutral-400">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Dán link Xiaohongshu, TikTok hoặc Douyin vào đây..."
                    className="w-full py-4 pl-12 pr-40 bg-transparent border-none focus:ring-0 text-neutral-800 placeholder:text-neutral-400 outline-none"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute right-4 p-2 text-neutral-400 hover:text-red-600 transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Dán từ clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    Dán
                  </button>
                </div>
              ) : (
                <div className="p-2 relative">
                  <textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="Dán danh sách link (mỗi link một dòng hoặc cách nhau bởi dấu phẩy)..."
                    className="w-full h-32 p-4 bg-neutral-50 rounded-xl border border-neutral-100 focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur shadow-sm border border-neutral-200 text-neutral-500 hover:text-red-600 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium"
                    title="Dán từ clipboard"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    Dán
                  </button>
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-xs text-neutral-500 cursor-pointer hover:text-red-600 flex items-center gap-1">
                      <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
                      <LinkIcon className="w-3 h-3" />
                      Tải lên từ file .txt
                    </label>
                  </div>
                </div>
              )}
              
              <button
                type="submit"
                disabled={isLoading || (isBulkMode ? !bulkUrls.trim() : !url.trim())}
                className={`mt-2 w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>{isBulkMode ? 'Bắt đầu tải hàng loạt' : 'Lấy dữ liệu'}</span>
                )}
              </button>
            </form>
          </div>

          <div className="flex flex-col items-center gap-4 px-4">
            <label className="relative inline-flex items-center cursor-pointer group">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={noWatermark}
                onChange={(e) => setNoWatermark(e.target.checked)}
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              <span className="ml-3 text-sm font-medium text-neutral-600 group-hover:text-neutral-900 transition-colors">Tải không logo (No Watermark)</span>
            </label>

            <div className="w-full max-w-md bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-neutral-800 font-semibold text-sm">
                <Wand2 className="w-4 h-4 text-red-600" />
                <span>Chèn Watermark riêng</span>
              </div>
              
              <div className="flex gap-2">
                {(['none', 'text', 'image'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setCustomWatermarkType(type)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                      customWatermarkType === type 
                        ? 'bg-red-50 border-red-200 text-red-600' 
                        : 'bg-neutral-50 border-neutral-100 text-neutral-500 hover:bg-neutral-100'
                    }`}
                  >
                    {type === 'none' ? 'Không' : type === 'text' ? 'Chữ' : 'Hình ảnh'}
                  </button>
                ))}
              </div>

              {customWatermarkType === 'text' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Nhập nội dung watermark..."
                    className="w-full p-2 text-sm bg-neutral-50 border border-neutral-100 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </motion.div>
              )}

              {customWatermarkType === 'image' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {watermarkImage ? (
                        <img src={watermarkImage} alt="Watermark preview" className="h-12 object-contain" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-neutral-400 mb-1" />
                          <p className="text-[10px] text-neutral-500">Tải ảnh logo (PNG/JPG)</p>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleWatermarkImageUpload} />
                  </label>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {bulkResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 mb-8"
            >
              <h3 className="text-lg font-semibold text-neutral-900 px-2">Kết quả tải hàng loạt ({bulkResults.length})</h3>
              <div className="grid grid-cols-1 gap-4">
                {bulkResults.map((res, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200/60 flex items-center gap-4">
                    <div className="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden shrink-0">
                      {res.success && res.data.coverUrl ? (
                        <img src={res.data.coverUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400">
                          {res.success ? <Video className="w-6 h-6" /> : <AlertCircle className="w-6 h-6 text-red-400" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-neutral-900 truncate">
                        {res.success ? res.data.title : 'Lỗi tải video'}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate">{res.url}</p>
                      {!res.success && <p className="text-xs text-red-500 mt-1">{res.error}</p>}
                    </div>
                    {res.success && (
                      <div className="flex gap-2">
                        {res.data.videoUrl && (
                          <button
                            onClick={() => handleDownload(res.data.videoUrl, `${res.data.title || 'video'}.mp4`)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Tải Video"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                        {res.data.images && res.data.images.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {res.data.images.slice(0, 3).map((img: string, i: number) => (
                              <button
                                key={i}
                                onClick={() => handleDownload(img, `image_${i}.jpg`)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Tải Ảnh"
                              >
                                <ImageIcon className="w-5 h-5" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-sm border border-neutral-200/60 overflow-hidden"
            >
              <div className="p-6 border-b border-neutral-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900 line-clamp-2 mb-2">
                      {result.title}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <User className="w-4 h-4" />
                      <span>{result.author}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-100 text-neutral-700 text-xs font-medium rounded-full">
                      {result.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      {result.type === 'video' ? 'Video' : 'Hình ảnh'}
                    </span>
                  </div>
                </div>
                {result.desc && (
                  <p className="mt-4 text-sm text-neutral-600 line-clamp-3 whitespace-pre-wrap">
                    {result.desc}
                  </p>
                )}
              </div>

              <div className="p-6 bg-neutral-50/50">
                {result.type === 'video' && result.videoUrl && (
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="w-full md:w-1/2 aspect-[3/4] bg-black rounded-2xl overflow-hidden relative">
                      <video 
                        src={result.videoUrl} 
                        poster={result.coverUrl}
                        controls 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                      <button
                        onClick={() => handleDownload(result.videoUrl!, `${result.title || 'video'}.mp4`)}
                        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        Tải Video (Không Logo)
                      </button>
                      {result.coverUrl && (
                        <button
                          onClick={() => handleDownload(result.coverUrl!, `${result.title || 'cover'}.jpg`)}
                          className="w-full py-3 px-4 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="w-5 h-5" />
                          Tải Ảnh Bìa
                        </button>
                      )}
                      
                      <div className="h-px bg-neutral-200 my-2"></div>
                      
                      <button
                        onClick={() => setShowEditor(!showEditor)}
                        className={`w-full py-3 px-4 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${showEditor ? 'bg-neutral-800 text-white hover:bg-neutral-900' : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'}`}
                      >
                        <Scissors className="w-5 h-5" />
                        {showEditor ? 'Đóng Công Cụ Chỉnh Sửa' : 'Chỉnh Sửa Video'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Editor Panel */}
                <AnimatePresence>
                  {showEditor && result.type === 'video' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-6"
                    >
                      <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                          <Wand2 className="w-5 h-5 text-purple-600" />
                          Công Cụ Chỉnh Sửa Nâng Cao
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Auto Cut */}
                          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <h4 className="font-medium text-purple-900 mb-2">Tự Động Cắt Phân Cảnh</h4>
                            <p className="text-sm text-purple-700 mb-4">
                              AI sẽ tự động nhận diện các cảnh quay khác nhau trong video và cắt chúng thành các đoạn clip nhỏ (tải về dưới dạng file .zip).
                            </p>
                            <button
                              onClick={handleAutoCut}
                              disabled={isEditing}
                              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                              Bắt Đầu Cắt Tự Động
                            </button>
                          </div>

                          {/* Manual Trim */}
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-medium text-blue-900 mb-2">Cắt Video Thủ Công</h4>
                            <p className="text-sm text-blue-700 mb-4">
                              Chọn thời gian bắt đầu và kết thúc để cắt ra đoạn video bạn mong muốn.
                            </p>
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-blue-800 mb-1">Từ (giây)</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={startTime}
                                  onChange={(e) => setStartTime(Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-blue-800 mb-1">Đến (giây)</label>
                                <input 
                                  type="number" 
                                  min="1"
                                  value={endTime}
                                  onChange={(e) => setEndTime(Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <button
                              onClick={handleTrim}
                              disabled={isEditing || startTime >= endTime}
                              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                              Cắt Video
                            </button>
                          </div>

                          {/* Extract Audio */}
                          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <h4 className="font-medium text-green-900 mb-2">Trích Xuất Âm Thanh (MP3)</h4>
                            <p className="text-sm text-green-700 mb-4">
                              Tách lấy phần âm thanh/nhạc nền từ video và tải về dưới định dạng MP3 chất lượng cao.
                            </p>
                            <button
                              onClick={handleExtractAudio}
                              disabled={isEditing}
                              className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                              Tải Âm Thanh (MP3)
                            </button>
                          </div>

                          {/* Auto Subtitle */}
                          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h4 className="font-medium text-orange-900 mb-2">Tự Động Thêm Phụ Đề</h4>
                            <p className="text-sm text-orange-700 mb-4">
                              AI sẽ phân tích giọng nói trong video, tạo phụ đề khớp với âm thanh và gắn trực tiếp vào video.
                            </p>
                            <button
                              onClick={handleAutoSubtitle}
                              disabled={isEditing}
                              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                              Tạo & Tải Video Phụ Đề
                            </button>
                          </div>

                          {/* Voiceover Rewrite */}
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 sm:col-span-2">
                            <h4 className="font-medium text-emerald-900 mb-2">Viết Lại Voiceover (AI Phân Tích)</h4>
                            <p className="text-sm text-emerald-700 mb-4">
                              AI sẽ xem video, phân tích nội dung hình ảnh và viết lại kịch bản lời thoại tiếng Việt bám sát thời lượng video.
                            </p>
                            <button
                              onClick={handleVoiceoverRewrite}
                              disabled={isEditing}
                              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                              Phân Tích & Viết Lại Kịch Bản
                            </button>

                            {voiceoverScript && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 bg-white rounded-xl border border-emerald-200 relative group"
                              >
                                <button 
                                  onClick={() => copyToClipboard(voiceoverScript)}
                                  className="absolute top-2 right-2 p-2 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors text-neutral-600"
                                  title="Sao chép kịch bản"
                                >
                                  {isCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                                <div className="prose prose-sm max-w-none text-emerald-900 prose-headings:text-emerald-950 prose-strong:text-emerald-950">
                                  <Markdown>{voiceoverScript}</Markdown>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {result.type === 'image' && result.images && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {result.images.map((img, idx) => (
                        <div key={idx} className="group relative aspect-[3/4] bg-neutral-200 rounded-xl overflow-hidden">
                          <img 
                            src={img} 
                            alt={`Image ${idx + 1}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => handleDownload(img, `${result.title || 'image'}_${idx + 1}.jpg`)}
                              className="p-3 bg-white text-neutral-900 rounded-full hover:scale-105 transition-transform"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <p className="text-sm text-neutral-500">
                        Tìm thấy {result.images.length} hình ảnh
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay for Editing */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white p-6 text-center"
            >
              <div className="bg-white/10 p-8 rounded-3xl border border-white/20 flex flex-col items-center gap-4 max-w-sm w-full">
                <Loader2 className="w-12 h-12 animate-spin text-red-500" />
                <h3 className="text-xl font-bold">Đang xử lý video</h3>
                <p className="text-sm text-neutral-300">Vui lòng chờ trong giây lát, chúng tôi đang xử lý yêu cầu của bạn...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
