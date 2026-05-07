'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3, TrendingUp, Sparkles, Clock, BookOpen, Star,
  PenLine, Eye, ArrowRight, Zap, Heart, Activity, Loader2
} from 'lucide-react';
import Link from 'next/link';

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

const TONES: Record<string, string> = {
  warm_professional: '温暖专业',
  inspiring: '激励鼓舞',
  elegant: '优雅精致',
  playful: '活泼有趣',
  trustworthy: '可靠信赖',
};

export default function DashboardPage() {
  const [stories, setStories] = useState<DBStory[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, totalWords: 0, avgWords: 0, favCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/stories');
        const data = await res.json();
        if (data.stories) setStories(data.stories);
        if (data.stats) setStats(data.stats);
      } catch (err) {
        console.error('加载数据失败:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const thisWeek = stories.filter(s => {
    const d = new Date(s.createdAt);
    const diff = Date.now() - d.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const templateDist: Record<string, number> = {};
  stories.forEach(s => {
    const key = s.template || 'other';
    templateDist[key] = (templateDist[key] || 0) + 1;
  });

  const last7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const count = stories.filter(s => {
      const t = new Date(s.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    last7Days.push({ date: dateStr, count });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#667eea] animate-spin" />
      </div>
    );
  }

  const maxCount = Math.max(...last7Days.map(d => d.count), 1);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/10 to-transparent" />
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">工作台</h1>
            <p className="text-gray-500 text-sm mt-0.5">品牌故事创作数据概览</p>
          </div>
        </div>
        <Link href="/dashboard/brand-story">
          <Button className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25">
            <Sparkles className="w-4 h-4 mr-2" /> 开始创作
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: '总创作数', value: stats.total, icon: BookOpen, gradient: 'from-[#667eea] to-[#764ba2]' },
          { label: '本周创作', value: thisWeek, icon: TrendingUp, gradient: 'from-[#5a72d8] to-[#667eea]' },
          { label: '总字数', value: stats.totalWords.toLocaleString(), icon: PenLine, gradient: 'from-[#764ba2] to-[#9b6fbf]' },
          { label: '收藏数', value: stats.favCount, icon: Heart, gradient: 'from-pink-500 to-rose-500' },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <StatIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#667eea]" /> 近7天创作趋势
            </h3>
            <span className="text-xs text-gray-400">共 {thisWeek} 篇</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {last7Days.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">{day.count}</span>
                <div className="w-full relative" style={{ height: '120px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(4, (day.count / maxCount) * 100)}%`,
                      background: day.count > 0
                        ? 'linear-gradient(to top, #667eea, #764ba2)'
                        : '#f3f4f6',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400">{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#667eea]" /> 模板分布
          </h3>
          {Object.keys(templateDist).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(templateDist)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const tpl = TEMPLATES[key];
                  const pct = Math.round((count / stats.total) * 100);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 flex items-center gap-1.5">
                          {tpl ? tpl.icon : '📌'} {tpl ? tpl.name : '其他'}
                        </span>
                        <span className="text-xs text-gray-400">{count}篇 · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">暂无数据</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#667eea]" /> 最近创作
          </h3>
          <Link href="/dashboard/brand-story/history">
            <Button variant="ghost" size="sm" className="text-[#667eea] text-xs">
              查看全部 <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>

        {stories.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {stories.slice(0, 5).map((item) => {
              const tpl = item.template ? TEMPLATES[item.template] : null;
              const toneName = item.tone ? (TONES[item.tone] || item.tone) : '';
              return (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center text-lg flex-shrink-0">
                    {tpl ? tpl.icon : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.productName || '未命名'}</p>
                      {item.isFavorite ? <Heart className="w-3 h-3 text-pink-500 fill-pink-500 flex-shrink-0" /> : null}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{item.productDesc}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {tpl && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 text-[#667eea]">{tpl.name}</span>
                    )}
                    {toneName && <span className="text-xs text-gray-400">{toneName}</span>}
                    <div className="flex items-center gap-0.5">
                      {item.rating > 0 ? (
                        <>
                          <Star className="w-3 h-3 text-[#667eea] fill-[#667eea]" />
                          <span className="text-xs text-gray-500">{item.rating}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">未评</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 w-16 text-right">
                      {new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 mb-1">还没有创作记录</p>
            <p className="text-xs text-gray-300">开始你的第一篇品牌故事创作吧</p>
            <Link href="/dashboard/brand-story">
              <Button className="mt-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25" size="sm">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> 开始创作
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl p-6 text-white shadow-lg shadow-[#667eea]/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">快速创作</h3>
              <p className="text-white/60 text-xs">AI 驱动，5步生成专业品牌内容</p>
            </div>
          </div>
          <Link href="/dashboard/brand-story">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2" /> 创作品牌故事
            </Button>
          </Link>
        </div>

        <div className="bg-gradient-to-br from-[#764ba2] to-[#9b6fbf] rounded-2xl p-6 text-white shadow-lg shadow-[#764ba2]/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">多渠道适配</h3>
              <p className="text-white/60 text-xs">一键适配微信、小红书、抖音等平台</p>
            </div>
          </div>
          <Link href="/dashboard/brand-story/history">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full backdrop-blur-sm">
              <Clock className="w-4 h-4 mr-2" /> 查看历史创作
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
