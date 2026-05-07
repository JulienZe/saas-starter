'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Clock, Search, Bookmark, BookmarkCheck, Trash2, Sparkles,
  BookOpen, PenLine, ChevronRight, BarChart3, Star, Heart,
  Download, Copy, CheckCircle, Eye, X, Loader2
} from 'lucide-react';

interface DBStory {
  id: number;
  productName: string | null;
  productDesc: string | null;
  template: string | null;
  tone: string | null;
  targetUser: string | null;
  resultData: any;
  isFavorite: number;
  rating: number;
  wordCount: number | null;
  provider: string | null;
  model: string | null;
  content: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  totalWords: number;
  avgWords: number;
  favCount: number;
}

const TEMPLATES: Record<string, { name: string; icon: string }> = {
  tech: { name: '科技产品', icon: '⚡' },
  lifestyle: { name: '生活方式', icon: '🌿' },
  health: { name: '健康运动', icon: '💪' },
  education: { name: '教育学习', icon: '📚' },
  finance: { name: '金融理财', icon: '💰' },
  travel: { name: '旅行出行', icon: '✈️' },
};

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [previewItem, setPreviewItem] = useState<DBStory | null>(null);
  const [copied, setCopied] = useState(false);
  const [stories, setStories] = useState<DBStory[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, totalWords: 0, avgWords: 0, favCount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter === 'favorites') params.set('favorites', 'true');
      const res = await fetch(`/api/stories?${params}`);
      const data = await res.json();
      if (data.stories) setStories(data.stories);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('加载历史记录失败:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const toggleFavorite = useCallback(async (id: number, currentFav: number) => {
    const newFav = currentFav ? 0 : 1;
    setStories(prev => prev.map(s => s.id === id ? { ...s, isFavorite: newFav } : s));
    try {
      await fetch('/api/stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isFavorite: !!newFav }),
      });
    } catch {
      setStories(prev => prev.map(s => s.id === id ? { ...s, isFavorite: currentFav } : s));
    }
  }, []);

  const updateRating = useCallback(async (id: number, rating: number) => {
    setStories(prev => prev.map(s => s.id === id ? { ...s, rating } : s));
    try {
      await fetch('/api/stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rating }),
      });
    } catch {
      console.error('更新评分失败');
    }
  }, []);

  const deleteItem = useCallback(async (id: number) => {
    setStories(prev => prev.filter(s => s.id !== id));
    if (previewItem?.id === id) setPreviewItem(null);
    try {
      await fetch(`/api/stories?id=${id}`, { method: 'DELETE' });
    } catch {
      fetchStories();
    }
  }, [previewItem, fetchStories]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = (item: DBStory) => {
    const content = `# ${item.productName || '品牌故事'}\n\n${item.content || item.resultData?.brandStory?.content || ''}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.productName || '品牌故事'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#667eea] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/10 to-transparent" />
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">创作历史</h1>
          <p className="text-gray-500 text-sm mt-0.5">管理你的品牌故事创作记录</p>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: '创作总数', value: stats.total, icon: BookOpen, gradient: 'from-[#667eea] to-[#764ba2]' },
            { label: '总字数', value: stats.totalWords > 1000 ? `${(stats.totalWords / 1000).toFixed(1)}k` : stats.totalWords, icon: BarChart3, gradient: 'from-[#5a72d8] to-[#667eea]' },
            { label: '平均字数', value: stats.avgWords, icon: Sparkles, gradient: 'from-[#764ba2] to-[#9b6fbf]' },
            { label: '收藏数', value: stats.favCount, icon: Heart, gradient: 'from-pink-500 to-rose-500' },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{stat.label}</span>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <StatIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea] outline-none transition text-sm bg-white"
            placeholder="搜索产品名称或描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all' ? 'bg-white text-[#667eea] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              filter === 'favorites' ? 'bg-white text-[#667eea] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bookmark className="w-3 h-3" /> 收藏
          </button>
        </div>
      </div>

      {stories.length > 0 ? (
        <div className="space-y-2">
          {stories.map((item) => {
            const template = item.template ? TEMPLATES[item.template] : null;
            const wordCount = item.wordCount || item.resultData?.brandStory?.wordCount || 0;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-all duration-200 p-4 flex items-center gap-4 group cursor-pointer"
                onClick={() => setPreviewItem(item)}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center text-xl flex-shrink-0">
                  {template?.icon || '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{item.productName || '未命名'}</h3>
                    {item.isFavorite ? <Heart className="w-3 h-3 text-pink-500 fill-pink-500 flex-shrink-0" /> : null}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{item.productDesc}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                    {wordCount > 0 && <span>{wordCount}字</span>}
                    {template && <span className="text-[#667eea]">{template.name}</span>}
                    {item.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-[#667eea] fill-[#667eea]" /> {item.rating}
                      </span>
                    )}
                    {item.provider && item.provider !== 'mock' && (
                      <span className="text-gray-300">{item.provider}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleFavorite(item.id, item.isFavorite)}
                    className={`p-2 rounded-lg transition-colors ${
                      item.isFavorite ? 'text-pink-500 bg-pink-50' : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'
                    }`}
                    title={item.isFavorite ? '取消收藏' : '收藏'}
                  >
                    {item.isFavorite ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleExport(item)}
                    className="p-2 rounded-lg text-gray-400 hover:text-[#667eea] hover:bg-[#667eea]/5 transition-colors"
                    title="导出"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
              </div>
            );
          })}
          <p className="text-center text-xs text-gray-400 mt-4">共 {stories.length} 条记录</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-500 mb-1">
            {search || filter === 'favorites' ? '没有找到匹配的记录' : '暂无创作记录'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {search || filter === 'favorites' ? '尝试其他筛选条件' : '开始你的第一次品牌故事创作'}
          </p>
          {!search && filter === 'all' && (
            <Button
              onClick={() => window.location.href = '/dashboard/brand-story'}
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25"
            >
              <PenLine className="w-4 h-4 mr-2" /> 开始创作
            </Button>
          )}
        </div>
      )}

      {previewItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreviewItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#667eea]/[0.03] to-[#764ba2]/[0.03]">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{previewItem.productName || '品牌故事'}</h3>
                {previewItem.template && TEMPLATES[previewItem.template] && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 text-[#667eea]">
                    {TEMPLATES[previewItem.template].icon} {TEMPLATES[previewItem.template].name}
                  </span>
                )}
                {previewItem.provider && previewItem.provider !== 'mock' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {previewItem.provider} / {previewItem.model}
                  </span>
                )}
              </div>
              <button onClick={() => setPreviewItem(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                <span>{new Date(previewItem.createdAt).toLocaleDateString('zh-CN')}</span>
                {(previewItem.wordCount || 0) > 0 && <span>{previewItem.wordCount}字</span>}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-400">评分</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={`text-lg ${(previewItem.rating || 0) >= n ? 'text-[#667eea]' : 'text-gray-300'}`}
                      onClick={() => updateRating(previewItem.id, n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              {previewItem.resultData?.productValue?.coreValue && (
                <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5">
                  <p className="text-xs text-[#667eea] font-medium mb-1">核心价值</p>
                  <p className="text-sm text-gray-700">{previewItem.resultData.productValue.coreValue}</p>
                </div>
              )}
              <article className="text-gray-700 leading-[1.8] text-sm">
                {(previewItem.content || previewItem.resultData?.brandStory?.content || '').split('\n').map((line: string, i: number) => {
                  if (!line.trim()) return <div key={i} className="h-2" />;
                  if (line.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">{line.slice(2)}</h2>;
                  if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-gray-800 mt-3 mb-1.5">{line.slice(3)}</h3>;
                  if (line.startsWith('---')) return <hr key={i} className="my-4 border-gray-200" />;
                  const boldParsed = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900 font-semibold">$1</strong>');
                  return <p key={i} className="mb-3" dangerouslySetInnerHTML={{ __html: boldParsed }} />;
                })}
              </article>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
              <Button variant="ghost" onClick={() => handleCopy(previewItem.content || previewItem.resultData?.brandStory?.content || '')}>
                {copied ? <><CheckCircle className="w-4 h-4 mr-1 text-[#667eea]" /> 已复制</> : <><Copy className="w-4 h-4 mr-1" /> 复制</>}
              </Button>
              <Button variant="outline" onClick={() => handleExport(previewItem)}>
                <Download className="w-4 h-4 mr-1" /> 导出
              </Button>
              <Button className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25" onClick={() => setPreviewItem(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
