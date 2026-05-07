'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Building2, Plus, Edit3, Trash2, Star, Loader2,
  Search, X, Check, ArrowRight, Sparkles, Heart, Eye
} from 'lucide-react';
import Link from 'next/link';

interface Brand {
  id: number;
  name: string;
  industry: string | null;
  description: string | null;
  values: string[];
  tone: string | null;
  targetAudience: any;
  createdAt: string;
  updatedAt: string;
}

const INDUSTRIES = [
  '科技', '电商', '教育', '金融', '医疗健康', '餐饮',
  '旅游', '美妆', '服饰', '家居', '汽车', '娱乐',
  '其他',
];

const TONES = [
  { id: 'warm_professional', name: '温暖专业' },
  { id: 'inspiring', name: '激励鼓舞' },
  { id: 'elegant', name: '优雅精致' },
  { id: 'playful', name: '活泼有趣' },
  { id: 'trustworthy', name: '可靠信赖' },
];

const BRAND_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-purple-500 to-violet-600',
  'from-amber-400 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-cyan-400 to-blue-600',
  'from-red-500 to-pink-600',
  'from-green-400 to-emerald-600',
];

function getBrandGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length];
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    industry: '',
    description: '',
    values: '',
    tone: 'warm_professional',
  });

  const fetchBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      if (data.brands) setBrands(data.brands);
    } catch (err) {
      console.error('加载品牌列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const openCreateForm = () => {
    setEditingBrand(null);
    setForm({ name: '', industry: '', description: '', values: '', tone: 'warm_professional' });
    setShowForm(true);
  };

  const openEditForm = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      industry: brand.industry || '',
      description: brand.description || '',
      values: Array.isArray(brand.values) ? brand.values.join(', ') : '',
      tone: brand.tone || 'warm_professional',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const valuesArr = form.values
        .split(/[,，、]/)
        .map(v => v.trim())
        .filter(Boolean);

      if (editingBrand) {
        const res = await fetch('/api/brands', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingBrand.id,
            name: form.name,
            industry: form.industry || null,
            description: form.description || null,
            values: valuesArr,
            tone: form.tone,
          }),
        });
        const data = await res.json();
        if (data.brand) {
          setBrands(prev => prev.map(b => b.id === editingBrand.id ? data.brand : b));
        }
      } else {
        const res = await fetch('/api/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            industry: form.industry || null,
            description: form.description || null,
            values: valuesArr,
            tone: form.tone,
          }),
        });
        const data = await res.json();
        if (data.brand) {
          setBrands(prev => [data.brand, ...prev]);
        }
      }
      setShowForm(false);
    } catch (err) {
      console.error('保存品牌失败:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/brands?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBrands(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error('删除品牌失败:', err);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = brands.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.industry && b.industry.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#667eea] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/10 to-transparent" />
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">品牌库</h1>
            <p className="text-gray-500 text-sm mt-0.5">管理品牌信息，创作时快速引用</p>
          </div>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25"
        >
          <Plus className="w-4 h-4 mr-2" /> 新建品牌
        </Button>
      </div>

      {brands.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索品牌名称或行业..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea]/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">{editingBrand ? '编辑品牌' : '新建品牌'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：小米、蔚来、完美日记"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属行业</label>
                <select
                  value={form.industry}
                  onChange={e => setForm(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea]/40 bg-white"
                >
                  <option value="">选择行业</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌描述</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="简要描述品牌定位、核心产品或服务..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea]/40 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌价值观</label>
                <input
                  type="text"
                  value={form.values}
                  onChange={e => setForm(prev => ({ ...prev, values: e.target.value }))}
                  placeholder="用逗号分隔，例如：创新, 可靠, 用户至上"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#667eea]/20 focus:border-[#667eea]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌调性</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setForm(prev => ({ ...prev, tone: t.id }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.tone === t.id
                          ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50/50 rounded-b-2xl">
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-gray-500">取消</Button>
              <Button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {editingBrand ? '保存修改' : '创建品牌'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(brand => {
            const gradient = getBrandGradient(brand.name);
            return (
              <div key={brand.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                <div className={`h-20 bg-gradient-to-br ${gradient} relative`}>
                  <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/10 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <span className="text-white/90 text-xs font-medium bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {brand.industry || '未分类'}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditForm(brand)}
                      className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
                      disabled={deleting === brand.id}
                      className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-colors"
                    >
                      {deleting === brand.id ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-base mb-1">{brand.name}</h3>
                  {brand.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{brand.description}</p>
                  )}
                  {Array.isArray(brand.values) && brand.values.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {brand.values.slice(0, 4).map((v: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#667eea]/5 to-[#764ba2]/5 text-[#667eea] font-medium">
                          {v}
                        </span>
                      ))}
                      {brand.values.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          +{brand.values.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      {TONES.find(t => t.id === brand.tone)?.name || ''}
                    </span>
                    <Link href={`/dashboard/brand-story?brandId=${brand.id}`}>
                      <Button variant="ghost" size="sm" className="text-[#667eea] text-xs h-7 px-2">
                        <Sparkles className="w-3 h-3 mr-1" /> 创作故事
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            {search ? '没有找到匹配的品牌' : '还没有品牌'}
          </h3>
          <p className="text-sm text-gray-300 mb-6">
            {search ? '尝试其他搜索关键词' : '创建品牌后，创作时可快速引用品牌信息'}
          </p>
          {!search && (
            <Button
              onClick={openCreateForm}
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:from-[#5a72d8] hover:to-[#6a4192] text-white shadow-lg shadow-[#667eea]/25"
            >
              <Plus className="w-4 h-4 mr-2" /> 创建第一个品牌
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
