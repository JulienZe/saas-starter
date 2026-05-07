import { NextRequest, NextResponse } from 'next/server';
import { PosterGenerator, POSTER_MODELS } from '@/lib/brand-story/PosterGenerator';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体解析失败' }, { status: 400 });
  }

  const {
    title,
    subtitle,
    brandName,
    style,
    palette,
    size,
    storyContent,
    additionalContext,
    modelId,
    apiKey,
    baseUrl,
  } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: '海报标题为必填项' }, { status: 400 });
  }

  if (!style) {
    return NextResponse.json({ error: '请选择海报风格' }, { status: 400 });
  }

  if (!size || !size.width || !size.height) {
    return NextResponse.json({ error: '请选择图片尺寸' }, { status: 400 });
  }

  const selectedModel = POSTER_MODELS[modelId];
  if (!selectedModel && modelId !== 'mock') {
    return NextResponse.json({ error: `不支持的模型: ${modelId}` }, { status: 400 });
  }

  const provider = selectedModel?.provider || 'mock';
  const resolvedApiKey = apiKey || process.env.AI_API_KEY;
  const resolvedBaseUrl = baseUrl || process.env.AI_BASE_URL;

  if (provider !== 'mock' && !resolvedApiKey) {
    return NextResponse.json({
      error: `${provider === 'siliconflow' ? '硅基流动' : 'OpenAI'} API Key 未配置。请在环境变量中设置 AI_API_KEY，或在设置中配置您的 API Key。`,
      code: 'API_KEY_MISSING',
      provider,
    }, { status: 400 });
  }

  try {
    const generator = new PosterGenerator({
      provider: provider as any,
      apiKey: resolvedApiKey,
      baseUrl: resolvedBaseUrl,
      model: selectedModel?.id === 'flux-schnell' ? 'black-forest-labs/FLUX.1-schnell' :
             selectedModel?.id === 'flux-dev' ? 'black-forest-labs/FLUX.1-dev' :
             selectedModel?.id === 'sd3-large' ? 'stabilityai/stable-diffusion-3-5-large' :
             selectedModel?.id === 'dall-e-3' ? 'dall-e-3' :
             undefined,
    });

    const result = await generator.generate({
      title: title.trim(),
      subtitle: subtitle?.trim() || undefined,
      brandName: brandName?.trim() || undefined,
      style,
      palette: palette || ['#667eea', '#764ba2', '#5a72d8'],
      size,
      storyContent: storyContent?.trim() || undefined,
      additionalContext: additionalContext?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      poster: {
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        prompt: result.prompt,
        revisedPrompt: result.revisedPrompt,
        provider: result.provider,
        model: result.model,
        duration: result.duration,
        size: result.size,
        metadata: result.metadata,
      },
    });
  } catch (error: any) {
    console.error('[Posters API] 海报生成失败:', error);
    return NextResponse.json({
      error: error.message || '海报生成失败',
      code: 'GENERATION_FAILED',
    }, { status: 500 });
  }
}
