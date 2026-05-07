'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Palette, Image, Share2, Sparkles, Download, Copy, CheckCircle,
  RefreshCw, Loader2, Wand2, Layout, Type, Layers, Cpu, Settings2,
  AlertCircle, ZoomIn, X, ChevronDown, Gem
} from 'lucide-react';

interface DBStory {
  id: number;
  productName: string | null;
  productDesc: string | null;
  resultData: any;
  template: string | null;
  tone: string | null;
  content: string | null;
}

interface GeneratedPoster {
  imageUrl: string;
  imageBase64?: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  duration: number;
  size: { width: number; height: number };
  metadata: {
    generatedAt: string;
    inputHash: string;
    qualityScore?: number;
  };
}

const COLOR_PALETTES: Record<string, { name: string; colors: string[]; desc: string }> = {
  tech: { name: '科技蓝', colors: ['#667eea', '#764ba2', '#5a72d8', '#8b6fbf', '#9b8fd4', '#b8a8e8'], desc: '创新、智能、未来感' },
  lifestyle: { name: '生活暖', colors: ['#f6d365', '#fda085', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'], desc: '温暖、自然、亲和' },
  health: { name: '健康绿', colors: ['#11998e', '#38ef7d', '#56ab2f', '#a8e063', '#43e97b', '#38f9d7'], desc: '活力、健康、生机' },
  education: { name: '教育紫', colors: ['#6B4C8A', '#8B6AAF', '#A888CF', '#C4A8E3', '#D8C4F0', '#EDE0F7'], desc: '智慧、深度、创新' },
  finance: { name: '金融金', colors: ['#f7971e', '#ffd200', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'], desc: '稳重、价值、尊贵' },
  travel: { name: '旅行蓝', colors: ['#4facfe', '#00f2fe', '#667eea', '#764ba2', '#43e97b', '#38f9d7'], desc: '开阔、自由、探索' },
};

const POSTER_STYLES = [
  { id: 'minimal' as const, name: '极简风格', desc: '大量留白，突出核心信息', icon: Layout },
  { id: 'story' as const, name: '故事叙事', desc: '图文结合，沉浸式阅读', icon: Type },
  { id: 'brand' as const, name: '品牌展示', desc: 'Logo+标语，强化品牌记忆', icon: Layers },
  { id: 'elegant' as const, name: '优雅质感', desc: '精致配色，高端品牌调性', icon: Gem },
  { id: 'bold' as const, name: '大胆醒目', desc: '强烈对比，视觉冲击力', icon: Sparkles },
];

const SOCIAL_SIZES = [
  { id: 'wechat_cover', name: '微信封面', width: 900, height: 383 },
  { id: 'xiaohongshu', name: '小红书', width: 1080, height: 1440 },
  { id: 'wechat_article', name: '公众号头图', width: 900, height: 500 },
  { id: 'weibo', name: '微博配图', width: 1080, height: 1080 },
  { id: 'douyin', name: '抖音封面', width: 1080, height: 1920 },
];

const AI_MODELS = [
  { id: 'flux-schnell', name: 'FLUX.1 Schnell', provider: 'siliconflow', desc: '快速生成，适合迭代', badge: '推荐' },
  { id: 'flux-dev', name: 'FLUX.1 Dev', provider: 'siliconflow', desc: '高质量，细节丰富', badge: '' },
  { id: 'sd3-large', name: 'Stable Diffusion 3.5', provider: 'siliconflow', desc: '专业级画质', badge: '' },
  { id: 'dall-e-3', name: 'DALL·E 3', provider: 'openai', desc: 'OpenAI 旗舰模型', badge: '' },
  { id: 'mock', name: '模拟生成', provider: 'mock', desc: '无需API，本地预览', badge: '免费' },
];

export default function VisualAssetsPage() {
  const [history, setHistory] = useState<DBStory[]>([]);
  const [selectedStory, setSelectedStory] = useState<DBStory | null>(null);
  const [activeTab, setActiveTab] = useState<'palette' | 'poster' | 'social'>('palette');
  const [selectedPalette, setSelectedPalette] = useState<string>('tech');
  const [selectedStyle, setSelectedStyle] = useState<string>('minimal');
  const [selectedSocial, setSelectedSocial] = useState<string>('wechat_cover');
  const [copied, setCopied] = useState(false);
  const [posterText, setPosterText] = useState('');
  const [posterSubtitle, setPosterSubtitle] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedModel, setSelectedModel] = useState('flux-schnell');
  const [apiKey, setApiKey] = useState('');
  const [showModelConfig, setShowModelConfig] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState<GeneratedPoster | null>(null);
  const [posterError, setPosterError] = useState('');
  const [posterHistory, setPosterHistory] = useState<GeneratedPoster[]>([]);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    fetch('/api/stories')
      .then(res => res.json())
      .then(data => {
        if (data.stories) {
          setHistory(data.stories);
          if (data.stories.length > 0) {
            const first = data.stories[0];
            setSelectedStory(first);
            setPosterText(first.productName || '');
            setPosterSubtitle(first.resultData?.productValue?.coreValue || first.productDesc?.slice(0, 50) || '');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleExportPalette = () => {
    const palette = COLOR_PALETTES[selectedPalette];
    const css = `:root {\n${palette.colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`;
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPalette}-palette.css`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePoster = useCallback(async () => {
    if (!posterText.trim()) return;

    setGenerating(true);
    setPosterError('');
    setGeneratedPoster(null);

    const selectedSize = SOCIAL_SIZES.find(s => s.id === selectedSocial) || SOCIAL_SIZES[0];

    try {
      const response = await fetch('/api/posters/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: posterText.trim(),
          subtitle: posterSubtitle.trim() || undefined,
          brandName: selectedStory?.productName || undefined,
          style: selectedStyle,
          palette: COLOR_PALETTES[selectedPalette]?.colors || ['#667eea', '#764ba2', '#5a72d8'],
          size: { width: selectedSize.width, height: selectedSize.height, name: selectedSize.name },
          storyContent: selectedStory?.content || undefined,
          modelId: selectedModel,
          apiKey: apiKey || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `请求失败 (${response.status})`);
      }

      if (data.poster) {
        setGeneratedPoster(data.poster);
        setPosterHistory(prev => [data.poster, ...prev].slice(0, 10));
      }
    } catch (err: any) {
      setPosterError(err.message || '海报生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  }, [posterText, posterSubtitle, selectedStory, selectedStyle, selectedPalette, selectedSocial, selectedModel, apiKey]);

  const handleDownloadPoster = useCallback(() => {
    if (!generatedPoster) return;

    const dataUrl = generatedPoster.imageBase64
      ? `data:image/png;base64,${generatedPoster.imageBase64}`
      : generatedPoster.imageUrl;

    if (dataUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${posterText || 'brand'}-poster.png`;
      a.click();
    } else if (dataUrl.startsWith('http')) {
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${posterText || 'brand'}-poster.png`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => {
          window.open(dataUrl, '_blank');
        });
    }
  }, [generatedPoster, posterText]);

  const handleDownloadCanvas = () => {
    const canvas = document.createElement('canvas');
    const size = SOCIAL_SIZES.find(s => s.id === selectedSocial) || SOCIAL_SIZES[0];
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = COLOR_PALETTES[selectedPalette];
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, palette.colors[0]);
    gradient.addColorStop(0.5, palette.colors[1]);
    gradient.addColorStop(1, palette.colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 200 + 50, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    const titleSize = Math.max(32, Math.floor(canvas.width / 20));
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.fillText(posterText || '品牌故事', canvas.width / 2, canvas.height * 0.4);

    const subSize = Math.max(16, Math.floor(canvas.width / 35));
    ctx.font = `${subSize}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(posterSubtitle || 'AI 驱动的品牌故事', canvas.width / 2, canvas.height * 0.4 + titleSize + 16);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${posterText || 'brand'}-${size.name}.png`;
    a.click();
  };

  const palette = COLOR_PALETTES[selectedPalette];

  const getPosterImageSrc = (poster: GeneratedPoster) => {
    if (poster.imageBase64) {
      return poster.imageBase64.startsWith('data:') ? poster.imageBase64 : `data:image/png;base64,${poster.imageBase64}`;
    }
    return poster.imageUrl;
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/10 to-transparent" />
          <Palette className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">品牌视觉资产</h1>
          <p className="text-gray-500 text-sm mt-0.5">基于品牌故事生成视觉设计素材</p>
        </div>
      </div>

      {selectedStory && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-[#667eea]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">当前品牌：{selectedStory.productName}</p>
            <p className="text-xs text-gray-400 truncate">{selectedStory.productDesc}</p>
          </div>
          <select
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-[#f6f6f6] outline-none focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea]"
            value={selectedStory.id}
            onChange={(e) => {
              const s = history.find(h => h.id === Number(e.target.value));
              if (s) {
                setSelectedStory(s);
                setPosterText(s.productName || '');
                setPosterSubtitle(s.resultData?.productValue?.coreValue || s.productDesc?.slice(0, 50) || '');
                setGeneratedPoster(null);
              }
            }}
          >
            {history.map(h => (
              <option key={h.id} value={h.id}>{h.productName || '未命名'}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100/80 rounded-xl p-1">
        {[
          { key: 'palette' as const, label: '品牌色板', icon: Palette },
          { key: 'poster' as const, label: 'AI海报', icon: Image },
          { key: 'social' as const, label: '社交图卡', icon: Share2 },
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TabIcon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'palette' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">选择色板风格</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(COLOR_PALETTES).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setSelectedPalette(key)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    selectedPalette === key ? 'border-[#667eea] shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-1 mb-3">
                    {p.colors.slice(0, 4).map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="font-medium text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                  {selectedPalette === key && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">色板预览</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPalette}>
                  <Download className="w-3.5 h-3.5 mr-1" /> 导出CSS
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {palette.colors.map((color, i) => (
                <button key={i} className="flex-1 group relative" onClick={() => handleCopyColor(color)}>
                  <div className="h-24 rounded-xl transition-transform duration-200 group-hover:scale-105 shadow-sm" style={{ backgroundColor: color }} />
                  <div className="mt-2 text-center">
                    <p className="text-xs font-mono text-gray-700">{color}</p>
                    <p className="text-[10px] text-gray-400">色阶 {i + 1}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 rounded-lg px-2 py-1">
                      {copied ? <CheckCircle className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-gray-100" style={{ backgroundColor: palette.colors[0] }}>
                <p className="text-white/60 text-xs mb-1">主色背景</p>
                <p className="text-white font-semibold text-lg">{selectedStory?.productName || '品牌名称'}</p>
                <p className="text-white/70 text-sm mt-1">{posterSubtitle || '品牌标语'}</p>
              </div>
              <div className="p-5 rounded-xl border border-gray-100 bg-white">
                <div className="flex gap-2 mb-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.colors[0] }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.colors[2] }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.colors[4] }} />
                </div>
                <p className="text-gray-900 font-semibold text-lg">{selectedStory?.productName || '品牌名称'}</p>
                <p className="text-gray-500 text-sm mt-1">{posterSubtitle || '品牌标语'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'poster' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">选择海报风格</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {POSTER_STYLES.map((style) => {
                const StyleIcon = style.icon;
                return (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      selectedStyle === style.id ? 'border-[#667eea] bg-gradient-to-br from-[#667eea]/[0.03] to-[#764ba2]/[0.03]' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <StyleIcon className={`w-6 h-6 mx-auto mb-2 ${selectedStyle === style.id ? 'text-[#667eea]' : 'text-gray-400'}`} />
                    <p className="font-medium text-xs text-gray-900">{style.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{style.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">海报内容</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">主标题</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  value={posterText}
                  onChange={(e) => setPosterText(e.target.value)}
                  placeholder="输入主标题"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">副标题</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  value={posterSubtitle}
                  onChange={(e) => setPosterSubtitle(e.target.value)}
                  placeholder="输入副标题或品牌标语"
                  maxLength={60}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">色板</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                    value={selectedPalette}
                    onChange={(e) => setSelectedPalette(e.target.value)}
                  >
                    {Object.entries(COLOR_PALETTES).map(([key, p]) => (
                      <option key={key} value={key}>{p.name} — {p.desc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">尺寸</label>
                  <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                    value={selectedSocial}
                    onChange={(e) => setSelectedSocial(e.target.value)}
                  >
                    {SOCIAL_SIZES.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.width}×{s.height})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <button
              type="button"
              onClick={() => setShowModelConfig(!showModelConfig)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-800 w-full"
            >
              <Cpu className="w-4 h-4 text-[#667eea]" />
              <span>AI 模型配置</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${showModelConfig ? 'rotate-180' : ''}`} />
            </button>

            {showModelConfig && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">选择生成模型</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {AI_MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                          selectedModel === m.id ? 'border-[#667eea] bg-[#667eea]/[0.03]' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-900">{m.name}</p>
                          {m.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              m.badge === '推荐' ? 'bg-[#667eea]/10 text-[#667eea]' :
                              m.badge === '免费' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                        <p className="text-[10px] text-gray-400 mt-1">提供商: {m.provider === 'siliconflow' ? '硅基流动' : m.provider === 'openai' ? 'OpenAI' : '本地'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedModel !== 'mock' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      API Key <span className="text-gray-400 font-normal">（留空使用服务端配置）</span>
                    </label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`输入${AI_MODELS.find(m => m.id === selectedModel)?.provider === 'siliconflow' ? '硅基流动' : 'OpenAI'} API Key`}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">AI 海报生成</h3>
              <Button
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25"
                size="sm"
                onClick={handleGeneratePoster}
                disabled={generating || !posterText.trim()}
              >
                {generating ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> 生成中...</>
                ) : (
                  <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> 生成海报</>
                )}
              </Button>
            </div>

            <div className="p-6">
              {posterError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">生成失败</p>
                    <p className="text-xs text-red-600 mt-0.5">{posterError}</p>
                  </div>
                  <button onClick={() => setPosterError('')} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-xl shadow-[#667eea]/30">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 rounded-3xl animate-pulse" />
                  </div>
                  <p className="text-base font-semibold text-gray-900 mb-1">AI 正在创作海报</p>
                  <p className="text-sm text-gray-500">
                    使用 {AI_MODELS.find(m => m.id === selectedModel)?.name} 生成中...
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#667eea] animate-pulse" />
                    预计需要 10-30 秒
                  </div>
                </div>
              )}

              {!generating && generatedPoster && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative group cursor-pointer" onClick={() => setShowLightbox(true)}>
                      <img
                        src={getPosterImageSrc(generatedPoster)}
                        alt={posterText}
                        className="max-w-full max-h-[500px] rounded-xl shadow-xl border border-gray-100 object-contain"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{generatedPoster.provider}/{generatedPoster.model}</span>
                      <span>{(generatedPoster.duration / 1000).toFixed(1)}s</span>
                      {generatedPoster.metadata.qualityScore && (
                        <span className="text-green-600">质量: {(generatedPoster.metadata.qualityScore * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleGeneratePoster} disabled={generating}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重新生成
                      </Button>
                      <Button size="sm" onClick={handleDownloadPoster} className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white">
                        <Download className="w-3.5 h-3.5 mr-1" /> 下载
                      </Button>
                    </div>
                  </div>

                  {generatedPoster.revisedPrompt && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs font-medium text-gray-600 mb-1">AI 优化后的提示词</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{generatedPoster.revisedPrompt}</p>
                    </div>
                  )}
                </div>
              )}

              {!generating && !generatedPoster && !posterError && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center mb-4">
                    <Image className="w-8 h-8 text-[#667eea]/50" />
                  </div>
                  <p className="text-base font-medium text-gray-400 mb-1">选择风格和内容后点击生成</p>
                  <p className="text-sm text-gray-300">AI 将根据品牌故事创建专业海报</p>
                </div>
              )}
            </div>
          </div>

          {posterHistory.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">生成历史</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {posterHistory.slice(1).map((poster, i) => (
                  <button
                    key={i}
                    className="relative group rounded-xl overflow-hidden border border-gray-200 hover:border-[#667eea] transition-colors"
                    onClick={() => setGeneratedPoster(poster)}
                  >
                    <img
                      src={getPosterImageSrc(poster)}
                      alt={`历史海报 ${i + 1}`}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'social' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">图卡内容</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">标题</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  value={posterText}
                  onChange={(e) => setPosterText(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">副标题</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition bg-[#f6f6f6]"
                  value={posterSubtitle}
                  onChange={(e) => setPosterSubtitle(e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                图卡预览 — {SOCIAL_SIZES.find(s => s.id === selectedSocial)?.name}
              </h3>
              <Button
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25"
                size="sm"
                onClick={handleDownloadCanvas}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> 下载图片
              </Button>
            </div>
            <div className="p-6 flex justify-center">
              <div
                className="relative overflow-hidden shadow-xl rounded-lg"
                style={{
                  width: '320px',
                  height: `${Math.round(320 * (SOCIAL_SIZES.find(s => s.id === selectedSocial)?.height || 383) / (SOCIAL_SIZES.find(s => s.id === selectedSocial)?.width || 900))}px`,
                  background: `linear-gradient(135deg, ${palette.colors[0]}, ${palette.colors[2]}, ${palette.colors[4]})`,
                }}
              >
                <div className="absolute inset-0">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: `${80 + i * 40}px`,
                        height: `${80 + i * 40}px`,
                        top: `${10 + i * 20}%`,
                        left: `${-10 + i * 15}%`,
                        backgroundColor: `rgba(255,255,255,${0.02 + i * 0.015})`,
                      }}
                    />
                  ))}
                </div>
                <div className="relative h-full flex flex-col justify-center items-center p-6 text-center">
                  <p className="text-white/40 text-xs tracking-widest mb-4 uppercase">Brand Story</p>
                  <h2 className="text-white text-xl font-bold leading-tight mb-2">{posterText || '品牌名称'}</h2>
                  <div className="w-8 h-0.5 bg-white/30 my-3" />
                  <p className="text-white/70 text-xs leading-relaxed">{posterSubtitle || '品牌标语'}</p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-4 text-center">
              <p className="text-xs text-gray-400">
                实际尺寸：{SOCIAL_SIZES.find(s => s.id === selectedSocial)?.width}×{SOCIAL_SIZES.find(s => s.id === selectedSocial)?.height}px
              </p>
            </div>
          </div>
        </div>
      )}

      {showLightbox && generatedPoster && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={getPosterImageSrc(generatedPoster)}
              alt={posterText}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-white/60 text-sm">{generatedPoster.provider}/{generatedPoster.model} · {(generatedPoster.duration / 1000).toFixed(1)}s</p>
              <Button size="sm" onClick={handleDownloadPoster} className="bg-white/20 hover:bg-white/30 text-white border-0">
                <Download className="w-3.5 h-3.5 mr-1" /> 下载高清
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
