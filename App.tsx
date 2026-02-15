
/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Icons, COLORS } from './constants';
import { InputType, ProcessingState, QuotaInfo, OutputData, MAX_FILE_SIZE_BYTES, DAILY_QUOTA, Language, TextProcessingMode, MAX_FILE_SIZE_MB } from './types';
import { fileToBase64, downloadFile } from './utils/audioUtils';
import { geminiService } from './services/geminiService';

const TRANSLATIONS = {
  en: {
    title: "Astric Audio Pro 4.0",
    subtitle: "Your Intelligent Content Hub",
    quota: "Daily Limit",
    quotaReached: "Free quota reached. Please wait 24 hours.",
    placeholder: "Paste your text or script here...",
    process: "Start Processing",
    processing: "Working on it...",
    analyzing: "Analyzing content...",
    subtitles: "Creating subtitles...",
    complete: "Done!",
    summarize: "Executive Summary",
    translate: "Translation",
    downloadSrt: "Download SRT",
    downloadTxt: "Download Text",
    useAsPrompt: "Use as Prompt",
    reuseMsg: "Text moved to input field!",
    uploadTitle: "Drop files here (Max 20MB)",
    uploadSubtitle: "Video or Audio files",
    ytHelper: "YouTube Downloader",
    ytHelperDesc: "Download video locally first, then upload it here.",
    modeLabel: "Choose Action",
    badge: "Astric AI Solution",
    introHeading: "Astric AI Solution",
    introSubtitle: "Convert audio/video to summaries and translations. If the file is large, please use a splitting tool.",
    splitterTitle: "File Splitter",
    splitterDesc: "Split large files into chunks smaller than 20MB for processing.",
    splitAction: "Split File",
    splitProgress: "Splitting file...",
    downloadPart: "Download Part",
    guideTitle: "How to use Astric AI",
    guideDesc: "Learn how to transcribe, translate, and split files with our professional AI tools.",
    step1: "Select Input: Choose between Text, Video/Audio upload, or the File Splitter.",
    step2: "Processing: Select your preferred AI mode (e.g., Arabic to English translation).",
    step3: "Results: Download your SRT subtitles, plain text, or executive summary instantly.",
    modes: {
      AR_TO_EN: "Arabic to English",
      EN_TO_AR: "English to Arabic",
      SUMMARY_ONLY: "Summary Only",
      TRANS_AND_SUM_AR_EN: "Trans + Summary (Ar->En)",
      TRANS_AND_SUM_EN_AR: "Trans + Summary (En->Ar)"
    }
  },
  sd: {
    title: "آسترك أوديو برو 4.0",
    subtitle: "نلون الأفكار",
    quota: "حدك اليومي",
    quotaReached: "خلصت الـ 10 محاولات حقتك. تعال بكرة.",
    placeholder: "خت كلامك أو النص حقك هنا...",
    process: "إبدأ التنفيذ",
    processing: "شغالين فيها...",
    analyzing: "بنقرأ في النص...",
    subtitles: "بنعمل في الترجمة...",
    complete: "تم يا غالي!",
    summarize: "الزيت (ملخص)",
    translate: "الترجمة",
    downloadSrt: "نزل ملف الترجمة",
    downloadTxt: "نزل النص",
    useAsPrompt: "استخدمو تاني",
    reuseMsg: "النص مشى فوق خلاص!",
    uploadTitle: "أرفع ملفك هنا (أقل من 20MB)",
    uploadSubtitle: "فيديو أو تسجيل صوتي",
    ytHelper: "منزل فيديوهات يوتيوب",
    ytHelperDesc: "نزل الفيديو في جهازك أول، وبعد داك أرفعه هنا.",
    modeLabel: "إختار حتعمل شنو",
    badge: "Astric AI Solution",
    introHeading: "استرك للحلول البرمجية الذكية",
    introSubtitle: "تحويل الوسائط المسموعة والمرئية إلى نص مقروء / مترجم / ملخص",
    splitterTitle: "أداة تقسيم الملفات",
    splitterDesc: "قسم ملفاتك الكبيرة لأجزاء أقل من 20 ميجا عشان تقدر تعالجها.",
    splitAction: "قطع الملف",
    splitProgress: "بنقطع في الملف...",
    downloadPart: "نزل الجزء",
    guideTitle: "دليل استخدام آسترك",
    guideDesc: "تعرف على كيفية تحويل الصوت لنص، والترجمة، وتقسيم الملفات باستخدام أدواتنا الاحترافية.",
    step1: "إختيار المدخلات: إختر بين النص، رفع الفيديو/الصوت، أو أداة التقسيم.",
    step2: "المعالجة: إختر الوضع اللي بيناسبك (مثلاً ترجمة من عربي لإنجليزي).",
    step3: "النتائج: نزل ملفات الترجمة SRT، النص العادي، أو الملخص فوراً.",
    modes: {
      AR_TO_EN: "ترجمة من عربي لإنجليزي",
      EN_TO_AR: "ترجمة من إنجليزي لعربي",
      SUMMARY_ONLY: "تلخيص بس",
      TRANS_AND_SUM_AR_EN: "ترجمة وتلخيص (عربي->إنجليزي)",
      TRANS_AND_SUM_EN_AR: "ترجمة وتلخيص (إنجليزي->عربي)"
    }
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('sd');
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState<TextProcessingMode>('AR_TO_EN');
  
  const [quota, setQuota] = useState<QuotaInfo>({ used: 0, lastReset: new Date().toDateString() });
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    message: '',
    error: null,
  });
  const [output, setOutput] = useState<OutputData | null>(null);
  const [splitChunks, setSplitChunks] = useState<{ blob: Blob, name: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const saved = localStorage.getItem('astric_quota_v2');
    const today = new Date().toDateString();
    if (saved) {
      const parsed: QuotaInfo = JSON.parse(saved);
      if (parsed.lastReset === today) setQuota(parsed);
      else {
        const newQuota = { used: 0, lastReset: today };
        setQuota(newQuota);
        localStorage.setItem('astric_quota_v2', JSON.stringify(newQuota));
      }
    }
  }, []);

  const updateQuota = () => {
    const newQuota = { ...quota, used: quota.used + 1 };
    setQuota(newQuota);
    localStorage.setItem('astric_quota_v2', JSON.stringify(newQuota));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleProcess = async () => {
    if (quota.used >= DAILY_QUOTA) {
      setProcessing(prev => ({ ...prev, error: t.quotaReached }));
      return;
    }

    setProcessing({ isProcessing: true, progress: 10, message: t.analyzing, error: null });
    setOutput(null);
    setSplitChunks([]);

    try {
      if (inputType === InputType.SPLITTER) {
        if (!selectedFile) throw new Error(lang === 'sd' ? "أرفع ملفك أول" : "Upload file first");
        handleSplitFile(selectedFile);
        return;
      }

      let srt: string | null = null;
      let txt: string | null = null;
      let summaryContent: string | null = null;
      let translatedText: string | null = null;
      let originalText = "";

      if (inputType === InputType.TEXT) {
        if (!textInput.trim()) throw new Error(lang === 'sd' ? "أكتب ليك حاجة أول" : "Please enter some text first");
        originalText = textInput;
        setProcessing(p => ({ ...p, progress: 50, message: t.processing }));
        const res = await geminiService.processText(textInput, textMode);
        translatedText = res.translation || null;
        summaryContent = res.summary || null;
      } else if (inputType === InputType.VIDEO) {
        if (!selectedFile) throw new Error(lang === 'sd' ? "أرفع ملفك يا فنان" : "Please upload a file");
        if (selectedFile.size > MAX_FILE_SIZE_BYTES) throw new Error(lang === 'sd' ? "الملف دا كبير شديد، المسموح 20MB. استخدم أداة التقسيم" : "File too large (20MB Max). Use the splitter tool.");
        
        setProcessing(p => ({ ...p, progress: 30, message: t.analyzing }));
        const base64 = await fileToBase64(selectedFile);
        
        setProcessing(p => ({ ...p, progress: 70, message: t.subtitles }));
        const results = await geminiService.generateSRT(base64, selectedFile.type);
        srt = results.srt;
        txt = results.txt;
        originalText = txt;
      }

      setProcessing(p => ({ ...p, progress: 100, message: t.complete }));
      
      setOutput({
        srtContent: srt,
        txtContent: txt,
        summaryContent,
        translatedText,
        originalText,
        fileName: selectedFile ? selectedFile.name.split('.')[0] : 'astric-result'
      });

      updateQuota();
      setProcessing({ isProcessing: false, progress: 100, message: t.complete, error: null });
    } catch (err: any) {
      setProcessing(prev => ({ ...prev, isProcessing: false, error: err.message }));
    }
  };

  const handleSplitFile = (file: File) => {
    setProcessing({ isProcessing: true, progress: 20, message: t.splitProgress, error: null });
    const chunks = [];
    const chunkSize = MAX_FILE_SIZE_BYTES - 1024; // slightly less than 20MB to be safe
    let offset = 0;
    let partNum = 1;

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      chunks.push({
        blob: chunk,
        name: `${file.name.split('.')[0]}_part${partNum}${file.name.includes('.') ? '.' + file.name.split('.').pop() : ''}`
      });
      offset += chunkSize;
      partNum++;
    }

    setSplitChunks(chunks);
    setProcessing({ isProcessing: false, progress: 100, message: t.complete, error: null });
    showToast(lang === 'sd' ? "تم تقسيم الملف بنجاح" : "File split successfully");
  };

  const reuseText = (txt: string) => {
    setTextInput(txt);
    setInputType(InputType.TEXT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(t.reuseMsg);
  };

  return (
    <div className={`min-h-screen pb-24 ${lang === 'sd' ? 'arabic' : ''} bg-gray-50`}>
      <SpeedInsights />
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl animate-bounce font-bold">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-18 flex items-center justify-between py-2">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Icons.Logo />
            <div>
              <h1 className="font-extrabold text-2xl text-gray-900 tracking-tight">{t.title}</h1>
              <p className="text-xs text-emerald-600 font-bold opacity-80">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button 
              onClick={() => setLang(lang === 'en' ? 'sd' : 'en')}
              className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border border-gray-200 shadow-sm"
            >
              {lang === 'en' ? 'عربي سوداني' : 'English'}
            </button>
            <div className={`hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full border ${quota.used >= DAILY_QUOTA ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              <span className="font-bold">{quota.used}/{DAILY_QUOTA}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-10 space-y-10">
        {/* Intro Section */}
        <section className="text-center space-y-3">
          <div className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-black rounded-full mb-2 shadow-sm uppercase tracking-wider">
            {t.badge}
          </div>
          <h2 className="text-4xl font-black text-gray-900 leading-tight">
            {t.introHeading}
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto font-medium">
            {t.introSubtitle}
          </p>
        </section>

        {/* Processing State */}
        {(processing.isProcessing || processing.error) && (
          <div className={`p-6 rounded-3xl border shadow-lg animate-pulse ${processing.error ? 'bg-red-50 border-red-200' : 'bg-white border-emerald-100'}`}>
            {processing.error ? (
              <div className="flex items-center space-x-3 rtl:space-x-reverse text-red-600">
                <span className="p-2 bg-red-100 rounded-full"><Icons.Logo /></span>
                <p className="font-bold">{processing.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-black text-emerald-600 uppercase tracking-widest">
                  <span>{processing.message}</span>
                  <span>{processing.progress}%</span>
                </div>
                <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    style={{ width: `${processing.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-200/20 border border-gray-100 overflow-hidden transition-all hover:shadow-emerald-200/40">
          <div className="flex border-b border-gray-100 bg-gray-50/50">
            {(Object.keys(InputType) as Array<keyof typeof InputType>).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setInputType(InputType[type]);
                  setSelectedFile(null);
                  setOutput(null);
                  setSplitChunks([]);
                }}
                className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all ${
                  inputType === InputType[type] 
                  ? 'text-emerald-700 bg-white border-b-4 border-emerald-600' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {lang === 'sd' ? (type === 'TEXT' ? 'نص' : type === 'VIDEO' ? 'تحميل الملف' : 'تقسيم') : type}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-6">
            {inputType === InputType.TEXT && (
              <div className="space-y-6">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput((e.target as HTMLTextAreaElement).value)}
                  placeholder={t.placeholder}
                  className="w-full h-56 p-6 bg-gray-50/50 border-2 border-transparent focus:border-emerald-500/30 focus:bg-white rounded-3xl outline-none transition-all text-lg font-medium resize-none shadow-inner"
                />
                
                <div className="space-y-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">{t.modeLabel}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['AR_TO_EN', 'EN_TO_AR', 'SUMMARY_ONLY', 'TRANS_AND_SUM_AR_EN', 'TRANS_AND_SUM_EN_AR'] as TextProcessingMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTextMode(mode)}
                        className={`px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${
                          textMode === mode 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' 
                          : 'bg-white text-gray-600 border-gray-100 hover:border-emerald-200'
                        }`}
                      >
                        {t.modes[mode]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(inputType === InputType.VIDEO || inputType === InputType.SPLITTER) && (
              <div className="space-y-6">
                {inputType === InputType.SPLITTER && (
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 mb-4">
                    <h4 className="font-black text-emerald-800 flex items-center gap-2">
                       <Icons.Logo /> {t.splitterTitle}
                    </h4>
                    <p className="text-sm text-emerald-600 mt-1 font-bold">{t.splitterDesc}</p>
                  </div>
                )}
                
                <div className="relative group border-2 border-dashed border-gray-200 rounded-[2rem] p-12 flex flex-col items-center justify-center space-y-4 bg-gray-50/30 hover:bg-emerald-50/40 hover:border-emerald-300 transition-all cursor-pointer">
                  <input
                    type="file"
                    aria-label={t.uploadTitle}
                    accept={inputType === InputType.VIDEO ? "video/*,audio/*" : "*"}
                    onChange={(e) => setSelectedFile((e.target as HTMLInputElement).files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="p-6 bg-white rounded-3xl shadow-xl text-emerald-600 group-hover:scale-110 transition-transform duration-500">
                    <Icons.Upload />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-gray-800">{selectedFile ? selectedFile.name : t.uploadTitle}</p>
                    <p className="text-sm text-gray-400 mt-2 font-bold">
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : t.uploadSubtitle}
                    </p>
                  </div>
                </div>

                {inputType === InputType.VIDEO && (
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                        <Icons.YouTube />
                      </div>
                      <div>
                        <h4 className="font-black text-gray-900">{t.ytHelper}</h4>
                        <p className="text-xs text-gray-500 font-bold">{t.ytHelperDesc}</p>
                      </div>
                    </div>
                    <a 
                      href="https://en.savefrom.net/1-youtube-video-downloader-384/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-red-100 text-red-600 font-black rounded-2xl hover:bg-red-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Icons.Download />
                      <span>Open Downloader</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={processing.isProcessing || (inputType !== InputType.SPLITTER && quota.used >= DAILY_QUOTA)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-black text-lg py-6 rounded-3xl shadow-[0_15px_30px_-5px_rgba(16,185,129,0.4)] hover:shadow-none transition-all flex items-center justify-center space-x-3 rtl:space-x-reverse"
            >
              {processing.isProcessing ? <span>{t.processing}</span> : <span>{inputType === InputType.SPLITTER ? t.splitAction : t.process}</span>}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {(output || splitChunks.length > 0) && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
            {/* Splitter Results */}
            {splitChunks.length > 0 && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 space-y-6">
                <h4 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Icons.Logo /> {t.splitterTitle} - {lang === 'sd' ? 'الأجزاء المقصوصة' : 'Split Parts'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {splitChunks.map((chunk, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="truncate pr-4">
                        <p className="text-sm font-black text-gray-800 truncate">{chunk.name}</p>
                        <p className="text-xs text-gray-400 font-bold">{(chunk.blob.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={() => downloadFile(chunk.blob, chunk.name, chunk.blob.type)}
                        className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
                      >
                        <Icons.Download />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Cards */}
            {output && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transcript & Subtitles (Video only) */}
                {inputType === InputType.VIDEO && (
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-gray-900">{lang === 'sd' ? 'ملفات النص' : 'Transcripts'}</h4>
                    </div>
                    {output.srtContent && (
                      <button onClick={() => downloadFile(output.srtContent!, `${output.fileName}.srt`, 'text/plain')} className="w-full bg-gray-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-emerald-50 transition-colors">
                        <span className="text-sm font-bold text-gray-700">{t.downloadSrt}</span>
                        <Icons.Download />
                      </button>
                    )}
                    {output.txtContent && (
                      <button onClick={() => downloadFile(output.txtContent!, `${output.fileName}.txt`, 'text/plain')} className="w-full bg-gray-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-emerald-50 transition-colors">
                        <span className="text-sm font-bold text-gray-700">{t.downloadTxt}</span>
                        <Icons.Download />
                      </button>
                    )}
                    {output.originalText && (
                      <button onClick={() => reuseText(output.originalText!)} className="w-full border-2 border-emerald-100 p-4 rounded-2xl flex items-center justify-between hover:bg-emerald-50 transition-colors">
                        <span className="text-sm font-bold text-emerald-700">{t.useAsPrompt}</span>
                        <Icons.Reuse />
                      </button>
                    )}
                  </div>
                )}

                {/* Translation Card */}
                {output.translatedText && (
                  <div className="bg-emerald-900 text-white p-6 rounded-[2rem] shadow-xl flex flex-col justify-between">
                    <div className="space-y-4">
                      <h4 className="font-black text-emerald-100 border-b border-emerald-800 pb-2">{t.translate}</h4>
                      <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {output.translatedText}
                      </div>
                    </div>
                    <button 
                      onClick={() => downloadFile(output.translatedText!, `${output.fileName}_Trans.txt`, 'text/plain')}
                      className="mt-6 w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Icons.Download /> <span>{lang === 'sd' ? 'نزل الترجمة' : 'Download Translation'}</span>
                    </button>
                  </div>
                )}

                {/* Summary Card */}
                {output.summaryContent && (
                  <div className="bg-black text-white p-6 rounded-[2rem] shadow-xl flex flex-col justify-between md:col-span-2 lg:col-span-1">
                    <div className="space-y-4">
                      <h4 className="font-black text-gray-400 border-b border-gray-800 pb-2">{t.summarize}</h4>
                      <div className="text-sm font-medium leading-relaxed max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                        {output.summaryContent.split('\n').map((line, i) => (
                          <p key={i} className="mb-2">{line}</p>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => downloadFile(output.summaryContent!, `${output.fileName}_Summary.txt`, 'text/plain')}
                      className="mt-6 w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Icons.Download /> <span>{lang === 'sd' ? 'نزل الملخص' : 'Download Summary'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SEO Guide Section */}
        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl p-8 sm:p-12 space-y-8">
           <div className="text-center space-y-2">
             <h2 className="text-3xl font-black text-gray-900">{t.guideTitle}</h2>
             <p className="text-gray-500 font-bold">{t.guideDesc}</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">1</div>
                <h3 className="font-black text-gray-900 text-lg">{lang === 'sd' ? 'المدخلات' : 'Step 1'}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{t.step1}</p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">2</div>
                <h3 className="font-black text-gray-900 text-lg">{lang === 'sd' ? 'المعالجة' : 'Step 2'}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{t.step2}</p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">3</div>
                <h3 className="font-black text-gray-900 text-lg">{lang === 'sd' ? 'التحميل' : 'Step 3'}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{t.step3}</p>
              </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 py-6 px-4 z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 font-bold text-sm">
            Powered by <a href="https://astric.sd" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Astric</a>
          </div>
          <div className="flex items-center gap-6">
            <a 
              href="https://wa.me/249127556666" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-emerald-600 font-black text-sm hover:scale-105 transition-transform"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>+249 127556666</span>
            </a>
            <div className={`hidden sm:flex items-center space-x-2 px-4 py-2 rounded-full border ${quota.used >= DAILY_QUOTA ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
              <span className="font-bold">{quota.used}/{DAILY_QUOTA}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
