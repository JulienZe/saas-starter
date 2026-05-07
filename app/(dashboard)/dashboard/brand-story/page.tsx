'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sparkles, BookOpen, Loader2, Target, BarChart3, Lightbulb,
  ArrowRight, ArrowLeft, PenLine, Clock, Star, Eye, User,
  Shield, Heart, Film, Zap, ChevronRight, Check, Download,
  Copy, CheckCircle, Edit3, RefreshCw, MessageSquare, X,
  Cpu, Key, Settings2, AlertCircle
} from 'lucide-react';

const TEMPLATES = [
  { id: 'tech', name: '科技产品', icon: '⚡', desc: '智能硬件、SaaS工具', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'lifestyle', name: '生活方式', icon: '🌿', desc: '家居、美妆、食品', gradient: 'from-emerald-400 to-teal-600' },
  { id: 'health', name: '健康运动', icon: '💪', desc: '运动装备、健康食品', gradient: 'from-green-400 to-emerald-600' },
  { id: 'education', name: '教育学习', icon: '📚', desc: '课程、工具、平台', gradient: 'from-purple-500 to-violet-600' },
  { id: 'finance', name: '金融理财', icon: '💰', desc: '支付、投资、保险', gradient: 'from-amber-400 to-orange-600' },
  { id: 'travel', name: '旅行出行', icon: '✈️', desc: '酒店、交通、攻略', gradient: 'from-cyan-400 to-blue-600' },
];

const TONES = [
  { id: 'warm_professional', name: '温暖专业', desc: '亲和力与专业感并重' },
  { id: 'inspiring', name: '激励鼓舞', desc: '充满力量与感染力' },
  { id: 'elegant', name: '优雅精致', desc: '高端品质与生活美学' },
  { id: 'playful', name: '活泼有趣', desc: '轻松幽默与年轻活力' },
  { id: 'trustworthy', name: '可靠信赖', desc: '稳重权威与安全感' },
];

const WORKFLOW_STAGES = [
  { label: '产品价值分析', desc: '提炼核心价值主张', icon: Target },
  { label: '用户需求洞察', desc: '构建精准用户画像', icon: User },
  { label: '场景构建设计', desc: '设计沉浸式使用场景', icon: Film },
  { label: '故事叙事创作', desc: '融合情感与品牌调性', icon: BookOpen },
  { label: '内容优化完善', desc: '质量检测与优化', icon: Shield },
];

const STEPS = [
  { id: 1, label: '选择模板' },
  { id: 2, label: '填写信息' },
  { id: 3, label: 'AI创作' },
  { id: 4, label: '查看结果' },
];

const CHANNELS = [
  { id: 'wechat', name: '微信公众号', icon: '📱', format: '长图文', length: '1200-2000字', style: '深度叙事' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕', format: '图文笔记', length: '300-800字', style: '场景种草' },
  { id: 'douyin', name: '抖音', icon: '🎵', format: '短视频脚本', length: '200-500字', style: '快节奏剧情' },
  { id: 'weibo', name: '微博', icon: '💬', format: '短图文', length: '100-300字', style: '话题互动' },
  { id: 'zhihu', name: '知乎', icon: '💡', format: '问答体', length: '1500-3000字', style: '专业分析' },
];

const AI_PROVIDERS = [
  { id: 'siliconflow', name: '硅基流动', icon: '🔥', desc: '国内可用，免费额度', requiresKey: true, defaultModel: 'Qwen/Qwen2.5-7B-Instruct' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠', desc: '高性价比，中文优秀', requiresKey: true, defaultModel: 'deepseek-chat' },
  { id: 'openai', name: 'OpenAI', icon: '🤖', desc: 'GPT-4，全球领先', requiresKey: true, defaultModel: 'gpt-4' },
  { id: 'claude', name: 'Claude', icon: '🎭', desc: '创意写作，长文本', requiresKey: true, defaultModel: 'claude-3-5-sonnet-20241022' },
  { id: 'ollama', name: 'Ollama', icon: '💻', desc: '本地部署，免费', requiresKey: false, defaultModel: 'qwen2.5:7b' },
  { id: 'mock', name: '模拟模式', icon: '✨', desc: '无需API，快速体验', requiresKey: false, defaultModel: 'mock' },
];

interface StoryResult {
  metadata: { generatedAt: string; duration: number; version: string };
  productValue: {
    coreValue: string; extended: string;
    differentiation: { uniquePoints: string[]; competitiveAdvantage: string; marketPosition: string };
    keyFeatures: any[]; coreBenefits: any;
  };
  userProfile: { persona: any; painPoints: any[]; emotionalNeeds: any[]; motivationTriggers: any[] };
  scenarios: any[];
  brandStory: { content: string; wordCount: number; emotionalResonance: any; keyMessages: string[]; narrativeArc: any };
  emotionalConnections: { triggers: any[]; keyMessages: string[] };
  quality: { passed: boolean };
  contentScore: { total: number; grade: string; dimensions: Record<string, any>; suggestions?: any[] };
}

export default function BrandStoryPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [template, setTemplate] = useState<string | null>(null);
  const [tone, setTone] = useState('warm_professional');
  const [formData, setFormData] = useState({
    productName: '',
    productDesc: '',
    targetUser: '',
    productFeatures: '',
  });
  const [result, setResult] = useState<StoryResult | null>(null);
  const [generatingStep, setGeneratingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressStages, setProgressStages] = useState<{ label: string; desc: string; status: 'pending' | 'active' | 'done' }[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const [aiProvider, setAiProvider] = useState('siliconflow');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('Qwen/Qwen2.5-32B-Instruct');
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [serverAiConfig, setServerAiConfig] = useState<{ provider: string; isConfigured: boolean } | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [brands, setBrands] = useState<{ id: number; name: string; industry: string | null; description: string | null; tone: string | null; values: string[] }[]>([]);

  useEffect(() => {
    fetch('/api/brands')
      .then(res => res.json())
      .then(data => { if (data.brands) setBrands(data.brands); })
      .catch(() => {});
  }, []);

  const nameError = touched.name && !formData.productName.trim() ? '请输入产品名称' : '';
  const descError = touched.desc && !formData.productDesc.trim() ? '请输入产品描述' : '';

  const handleGenerate = useCallback(async () => {
    if (!formData.productName.trim() || !formData.productDesc.trim()) {
      setTouched({ name: true, desc: true });
      return;
    }

    setStep(3);
    setError('');
    setProgress(0);
    setGeneratingStep('连接AI服务...');
    setStreamingText('');
    setProgressStages(WORKFLOW_STAGES.map((s, i) => ({ label: s.label, desc: s.desc, status: i === 0 ? 'active' : 'pending' as const })));

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/brand-story/generate-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          productName: formData.productName,
          productDesc: formData.productDesc,
          targetUser: formData.targetUser,
          productFeatures: formData.productFeatures.split('\n').filter(f => f.trim()),
          template,
          tone,
          brandId: selectedBrandId,
          provider: aiProvider,
          apiKey: aiApiKey || undefined,
          baseUrl: aiBaseUrl || undefined,
          model: aiModel || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || `请求失败 (${response.status})`);
        setStep(2);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError('无法获取响应流');
        setStep(2);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case 'stage_start':
                setGeneratingStep(event.stageName || event.stage);
                setProgress(event.progress || 0);
                setProgressStages(prev => prev.map((s, i) =>
                  i < (event.stageIndex || 0) ? { ...s, status: 'done' as const } :
                  i === (event.stageIndex || 0) ? { ...s, status: 'active' as const } :
                  s
                ));
                setStreamingText('');
                break;

              case 'stream_chunk':
                if (event.chunk) {
                  setStreamingText(prev => prev + event.chunk);
                  setProgress(event.progress || 0);
                }
                break;

              case 'stage_complete':
                setProgress(event.progress || 0);
                setProgressStages(prev => prev.map((s, i) =>
                  i <= (event.stageIndex || 0) ? { ...s, status: 'done' as const } :
                  i === (event.stageIndex || 0) + 1 ? { ...s, status: 'active' as const } :
                  s
                ));
                break;

              case 'stage_error':
                setError(event.error || '阶段处理失败');
                break;

              case 'done':
                setProgress(100);
                setGeneratingStep('创作完成');
                setProgressStages(prev => prev.map(s => ({ ...s, status: 'done' as const })));
                if (event.result) {
                  setResult(event.result);
                }
                setTimeout(() => setStep(4), 500);
                break;

              case 'error':
                setError(event.error || '生成失败');
                setStep(2);
                break;
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || '生成失败，请重试');
        setStep(2);
      }
    }
  }, [formData, template, tone, aiProvider, aiApiKey, aiBaseUrl, aiModel]);

  const handleReset = useCallback(() => {
    setResult(null);
    setStep(1);
    setTemplate(null);
    setFormData({ productName: '', productDesc: '', targetUser: '', productFeatures: '' });
    setError('');
    setTouched({});
  }, []);

  const canProceedStep1 = !!template;
  const canProceedStep2 = formData.productName.trim() && formData.productDesc.trim();

  if (step === 3) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8">
        <div className="relative mb-10">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-xl shadow-[#667eea]/30">
            <Sparkles className="w-14 h-14 text-white animate-pulse" />
          </div>
          <div className="absolute -inset-6 rounded-full border-2 border-[#667eea]/20 animate-ping opacity-20" />
          <div className="absolute -inset-3 rounded-full border border-[#764ba2]/30 animate-pulse opacity-30" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI正在创作中</h2>
        <p className="text-gray-500 mb-8">{generatingStep || '初始化工作流...'}</p>

        <div className="w-80 bg-gray-100 rounded-full h-2 overflow-hidden mb-10">
          <div
            className="bg-gradient-to-r from-[#667eea] to-[#764ba2] h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="w-full max-w-md space-y-2 mb-8">
          {progressStages.map((stage, i) => {
            const StageIcon = WORKFLOW_STAGES[i].icon;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  stage.status === 'active' ? 'bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 border border-[#667eea]/15' :
                  stage.status === 'done' ? 'bg-[#667eea]/5' : 'bg-gray-50/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  stage.status === 'done' ? 'bg-[#667eea]/10' :
                  stage.status === 'active' ? 'bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10' : 'bg-gray-100'
                }`}>
                  {stage.status === 'done' ? (
                    <Check className="w-4 h-4 text-[#667eea]" />
                  ) : (
                    <StageIcon className={`w-4 h-4 ${stage.status === 'active' ? 'text-[#667eea]' : 'text-gray-400'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    stage.status === 'active' ? 'text-[#667eea]' :
                    stage.status === 'done' ? 'text-[#764ba2]' : 'text-gray-400'
                  }`}>{stage.label}</p>
                  <p className="text-xs text-gray-400">{stage.desc}</p>
                </div>
                {stage.status === 'active' && <Loader2 className="w-4 h-4 text-[#667eea] animate-spin flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {streamingText && (
          <div className="w-full max-w-md bg-white rounded-xl border p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
              <BookOpen className="w-3 h-3" /> 品牌故事实时预览
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {streamingText}<span className="animate-pulse text-[#667eea]">▌</span>
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-8">通常需要20-40秒，请耐心等待</p>
      </div>
    );
  }

  if (step === 4 && result) {
    return <ResultView result={result} productName={formData.productName} template={template} onReset={handleReset} onNewCreation={() => { setStep(1); setResult(null); setTemplate(null); }} onResultUpdate={(r) => setResult(r)} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/10 to-transparent" />
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">创作品牌故事</h1>
            <p className="text-gray-500 text-sm mt-0.5">AI 驱动的品牌故事生成引擎，5步创作专业品牌内容</p>
          </div>
        </div>

        <div className="flex items-center gap-0 mt-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  step > s.id ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' :
                  step === s.id ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-[#667eea]/30' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step > s.id ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-sm whitespace-nowrap ${
                  step >= s.id ? 'text-gray-900 font-medium' : 'text-gray-400'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 transition-colors duration-300 ${
                  step > s.id ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900">选择产品类型</h2>
            <p className="text-sm text-gray-500 mt-1">不同类型会生成不同风格的品牌叙事</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-lg group ${
                  template === t.id
                    ? 'border-[#667eea] bg-gradient-to-br from-[#667eea]/5 to-[#764ba2]/5 shadow-lg shadow-[#667eea]/10'
                    : 'border-gray-200 bg-white hover:border-[#667eea]/30'
                }`}
              >
                <span className="text-3xl block mb-3 relative z-10 transition-transform duration-200 group-hover:scale-110">{t.icon}</span>
                <p className="font-semibold text-gray-900 text-sm relative z-10">{t.name}</p>
                <p className="text-xs text-gray-500 mt-1 relative z-10">{t.desc}</p>
                {template === t.id && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center animate-in zoom-in duration-200">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => window.history.back()} className="text-gray-500">取消</Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25 px-6"
            >
              下一步 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900">描述你的产品</h2>
            <p className="text-sm text-gray-500 mt-1">越详细的描述，AI创作的内容越精准</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 shadow-sm">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                产品名称 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6] ${
                    nameError ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="例如：智能手环、咖啡机、电动牙刷"
                  value={formData.productName}
                  onChange={(e) => { setFormData({ ...formData, productName: e.target.value }); setTouched(t => ({ ...t, name: true })); }}
                  onBlur={() => setTouched(t => ({ ...t, name: true }))}
                  maxLength={50}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{formData.productName.length}/50</span>
              </div>
              {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                产品描述 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition resize-none bg-[#f6f6f6] ${
                    descError ? 'border-red-300' : 'border-gray-200'
                  }`}
                  rows={4}
                  placeholder="描述一下这个产品是做什么的，有什么特别之处..."
                  value={formData.productDesc}
                  onChange={(e) => { setFormData({ ...formData, productDesc: e.target.value }); setTouched(t => ({ ...t, desc: true })); }}
                  onBlur={() => setTouched(t => ({ ...t, desc: true }))}
                  maxLength={500}
                />
                <span className="absolute right-3 bottom-3 text-xs text-gray-400">{formData.productDesc.length}/500</span>
              </div>
              {descError && <p className="text-xs text-red-500 mt-1">{descError}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                产品特点 <span className="text-gray-400 font-normal">（选填，每行一个）</span>
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition resize-none bg-[#f6f6f6]"
                rows={4}
                placeholder={"每行一个特点，例如：\n长续航\n防水设计\n轻便易携"}
                value={formData.productFeatures}
                onChange={(e) => setFormData({ ...formData, productFeatures: e.target.value })}
                maxLength={300}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  目标用户 <span className="text-gray-400 font-normal">（选填）</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  placeholder="例如：25-35岁都市白领"
                  value={formData.targetUser}
                  onChange={(e) => setFormData({ ...formData, targetUser: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">叙事语调</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  {TONES.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {brands.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  关联品牌 <span className="text-gray-400 font-normal">（选填，从品牌库选择）</span>
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  value={selectedBrandId || ''}
                  onChange={(e) => setSelectedBrandId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">不关联品牌</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.industry ? ` (${b.industry})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mt-5">
            <button
              type="button"
              onClick={() => setShowAiConfig(!showAiConfig)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-800 w-full"
            >
              <Settings2 className="w-4 h-4 text-[#667eea]" />
              <span>AI 模型配置</span>
              {aiProvider !== 'mock' && aiApiKey && (
                <span className="ml-auto flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> 已配置
                </span>
              )}
              {aiProvider === 'mock' && (
                <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">模拟模式</span>
              )}
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showAiConfig ? 'rotate-90' : ''}`} />
            </button>

            {showAiConfig && (
              <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">选择 AI 服务商</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {AI_PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setAiProvider(p.id);
                          setAiModel(p.defaultModel);
                          if (p.id === 'mock' || p.id === 'ollama') {
                            setAiApiKey('');
                          }
                        }}
                        className={`relative p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                          aiProvider === p.id
                            ? 'border-[#667eea] bg-[#667eea]/5'
                            : 'border-gray-200 hover:border-[#667eea]/30'
                        }`}
                      >
                        <span className="text-xl block mb-1">{p.icon}</span>
                        <span className="text-xs font-medium text-gray-700 block">{p.name}</span>
                        {aiProvider === p.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#667eea] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {AI_PROVIDERS.find(p => p.id === aiProvider)?.requiresKey && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      <Key className="w-3 h-3 inline mr-1" />API Key
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition text-sm bg-[#f6f6f6]"
                      placeholder={`输入 ${AI_PROVIDERS.find(p => p.id === aiProvider)?.name} API Key`}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">API Key 仅在本次会话使用，不会存储到服务器</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">模型</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition text-sm bg-[#f6f6f6]"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">自定义 Base URL <span className="text-gray-400">(选填)</span></label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition text-sm bg-[#f6f6f6]"
                      placeholder="默认使用官方 API"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                    />
                  </div>
                </div>

                {aiProvider !== 'mock' && !aiApiKey && AI_PROVIDERS.find(p => p.id === aiProvider)?.requiresKey && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-medium">需要 API Key</p>
                      <p className="mt-0.5">未配置 API Key 时将使用服务器默认配置。如服务器也未配置，将回退到模拟模式。</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-5 bg-red-50 border-l-3 border-red-400 text-red-700 px-5 py-3 rounded-r-lg text-sm flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
              <span className="flex-1">{error}</span>
              <Button variant="ghost" size="sm" onClick={handleGenerate} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重试
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setStep(1)} className="text-gray-500">
              <ArrowLeft className="w-4 h-4 mr-1" /> 上一步
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!canProceedStep2}
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25 px-6"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              开始创作品牌故事
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RatingStars({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={`text-xl transition-colors duration-150 ${
            (hover || rating) >= n ? 'text-[#667eea]' : 'text-gray-300'
          }`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function QualityScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] transition-all duration-500" style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{score}</span>
    </div>
  );
}

function ResultView({ result, productName, template, onReset, onNewCreation, onResultUpdate }: {
  result: StoryResult;
  productName: string;
  template: string | null;
  onReset: () => void;
  onNewCreation: () => void;
  onResultUpdate: (r: StoryResult) => void;
}) {
  const [activeTab, setActiveTab] = useState<'story' | 'value' | 'user' | 'scenes'>('story');
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [activeChannel, setActiveChannel] = useState('wechat');
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(result.brandStory?.content || '');
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);

  const templateInfo = template ? TEMPLATES.find(t => t.id === template) : null;

  const adaptContent = (channelId: string) => {
    const story = result.brandStory?.content || '';
    const value = result.productValue;
    const profile = result.userProfile;
    const scenarios = result.scenarios || [];

    switch (channelId) {
      case 'wechat':
        return `# ${productName}：${value?.coreValue || '让生活更美好'}\n\n${value?.extended || ''}\n\n---\n\n${story}\n\n---\n\n💡 **使用场景**：${scenarios[0]?.title || ''}\n→ ${scenarios[0]?.plot?.climax || ''}`;
      case 'xiaohongshu':
        return `✨ ${productName} | ${value?.coreValue || '好物推荐'}\n\n📍 ${scenarios[0]?.title || ''}\n👤 ${scenarios[0]?.character?.name || ''}的真实体验\n\n${story.split('\n').filter((l: string) => l.trim()).slice(0, 5).join('\n')}\n\n---\n🌟 亮点：${value?.differentiation?.uniquePoints?.slice(0, 3).join(' | ') || ''}\n\n#${productName} #好物推荐 #种草`;
      case 'douyin':
        return `【${productName}】短视频脚本\n\n🎬 场景：${scenarios[0]?.title || ''}\n\n📌 开头（3秒）\n${scenarios[0]?.plot?.conflict || '直击痛点，抓住注意力'}\n\n📌 产品展示（5秒）\n${scenarios[0]?.plot?.climax || `展示${productName}如何解决问题`}\n\n📌 效果呈现（5秒）\n${scenarios[0]?.plot?.resolution || '展示使用后的改变'}\n\n📌 引导行动（2秒）\n点击了解更多 → ${productName}`;
      case 'weibo':
        return `【${productName}】${value?.coreValue || ''}\n\n${story.split('\n').filter((l: string) => l.trim()).slice(0, 3).join(' ')}\n\n${value?.differentiation?.uniquePoints?.slice(0, 2).map(p => `✅ ${p}`).join('\n') || ''}\n\n#${productName}# #品牌故事#`;
      case 'zhihu':
        return `为什么${profile?.persona?.name || '越来越多人'}选择${productName}？\n\n作为${profile?.persona?.archetype || '用户'}，我来分享真实体验。\n\n**核心价值**\n${value?.coreValue || ''}\n${value?.extended || ''}\n\n**差异化优势**\n${value?.differentiation?.uniquePoints?.map(p => `- ${p}`).join('\n') || ''}\n\n**实际使用场景**\n${scenarios.slice(0, 2).map((s: any) => `- ${s.title}：${s.plot?.resolution || s.expectedEffect || ''}`).join('\n')}\n\n**总结**\n${story.split('\n').filter((l: string) => l.trim()).slice(-3).join('\n')}`;
      default:
        return story;
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportMarkdown = () => {
    const content = `# ${productName} - 品牌故事\n\n## 品牌故事\n\n${result.brandStory?.content || ''}\n\n## 核心价值\n\n${result.productValue?.coreValue || ''}\n\n${result.productValue?.extended || ''}\n\n## 差异化优势\n\n${result.productValue?.differentiation?.uniquePoints?.map((p: string) => `- ${p}`).join('\n') || ''}\n\n## 用户画像\n\n${result.userProfile?.persona?.description || ''}\n\n## 使用场景\n\n${result.scenarios?.map((s: any) => `### ${s.title}\n${s.plot?.setup || ''}\n${s.plot?.climax || ''}\n${s.plot?.resolution || ''}`).join('\n\n') || ''}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName}-品牌故事.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName}-品牌故事.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim()) return;
    setRefineLoading(true);
    try {
      const response = await fetch('/api/brand-story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          productDesc: result.productValue?.coreValue || '',
          targetUser: result.userProfile?.persona?.name || '',
          productFeatures: [],
          template,
          tone: 'warm_professional',
          refineInstruction: refineInstruction,
        }),
      });
      const data = await response.json();
      if (data.data) {
        onResultUpdate(data.data);
        setEditedContent(data.data.brandStory?.content || '');
      }
    } catch (err) {
      console.error('优化失败:', err);
    } finally {
      setRefineLoading(false);
      setShowRefineModal(false);
      setRefineInstruction('');
    }
  };

  const readingTime = Math.max(1, Math.ceil((result.brandStory?.wordCount || 0) / 300));

  const tabs = [
    { key: 'story' as const, label: '品牌故事', icon: BookOpen },
    { key: 'value' as const, label: '产品价值', icon: Target },
    { key: 'user' as const, label: '用户画像', icon: User },
    { key: 'scenes' as const, label: '使用场景', icon: Film },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-2xl p-6 mb-6 text-white shadow-lg shadow-[#667eea]/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold tracking-tight">{productName}</h1>
              {templateInfo && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm">
                  {templateInfo.icon} {templateInfo.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {result.brandStory?.wordCount || 0}字</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 约{readingTime}分钟阅读</span>
              {result.metadata?.duration && <span>耗时 {(result.metadata.duration / 1000).toFixed(1)}s</span>}
              {result.quality?.passed && <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> 质量验证通过</span>}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-white/60">评分</span>
              <RatingStars rating={rating} onChange={setRating} />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowRefineModal(true)} className="border-white/30 text-white hover:bg-white/10 bg-white/10 backdrop-blur-sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> 优化
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChannelModal(true)} className="border-white/30 text-white hover:bg-white/10 bg-white/10 backdrop-blur-sm">
              <Eye className="w-3.5 h-3.5 mr-1" /> 适配
            </Button>
            <Button size="sm" className="bg-white text-[#667eea] hover:bg-white/90 font-semibold" onClick={handleExportMarkdown}>
              <Download className="w-3.5 h-3.5 mr-1" /> 导出
            </Button>
          </div>
        </div>
      </div>

      {result.contentScore?.dimensions && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#667eea]" /> 内容质量评估
              {result.contentScore?.grade && (
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  result.contentScore.total >= 80 ? 'bg-[#667eea]/10 text-[#667eea]' :
                  result.contentScore.total >= 60 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-600'
                }`}>
                  {result.contentScore.grade} · {result.contentScore.total}分
                </span>
              )}
            </h3>
          </div>
          <div className="space-y-2.5">
            {Object.entries(result.contentScore.dimensions).map(([key, dim]: [string, any]) => (
              <QualityScoreBar key={key} score={dim.score} label={dim.label} />
            ))}
          </div>
          {result.contentScore?.suggestions && result.contentScore.suggestions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
              {result.contentScore.suggestions.map((s: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <Lightbulb className="w-3 h-3 text-[#667eea] flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600"><span className="font-medium text-gray-700">{s.dimension}：</span>{s.tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100/80 rounded-xl p-1">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#667eea] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'story' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b bg-gradient-to-r from-[#667eea]/[0.03] to-[#764ba2]/[0.03] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#667eea]" />
              <span className="font-semibold text-gray-900 text-sm">品牌故事</span>
              <span className="text-xs text-gray-400">{result.brandStory?.wordCount || 0} 字</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    onResultUpdate({ ...result, brandStory: { ...result.brandStory, content: editedContent } });
                  }
                  setIsEditing(!isEditing);
                }}
                className={`text-xs ${isEditing ? 'text-[#667eea] bg-[#667eea]/5' : 'text-gray-500'}`}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" /> {isEditing ? '保存' : '编辑'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(result.brandStory?.content || '')} className="text-xs text-gray-500">
                {copied ? <CheckCircle className="w-3.5 h-3.5 mr-1 text-[#667eea]" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          </div>
          <div className="p-6">
            {result.brandStory?.emotionalResonance?.primary && (
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 text-[#667eea] text-xs font-medium">
                  <Heart className="w-3 h-3" /> {result.brandStory.emotionalResonance.primary}
                </span>
                {result.brandStory.emotionalResonance?.secondary && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-pink-50 text-pink-600 text-xs">
                    {result.brandStory.emotionalResonance.secondary}
                  </span>
                )}
              </div>
            )}

            {isEditing ? (
              <textarea
                className="w-full min-h-[400px] px-4 py-3 border border-[#667eea]/20 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none text-sm text-gray-700 leading-relaxed resize-y bg-[#f6f6f6]"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
              />
            ) : (
              <article className="text-gray-700 leading-[1.8] text-[15px]">
                {(result.brandStory?.content || '').split('\n').map((line: string, i: number) => {
                  if (!line.trim()) return <div key={i} className="h-3" />;
                  if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-4 tracking-tight">{line.slice(2)}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-gray-800 mt-6 mb-3">{line.slice(3)}</h2>;
                  if (line.startsWith('---')) return <hr key={i} className="my-8 border-gray-200" />;
                  const boldParsed = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900 font-semibold">$1</strong>');
                  return <p key={i} className="mb-4" dangerouslySetInnerHTML={{ __html: boldParsed }} />;
                })}
              </article>
            )}

            {result.brandStory?.keyMessages?.length > 0 && !isEditing && (
              <div className="mt-8 pt-5 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[#667eea]" /> 关键信息
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.brandStory.keyMessages.map((msg: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 text-[#667eea] text-sm">
                      <ChevronRight className="w-3 h-3" /> {msg}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.emotionalConnections?.triggers?.length > 0 && !isEditing && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">情感触发点</h4>
                <div className="flex flex-wrap gap-2">
                  {result.emotionalConnections.triggers.map((t: any, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-gradient-to-r from-[#667eea]/8 to-[#764ba2]/8 text-[#764ba2] text-xs font-medium">
                      {typeof t === 'string' ? t : t.trigger || t.name || JSON.stringify(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'value' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center">
                <Target className="w-4.5 h-4.5 text-[#667eea]" />
              </div>
              <h3 className="font-semibold text-gray-900">核心价值主张</h3>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">{result.productValue?.coreValue || '—'}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{result.productValue?.extended || ''}</p>
          </div>

          {result.productValue?.differentiation?.uniquePoints?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#667eea]" /> 差异化优势
              </h3>
              <div className="space-y-3">
                {result.productValue.differentiation.uniquePoints.map((point: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{i + 1}</span>
                    <span className="text-sm text-gray-700">{point}</span>
                  </div>
                ))}
              </div>
              {result.productValue.differentiation.competitiveAdvantage && (
                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5">
                  <p className="text-sm text-gray-700"><span className="font-semibold text-[#667eea]">竞争优势：</span>{result.productValue.differentiation.competitiveAdvantage}</p>
                </div>
              )}
              {result.productValue.differentiation.marketPosition && (
                <p className="mt-3 text-sm text-gray-600"><span className="font-medium">市场定位：</span>{result.productValue.differentiation.marketPosition}</p>
              )}
            </div>
          )}

          {result.productValue?.keyFeatures?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#667eea]" /> 核心功能
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.productValue.keyFeatures.map((feat: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-[#667eea]/[0.03] to-[#764ba2]/[0.03] border border-[#667eea]/10">
                    <p className="font-medium text-sm text-gray-900">{feat.feature || feat}</p>
                    {feat.benefit && <p className="text-xs text-gray-500 mt-1">{feat.benefit}</p>}
                    {feat.scenario && <p className="text-xs text-[#667eea] mt-1">场景：{feat.scenario}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.productValue?.coreBenefits && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" /> 核心收益
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.productValue.coreBenefits.functional?.length > 0 && (
                  <div className="p-3 rounded-xl bg-blue-50/50">
                    <p className="text-xs font-semibold text-blue-700 mb-2">功能收益</p>
                    {result.productValue.coreBenefits.functional.map((b: string, i: number) => (
                      <p key={i} className="text-xs text-gray-600 mb-1">· {b}</p>
                    ))}
                  </div>
                )}
                {result.productValue.coreBenefits.emotional?.length > 0 && (
                  <div className="p-3 rounded-xl bg-pink-50/50">
                    <p className="text-xs font-semibold text-pink-700 mb-2">情感收益</p>
                    {result.productValue.coreBenefits.emotional.map((b: string, i: number) => (
                      <p key={i} className="text-xs text-gray-600 mb-1">· {b}</p>
                    ))}
                  </div>
                )}
                {result.productValue.coreBenefits.social?.length > 0 && (
                  <div className="p-3 rounded-xl bg-green-50/50">
                    <p className="text-xs font-semibold text-green-700 mb-2">社交收益</p>
                    {result.productValue.coreBenefits.social.map((b: string, i: number) => (
                      <p key={i} className="text-xs text-gray-600 mb-1">· {b}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'user' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-[#667eea]" />
              </div>
              <h3 className="font-semibold text-gray-900">用户画像</h3>
            </div>
            {result.userProfile?.persona && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-[#667eea]/25">
                    {(result.userProfile.persona.name || '用')[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{result.userProfile.persona.name || '目标用户'}</p>
                    <p className="text-sm text-gray-500">{result.userProfile.persona.archetype || ''}</p>
                  </div>
                </div>
                {result.userProfile.persona.description && (
                  <p className="text-sm text-gray-700 bg-[#f6f6f6] rounded-xl p-4 leading-relaxed">{result.userProfile.persona.description}</p>
                )}
                {result.userProfile.persona.quote && (
                  <blockquote className="border-l-4 border-[#667eea] pl-4 italic text-gray-600 text-sm py-1">
                    &ldquo;{result.userProfile.persona.quote}&rdquo;
                  </blockquote>
                )}
              </div>
            )}
          </div>

          {result.userProfile?.painPoints?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-red-500" /> 痛点分析
              </h3>
              <div className="space-y-2">
                {result.userProfile.painPoints.map((p: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-50/50">
                    <span className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">{typeof p === 'string' ? p : p.pain || p.description}</p>
                      {typeof p === 'object' && p.intensity && (
                        <span className="text-xs text-red-500 mt-1">强度：{p.intensity}{p.frequency && ` · 频率：${p.frequency}`}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.userProfile?.emotionalNeeds?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" /> 情感需求
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.userProfile.emotionalNeeds.map((n: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 text-[#667eea] text-sm">
                    {typeof n === 'string' ? n : n.need || n.description}
                    {typeof n === 'object' && n.priority && <span className="text-xs ml-1 opacity-60">({n.priority})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.userProfile?.motivationTriggers?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#667eea]" /> 动机触发
              </h3>
              <div className="space-y-2">
                {result.userProfile.motivationTriggers.map((t: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5">
                    <span className="text-sm">{typeof t === 'string' ? t : t.trigger}</span>
                    {typeof t === 'object' && t.context && <span className="text-xs text-gray-500">场景：{t.context}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scenes' && (
        <div className="space-y-5">
          {result.scenarios?.length > 0 ? result.scenarios.map((scenario: any, i: number) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#667eea]/[0.04] to-[#764ba2]/[0.04] px-6 py-4 border-b">
                <h3 className="font-semibold text-gray-900 text-lg">{scenario.title}</h3>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                  {scenario.setting?.time && <span>🕐 {scenario.setting.time}</span>}
                  {scenario.setting?.place && <span>📍 {scenario.setting.place}</span>}
                  {scenario.setting?.atmosphere && <span>✨ {scenario.setting.atmosphere}</span>}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {scenario.character && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f6f6f6]">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-bold shadow-sm">
                      {(scenario.character.name || '主')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{scenario.character.name || '主角'}</p>
                      <p className="text-xs text-gray-500">{scenario.character.state || ''} · {scenario.character.desire || ''}</p>
                    </div>
                  </div>
                )}

                {scenario.plot && (
                  <div className="space-y-3">
                    {scenario.plot.setup && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-600 flex-shrink-0 mt-0.5 font-semibold">1</div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-0.5">背景</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{scenario.plot.setup}</p>
                        </div>
                      </div>
                    )}
                    {scenario.plot.conflict && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-xs text-red-600 flex-shrink-0 mt-0.5 font-semibold">2</div>
                        <div>
                          <p className="text-xs font-medium text-gray-400 mb-0.5">挑战</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{scenario.plot.conflict}</p>
                        </div>
                      </div>
                    )}
                    {scenario.plot.climax && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center text-xs text-white flex-shrink-0 mt-0.5 font-semibold">3</div>
                        <div>
                          <p className="text-xs font-medium text-[#667eea] mb-0.5">产品介入</p>
                          <p className="text-sm text-[#667eea] font-medium leading-relaxed">{scenario.plot.climax}</p>
                        </div>
                      </div>
                    )}
                    {scenario.plot.resolution && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs text-green-600 flex-shrink-0 mt-0.5 font-semibold">4</div>
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-0.5">解决方案</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{scenario.plot.resolution}</p>
                        </div>
                      </div>
                    )}
                    {scenario.plot.aftermath && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs text-amber-600 flex-shrink-0 mt-0.5 font-semibold">5</div>
                        <div>
                          <p className="text-xs font-medium text-amber-600 mb-0.5">后续</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{scenario.plot.aftermath}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {scenario.emotionalArc && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 mb-2">情感弧线</p>
                    <div className="flex gap-2">
                      {scenario.emotionalArc.map((e: string, j: number) => (
                        <span key={j} className="px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 text-xs">{e}</span>
                      ))}
                    </div>
                  </div>
                )}

                {scenario.sensoryDetails?.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 mb-2">感官细节</p>
                    <div className="flex flex-wrap gap-2">
                      {scenario.sensoryDetails.map((d: string, j: number) => (
                        <span key={j} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 text-[#764ba2] text-xs">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="text-center py-16">
              <Film className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">暂无使用场景数据</p>
            </div>
          )}
        </div>
      )}

      {showChannelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowChannelModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">多渠道内容适配</h3>
              <button onClick={() => setShowChannelModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-4 flex-wrap">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      activeChannel === ch.id ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md shadow-[#667eea]/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{ch.icon}</span> {ch.name}
                  </button>
                ))}
              </div>
              {CHANNELS.find(c => c.id === activeChannel) && (
                <div className="flex gap-3 mb-4 text-xs text-gray-400">
                  <span>格式：{CHANNELS.find(c => c.id === activeChannel)!.format}</span>
                  <span>建议长度：{CHANNELS.find(c => c.id === activeChannel)!.length}</span>
                  <span>风格：{CHANNELS.find(c => c.id === activeChannel)!.style}</span>
                </div>
              )}
              <div className="bg-[#f6f6f6] rounded-xl p-4 max-h-[40vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{adaptContent(activeChannel)}</pre>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
              <Button variant="ghost" onClick={() => setShowChannelModal(false)}>关闭</Button>
              <Button className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25" onClick={() => handleCopy(adaptContent(activeChannel))}>
                {copied ? <><CheckCircle className="w-4 h-4 mr-1" /> 已复制</> : <><Copy className="w-4 h-4 mr-1" /> 复制内容</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRefineModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowRefineModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">优化改进</h3>
              <button onClick={() => setShowRefineModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-800 mb-2">优化指令</label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition resize-none bg-[#f6f6f6]"
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
                placeholder="描述你希望如何优化内容，例如：让品牌故事更有感染力、增加更多数据支撑、调整语调更专业..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{refineInstruction.length}/500</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
              <Button variant="ghost" onClick={() => setShowRefineModal(false)}>取消</Button>
              <Button
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25"
                onClick={handleRefine}
                disabled={!refineInstruction.trim() || refineLoading}
              >
                {refineLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> 优化中...</> : <><RefreshCw className="w-4 h-4 mr-1" /> 开始优化</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
