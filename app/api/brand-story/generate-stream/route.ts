import { NextRequest } from 'next/server';
import { BrandStoryAgent, SSEEvent } from '@/lib/brand-story/Agent';
import { db } from '@/lib/db/drizzle';
import { stories } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: '未授权，请先登录' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: '请求体解析失败' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    productName, productDesc, targetUser, productFeatures,
    template, tone, brandId, provider, apiKey, baseUrl, model
  } = body;

  if (!productName || !productDesc) {
    return new Response(JSON.stringify({ error: '产品名称和描述为必填项' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resolvedProvider = provider || process.env.AI_PROVIDER || 'mock';
  const resolvedApiKey = apiKey || process.env.AI_API_KEY;
  const resolvedBaseUrl = baseUrl || process.env.AI_BASE_URL;
  const resolvedModel = model || process.env.AI_MODEL;

  if (resolvedProvider !== 'mock' && resolvedProvider !== 'ollama' && !resolvedApiKey) {
    return new Response(JSON.stringify({
      error: `${resolvedProvider} API Key 未配置。请在环境变量中设置 AI_API_KEY，或在设置页面配置您的 API Key。`,
      code: 'API_KEY_MISSING',
      provider: resolvedProvider,
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let finalResult: any = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        const agent = new BrandStoryAgent({
          provider: resolvedProvider,
          apiKey: resolvedApiKey,
          baseUrl: resolvedBaseUrl,
          model: resolvedModel,
        });

        finalResult = await agent.createBrandStoryStream(
          {
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
          },
          send,
        );

        try {
          const team = await db.query.teamMembers.findFirst({
            where: (tm: any, { eq }: any) => eq(tm.userId, user.id),
          });

          if (team) {
            const content = finalResult.brandStory?.content || '';
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
              resultData: JSON.stringify(finalResult),
              wordCount: content.length,
              provider: resolvedProvider,
              model: resolvedModel || null,
            });
          }
        } catch (dbError) {
          console.error('保存到数据库失败（不影响返回结果）:', dbError);
        }

        controller.close();
      } catch (error: any) {
        console.error('品牌故事生成失败:', error);
        send({
          type: 'error',
          error: error.message || '生成失败',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
