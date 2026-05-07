import { NextRequest, NextResponse } from 'next/server';
import { BrandStoryAgent } from '@/lib/brand-story/Agent';
import { db } from '@/lib/db/drizzle';
import { stories } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const {
      productName, productDesc, targetUser, productFeatures,
      template, tone, brandId, provider, apiKey, baseUrl, model
    } = body;

    if (!productName || !productDesc) {
      return NextResponse.json({ error: '产品名称和描述为必填项' }, { status: 400 });
    }

    const resolvedProvider = provider || process.env.AI_PROVIDER || 'mock';
    const resolvedApiKey = apiKey || process.env.AI_API_KEY;
    const resolvedBaseUrl = baseUrl || process.env.AI_BASE_URL;
    const resolvedModel = model || process.env.AI_MODEL;

    if (resolvedProvider !== 'mock' && resolvedProvider !== 'ollama' && !resolvedApiKey) {
      return NextResponse.json({
        error: `${resolvedProvider} API Key 未配置。请在环境变量中设置 AI_API_KEY，或在设置页面配置您的 API Key。`,
        code: 'API_KEY_MISSING',
        provider: resolvedProvider,
      }, { status: 400 });
    }

    const agent = new BrandStoryAgent({
      provider: resolvedProvider,
      apiKey: resolvedApiKey,
      baseUrl: resolvedBaseUrl,
      model: resolvedModel,
    });

    const result = await agent.createBrandStory({
      productInfo: {
        name: productName,
        description: productDesc,
        features: productFeatures || [],
        category: template || undefined,
      },
      brandPositioning: {
        tone: tone || 'warm_professional',
        values: [],
        channels: ['微信公众号', '小红书'],
      },
      targetAudience: {
        description: targetUser || '追求品质生活的都市白领',
        demographics: {},
        psychographics: {},
      },
    });

    try {
      const team = await db.query.teamMembers.findFirst({
        where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
      });

      if (team) {
        const content = result.brandStory?.content || '';
        await db.insert(stories).values({
          teamId: team.teamId,
          brandId: brandId || null,
          title: `${productName} - 品牌故事`,
          content,
          style: template || 'brand_story',
          status: 'draft',
          productName,
          productDesc,
          targetUser: targetUser || null,
          productFeatures: productFeatures ? JSON.stringify(productFeatures) : null,
          tone: tone || null,
          template: template || null,
          resultData: JSON.stringify(result),
          wordCount: content.length,
          provider: resolvedProvider,
          model: resolvedModel || null,
        });
      }
    } catch (dbError) {
      console.error('保存到数据库失败（不影响返回结果）:', dbError);
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        provider: resolvedProvider,
        model: resolvedModel || 'default',
        isMock: resolvedProvider === 'mock',
      },
    });
  } catch (error: any) {
    console.error('品牌故事生成失败:', error);

    const isApiError = error.message?.includes('API') || error.message?.includes('Key') || error.message?.includes('连接');
    const statusCode = isApiError ? 502 : 500;

    return NextResponse.json({
      error: error.message || '生成失败',
      code: isApiError ? 'AI_SERVICE_ERROR' : 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: statusCode });
  }
}

export async function GET() {
  const provider = process.env.AI_PROVIDER || 'mock';
  const hasApiKey = !!process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || '';
  const baseUrl = process.env.AI_BASE_URL || '';

  return NextResponse.json({
    provider,
    model,
    hasApiKey,
    baseUrl: baseUrl ? '已配置' : '默认',
    isConfigured: provider === 'mock' || provider === 'ollama' || hasApiKey,
    supportedProviders: [
      { id: 'siliconflow', name: '硅基流动', requiresApiKey: true, defaultModel: 'Qwen/Qwen2.5-7B-Instruct' },
      { id: 'deepseek', name: 'DeepSeek', requiresApiKey: true, defaultModel: 'deepseek-chat' },
      { id: 'openai', name: 'OpenAI', requiresApiKey: true, defaultModel: 'gpt-4' },
      { id: 'claude', name: 'Claude', requiresApiKey: true, defaultModel: 'claude-3-5-sonnet-20241022' },
      { id: 'ollama', name: 'Ollama (本地)', requiresApiKey: false, defaultModel: 'qwen2.5:7b' },
      { id: 'mock', name: '模拟模式', requiresApiKey: false, defaultModel: 'mock' },
    ],
  });
}
