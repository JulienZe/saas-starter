export interface PosterGeneratorConfig {
  provider: 'siliconflow' | 'openai' | 'mock';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface PosterInput {
  title: string;
  subtitle?: string;
  brandName?: string;
  style: 'minimal' | 'story' | 'brand' | 'elegant' | 'bold';
  palette: string[];
  size: { width: number; height: number; name: string };
  storyContent?: string;
  additionalContext?: string;
}

export interface PosterOutput {
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

export interface PosterGenerationLog {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  input: PosterInput;
  prompt: string;
  duration: number;
  success: boolean;
  error?: string;
  outputSize?: number;
  qualityScore?: number;
}

const STYLE_PROMPTS: Record<string, string> = {
  minimal: 'minimalist design, clean layout, generous white space, elegant typography, subtle gradient background, modern brand poster, professional',
  story: 'narrative storytelling poster, immersive visual composition, cinematic atmosphere, text integrated with imagery, emotional depth, editorial design',
  brand: 'bold brand identity poster, prominent logo placement, strong visual hierarchy, corporate branding, memorable tagline display, impactful design',
  elegant: 'luxury elegant poster, refined color palette, sophisticated typography, premium feel, art deco influences, high-end brand aesthetic',
  bold: 'bold vibrant poster, striking color contrast, dynamic composition, eye-catching design, modern pop art influence, energetic visual impact',
};

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '3:4': { width: 896, height: 1152 },
  '4:3': { width: 1152, height: 896 },
};

const MODEL_DEFAULTS: Record<string, { model: string; baseUrl: string }> = {
  siliconflow: {
    model: 'black-forest-labs/FLUX.1-schnell',
    baseUrl: 'https://api.siliconflow.cn/v1',
  },
  openai: {
    model: 'dall-e-3',
    baseUrl: 'https://api.openai.com',
  },
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 60000;

export class PosterGenerator {
  private config: PosterGeneratorConfig;
  private logs: PosterGenerationLog[] = [];
  private maxLogSize = 100;

  constructor(config: PosterGeneratorConfig) {
    this.config = config;
  }

  async generate(input: PosterInput): Promise<PosterOutput> {
    const startTime = Date.now();
    const prompt = this._buildPrompt(input);
    const inputHash = this._hashInput(input);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this._generateWithTimeout(prompt, input);

        const output: PosterOutput = {
          imageUrl: result.url,
          imageBase64: result.base64,
          prompt,
          revisedPrompt: result.revisedPrompt,
          provider: this.config.provider,
          model: this.config.model || MODEL_DEFAULTS[this.config.provider]?.model || 'unknown',
          duration: Date.now() - startTime,
          size: input.size,
          metadata: {
            generatedAt: new Date().toISOString(),
            inputHash,
            qualityScore: result.qualityScore,
          },
        };

        this._log({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          provider: this.config.provider,
          model: output.model,
          input,
          prompt,
          duration: output.duration,
          success: true,
          outputSize: result.base64 ? result.base64.length : undefined,
          qualityScore: result.qualityScore,
        });

        return output;
      } catch (error: any) {
        lastError = error;

        this._log({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          provider: this.config.provider,
          model: this.config.model || MODEL_DEFAULTS[this.config.provider]?.model || 'unknown',
          input,
          prompt,
          duration: Date.now() - startTime,
          success: false,
          error: error.message,
        });

        if (attempt < MAX_RETRIES && this._isRetryable(error)) {
          await this._delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        break;
      }
    }

    throw new Error(`海报生成失败（已重试${MAX_RETRIES}次）: ${lastError?.message || '未知错误'}`);
  }

  getLogs(): PosterGenerationLog[] {
    return [...this.logs];
  }

  private async _generateWithTimeout(prompt: string, input: PosterInput): Promise<{ url: string; base64?: string; revisedPrompt?: string; qualityScore?: number }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      switch (this.config.provider) {
        case 'siliconflow':
          return await this._generateWithSiliconFlow(prompt, input, controller.signal);
        case 'openai':
          return await this._generateWithOpenAI(prompt, input, controller.signal);
        case 'mock':
        default:
          return await this._generateWithMock(prompt, input);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private async _generateWithSiliconFlow(prompt: string, input: PosterInput, signal: AbortSignal): Promise<{ url: string; base64?: string; revisedPrompt?: string; qualityScore?: number }> {
    const apiKey = this.config.apiKey;
    if (!apiKey) throw new Error('硅基流动 API Key 未配置');

    const baseUrl = this.config.baseUrl || MODEL_DEFAULTS.siliconflow.baseUrl;
    const model = this.config.model || MODEL_DEFAULTS.siliconflow.model;

    const closestSize = this._findClosestSize(input.size.width, input.size.height);

    const body: any = {
      model,
      prompt,
      negative_prompt: 'blurry, low quality, distorted text, watermark, ugly, deformed, noisy, oversaturated, cropped, worst quality, low resolution',
      image_size: closestSize,
      num_inference_steps: 20,
      guidance_scale: 7.5,
    };

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || errorData?.message || response.statusText;
      throw new Error(`硅基流动图片生成错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();

    const imageUrl = data.images?.[0]?.url || data.data?.[0]?.url || data.output?.url || '';
    const imageBase64 = data.images?.[0]?.content || data.data?.[0]?.b64_json || undefined;

    if (!imageUrl && !imageBase64) {
      throw new Error('硅基流动返回结果中未找到图片数据');
    }

    return {
      url: imageUrl,
      base64: imageBase64,
      qualityScore: this._estimateQuality(imageUrl || imageBase64 || ''),
    };
  }

  private async _generateWithOpenAI(prompt: string, input: PosterInput, signal: AbortSignal): Promise<{ url: string; base64?: string; revisedPrompt?: string; qualityScore?: number }> {
    const apiKey = this.config.apiKey;
    if (!apiKey) throw new Error('OpenAI API Key 未配置');

    const baseUrl = this.config.baseUrl || MODEL_DEFAULTS.openai.baseUrl;
    const model = this.config.model || MODEL_DEFAULTS.openai.model;

    const sizeOption = this._getOpenAISize(input.size);

    const body: any = {
      model,
      prompt,
      n: 1,
      size: sizeOption,
      quality: 'standard',
      response_format: 'b64_json',
    };

    const response = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`OpenAI 图片生成错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0];

    if (!imageData) {
      throw new Error('OpenAI 返回结果中未找到图片数据');
    }

    return {
      url: imageData.url || '',
      base64: imageData.b64_json,
      revisedPrompt: imageData.revised_prompt,
      qualityScore: this._estimateQuality(imageData.b64_json || imageData.url || ''),
    };
  }

  private async _generateWithMock(prompt: string, input: PosterInput): Promise<{ url: string; base64: string; qualityScore: number }> {
    await this._delay(1500 + Math.random() * 1000);

    const canvas = this._generateMockCanvas(input);
    const base64 = canvas.split(',')[1];

    return {
      url: canvas,
      base64,
      qualityScore: 0.85,
    };
  }

  private _generateMockCanvas(input: PosterInput): string {
    const { width, height } = input.size;
    const scale = Math.min(1, 800 / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const palette = input.palette.length >= 3 ? input.palette : ['#667eea', '#764ba2', '#5a72d8'];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${palette[0]};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${palette[1] || palette[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${palette[2] || palette[1] || palette[0]};stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bg)"/>
      <circle cx="${w * 0.8}" cy="${h * 0.2}" r="${w * 0.15}" fill="rgba(255,255,255,0.05)"/>
      <circle cx="${w * 0.15}" cy="${h * 0.75}" r="${w * 0.2}" fill="rgba(255,255,255,0.04)"/>
      <circle cx="${w * 0.6}" cy="${h * 0.6}" r="${w * 0.1}" fill="rgba(255,255,255,0.03)"/>
      <rect x="${w * 0.08}" y="${h * 0.35}" width="${w * 0.06}" height="2" fill="rgba(255,255,255,0.4)"/>
      <text x="${w * 0.08}" y="${h * 0.45}" font-family="system-ui,sans-serif" font-size="${Math.max(16, w * 0.06)}" font-weight="bold" fill="white" filter="url(#glow)">${this._escapeXml(input.title)}</text>
      <text x="${w * 0.08}" y="${h * 0.55}" font-family="system-ui,sans-serif" font-size="${Math.max(10, w * 0.028)}" fill="rgba(255,255,255,0.75)">${this._escapeXml(input.subtitle || '')}</text>
      ${input.brandName ? `<text x="${w * 0.08}" y="${h * 0.9}" font-family="system-ui,sans-serif" font-size="${Math.max(9, w * 0.022)}" fill="rgba(255,255,255,0.5)" letter-spacing="3">${this._escapeXml(input.brandName).toUpperCase()}</text>` : ''}
      <text x="${w - w * 0.08}" y="${h * 0.9}" font-family="system-ui,sans-serif" font-size="${Math.max(8, w * 0.018)}" fill="rgba(255,255,255,0.3)" text-anchor="end">AI Generated</text>
    </svg>`;

    if (typeof Buffer !== 'undefined') {
      const base64 = Buffer.from(svg).toString('base64');
      return `data:image/svg+xml;base64,${base64}`;
    }

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  private _buildPrompt(input: PosterInput): string {
    const styleDesc = STYLE_PROMPTS[input.style] || STYLE_PROMPTS.minimal;
    const paletteDesc = input.palette.slice(0, 3).join(', ');

    const parts = [
      `Create a professional brand poster with the following specifications:`,
      ``,
      `Title/Headline: "${input.title}"`,
      input.subtitle ? `Subtitle: "${input.subtitle}"` : '',
      input.brandName ? `Brand: "${input.brandName}"` : '',
      ``,
      `Visual Style: ${styleDesc}`,
      `Color Palette: ${paletteDesc}`,
      `Dimensions: ${input.size.width}x${input.size.height} (${input.size.name})`,
      ``,
      `Design Requirements:`,
      `- The poster must feature the title "${input.title}" prominently`,
      `- Use the specified color palette as the primary color scheme`,
      `- Ensure text is legible and well-positioned`,
      `- Create a visually cohesive and professional design`,
      `- Include subtle decorative elements that enhance the brand message`,
      `- The overall composition should feel premium and polished`,
    ];

    if (input.storyContent) {
      const snippet = input.storyContent.replace(/[#*_\n]/g, ' ').trim().slice(0, 200);
      parts.push(``, `Brand Story Context (for visual inspiration):`, `"${snippet}..."`);
    }

    if (input.additionalContext) {
      parts.push(``, `Additional Context: ${input.additionalContext}`);
    }

    return parts.filter(Boolean).join('\n');
  }

  private _findClosestSize(width: number, height: number): string {
    const ratio = width / height;
    let closest = '1:1';
    let minDiff = Infinity;

    for (const [key, size] of Object.entries(SIZE_MAP)) {
      const diff = Math.abs(ratio - size.width / size.height);
      if (diff < minDiff) {
        minDiff = diff;
        closest = key;
      }
    }

    return closest;
  }

  private _getOpenAISize(size: { width: number; height: number }): string {
    const ratio = size.width / size.height;
    if (ratio > 1.5) return '1792x1024';
    if (ratio < 0.7) return '1024x1792';
    return '1024x1024';
  }

  private _estimateQuality(data: string): number {
    let score = 0.5;

    if (data.length > 1000) score += 0.1;
    if (data.length > 10000) score += 0.1;
    if (data.length > 50000) score += 0.1;
    if (data.startsWith('http')) score += 0.05;
    if (data.startsWith('data:image')) score += 0.05;

    return Math.min(1, score);
  }

  private _isRetryable(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('rate limit') ||
      msg.includes('429') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('server error') ||
      msg.includes('overloaded') ||
      msg.includes('capacity')
    );
  }

  private _hashInput(input: PosterInput): string {
    const raw = `${input.title}|${input.subtitle}|${input.brandName}|${input.style}|${input.palette.join(',')}|${input.size.width}x${input.size.height}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private _escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  private _log(entry: PosterGenerationLog): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    if (entry.success) {
      console.log(`[PosterGenerator] ✓ ${entry.provider}/${entry.model} - ${entry.duration}ms - quality: ${entry.qualityScore || 'N/A'}`);
    } else {
      console.error(`[PosterGenerator] ✗ ${entry.provider}/${entry.model} - ${entry.duration}ms - error: ${entry.error}`);
    }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const POSTER_MODELS: Record<string, { id: string; name: string; provider: string; description: string }> = {
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'FLUX.1 Schnell',
    provider: 'siliconflow',
    description: '快速生成，适合迭代设计',
  },
  'flux-dev': {
    id: 'flux-dev',
    name: 'FLUX.1 Dev',
    provider: 'siliconflow',
    description: '高质量生成，细节丰富',
  },
  'sd3-large': {
    id: 'sd3-large',
    name: 'Stable Diffusion 3.5',
    provider: 'siliconflow',
    description: '专业级画质，色彩精准',
  },
  'dall-e-3': {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    provider: 'openai',
    description: 'OpenAI 旗舰图片模型',
  },
};

export const POSTER_STYLES: { id: PosterInput['style']; name: string; desc: string }[] = [
  { id: 'minimal', name: '极简风格', desc: '大量留白，突出核心信息' },
  { id: 'story', name: '故事叙事', desc: '图文结合，沉浸式阅读' },
  { id: 'brand', name: '品牌展示', desc: 'Logo+标语，强化品牌记忆' },
  { id: 'elegant', name: '优雅质感', desc: '精致配色，高端品牌调性' },
  { id: 'bold', name: '大胆醒目', desc: '强烈对比，视觉冲击力' },
];
