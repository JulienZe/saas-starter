'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Users, Settings, Shield, Activity, Menu, Sparkles,
  Clock, BookOpen, PenLine, BarChart3, Palette, LayoutDashboard,
  ChevronLeft, Building2
} from 'lucide-react';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navSections = [
    {
      title: '工作台',
      items: [
        { href: '/dashboard/overview', icon: LayoutDashboard, label: '数据概览' },
      ]
    },
    {
      title: '品牌故事',
      items: [
        { href: '/dashboard/brand-story', icon: PenLine, label: '开始创作' },
        { href: '/dashboard/brand-story/history', icon: Clock, label: '创作历史' },
        { href: '/dashboard/brand-story/visual', icon: Palette, label: '视觉资产' },
      ]
    },
    {
      title: '品牌管理',
      items: [
        { href: '/dashboard/brands', icon: Building2, label: '品牌库' },
      ]
    },
    {
      title: '系统设置',
      items: [
        { href: '/dashboard', icon: Users, label: '团队' },
        { href: '/dashboard/general', icon: Settings, label: '通用设置' },
        { href: '/dashboard/activity', icon: Activity, label: '活动记录' },
        { href: '/dashboard/security', icon: Shield, label: '安全设置' },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-medium text-gray-900">品牌故事工作台</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        <aside
          className={`w-64 bg-white lg:bg-white border-r border-gray-100 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            <div className="mb-8 px-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">品牌故事</p>
                  <p className="text-[10px] text-gray-400">AI创作工作台</p>
                </div>
              </div>
            </div>

            {navSections.map((section) => (
              <div key={section.title} className="mb-6">
                <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{section.title}</p>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href} passHref>
                      <Button
                        variant="ghost"
                        className={`shadow-none my-0.5 w-full justify-start gap-2.5 h-10 text-sm rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 text-[#667eea] hover:from-[#667eea]/15 hover:to-[#764ba2]/15 font-semibold'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-[#667eea]' : ''}`} />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-0 lg:p-4 bg-[#f6f6f6]">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
