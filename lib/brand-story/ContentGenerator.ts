export interface ContentGeneratorConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface GenerationResult {
  success: boolean;
  data?: any;
  error?: string;
  provider: string;
  model: string;
  duration: number;
  tokensUsed?: { input: number; output: number };
}

export type StreamCallback = (chunk: string, done: boolean) => void;

export class ContentGenerator {
  private config: ContentGeneratorConfig;
  private generationHistory: GenerationResult[] = [];

  constructor(config: ContentGeneratorConfig = { provider: 'mock' }) {
    this.config = { model: 'gpt-4', ...config };
  }

  async generate(prompt: any, options: any = {}): Promise<any> {
    const startTime = Date.now();

    try {
      let result: any;
      switch (this.config.provider) {
        case 'openai':
          result = await this._generateWithOpenAI(prompt, options);
          break;
        case 'claude':
          result = await this._generateWithClaude(prompt, options);
          break;
        case 'deepseek':
          result = await this._generateWithDeepSeek(prompt, options);
          break;
        case 'siliconflow':
          result = await this._generateWithSiliconFlow(prompt, options);
          break;
        case 'ollama':
          result = await this._generateWithOllama(prompt, options);
          break;
        case 'mock':
        default:
          result = await this._generateWithMock(prompt, options);
          break;
      }

      this.generationHistory.push({
        success: true,
        provider: this.config.provider,
        model: this.config.model || 'unknown',
        duration: Date.now() - startTime,
        data: result,
      });

      return result;
    } catch (error: any) {
      this.generationHistory.push({
        success: false,
        provider: this.config.provider,
        model: this.config.model || 'unknown',
        duration: Date.now() - startTime,
        error: error.message,
      });
      throw error;
    }
  }

  async generateStream(prompt: any, options: any = {}, onChunk?: StreamCallback): Promise<any> {
    const startTime = Date.now();
    const provider = this.config.provider;

    try {
      let result: any;
      const isStreamable = ['openai', 'deepseek', 'siliconflow', 'ollama', 'claude'].includes(provider);

      if (isStreamable && onChunk) {
        result = await this._generateStreamWithProvider(prompt, options, onChunk);
      } else if (provider === 'mock' && onChunk) {
        result = await this._generateStreamWithMock(prompt, options, onChunk);
      } else {
        result = await this.generate(prompt, options);
        if (onChunk) {
          const text = typeof result === 'object' ? JSON.stringify(result) : String(result);
          onChunk(text, true);
        }
        return result;
      }

      this.generationHistory.push({
        success: true,
        provider: this.config.provider,
        model: this.config.model || 'unknown',
        duration: Date.now() - startTime,
        data: result,
      });

      return result;
    } catch (error: any) {
      this.generationHistory.push({
        success: false,
        provider: this.config.provider,
        model: this.config.model || 'unknown',
        duration: Date.now() - startTime,
        error: error.message,
      });
      throw error;
    }
  }

  private async _generateStreamWithProvider(prompt: any, options: any, onChunk: StreamCallback): Promise<any> {
    const provider = this.config.provider;
    const systemPrompt = typeof prompt === 'object' ? prompt.system : '';
    const userPrompt = typeof prompt === 'object' ? prompt.user : prompt;

    if (provider === 'claude') {
      return this._streamClaude(systemPrompt, userPrompt, options, onChunk);
    }

    if (provider === 'ollama') {
      return this._streamOllama(systemPrompt, userPrompt, options, onChunk);
    }

    const baseUrls: Record<string, string> = {
      openai: 'https://api.openai.com',
      deepseek: 'https://api.deepseek.com',
      siliconflow: 'https://api.siliconflow.cn/v1',
    };

    const defaultModels: Record<string, string> = {
      openai: 'gpt-4',
      deepseek: 'deepseek-chat',
      siliconflow: 'Qwen/Qwen2.5-7B-Instruct',
    };

    const url = `${this.config.baseUrl || baseUrls[provider]}/v1/chat/completions`;
    const body: any = {
      model: options.model || this.config.model || defaultModels[provider],
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: true,
    };

    if (provider !== 'siliconflow') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`${provider} API 错误 (${response.status}): ${errorData?.error?.message || response.statusText}`);
    }

    return this._parseOpenAIStream(response, onChunk);
  }

  private async _parseOpenAIStream(response: Response, onChunk: StreamCallback): Promise<any> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法获取响应流');

    const decoder = new TextDecoder();
    let fullContent = '';
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
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            onChunk(delta, false);
          }
        } catch {}
      }
    }

    onChunk('', true);

    try {
      return JSON.parse(fullContent);
    } catch {
      return { content: fullContent };
    }
  }

  private async _streamClaude(systemPrompt: string, userPrompt: string, options: any, onChunk: StreamCallback): Promise<any> {
    const response = await fetch(`${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey!,
        'anthropic-version': '2024-10-22',
      },
      body: JSON.stringify({
        model: options.model || this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API 错误 (${response.status}): ${errorData?.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法获取响应流');

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            fullContent += parsed.delta.text;
            onChunk(parsed.delta.text, false);
          }
        } catch {}
      }
    }

    onChunk('', true);

    try {
      return JSON.parse(fullContent);
    } catch {
      return { content: fullContent };
    }
  }

  private async _streamOllama(systemPrompt: string, userPrompt: string, options: any, onChunk: StreamCallback): Promise<any> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${userPrompt}` : userPrompt;

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.config.model || 'qwen2.5:7b',
        prompt: fullPrompt,
        stream: true,
        options: { temperature: options.temperature || 0.7, num_predict: options.maxTokens || 2000 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API 错误 (${response.status})`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法获取响应流');

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullContent += parsed.response;
            onChunk(parsed.response, false);
          }
        } catch {}
      }
    }

    onChunk('', true);

    try {
      return JSON.parse(fullContent);
    } catch {
      return { content: fullContent };
    }
  }

  private async _generateStreamWithMock(prompt: any, options: any, onChunk: StreamCallback): Promise<any> {
    const result = await this._generateWithMock(prompt, options);
    const text = typeof result === 'object' ? JSON.stringify(result) : String(result);

    const chunkSize = 8;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      onChunk(chunk, false);
      await this._delay(30 + Math.random() * 50);
    }

    onChunk('', true);
    return result;
  }

  private async _generateWithMock(prompt: any, options: any): Promise<any> {
    await this._delay(500 + Math.random() * 1000);
    const promptText = typeof prompt === 'object' ? prompt.user : prompt;

    if (promptText.includes('产品名称:')) {
      return this._mockProductAnalysis(promptText);
    } else if (promptText.includes('请创作一篇品牌推广软文') || promptText.includes('创作品牌故事')) {
      return this._mockStoryCreation(promptText);
    } else if (promptText.includes('设计') && promptText.includes('场景')) {
      return this._mockSceneDesign(promptText);
    } else if (promptText.includes('目标用户')) {
      return this._mockUserInsight(promptText);
    } else if (promptText.includes('优化') && promptText.includes('品牌故事')) {
      return this._mockContentOptimization(promptText);
    }
    return { content: '这是一个模拟的品牌故事内容。' };
  }

  private _mockProductAnalysis(promptText: string) {
    const productName = promptText.match(/产品名称:\s*(.+?)(?:\n|$)/)?.[1] || '智能创作工具';
    return {
      valueProposition: {
        core: `让${productName}触手可及`,
        extended: `为用户提供AI驱动的智能工具，大幅提升创作效率与作品质量`,
        benefits: ['效率提升', '专业呈现', '多平台发布']
      },
      differentiation: {
        uniquePoints: ['AI智能排版', '一键多平台发布', '云端素材库'],
        competitiveAdvantage: '专注用户痛点，提供完整的创作到发布闭环',
        marketPosition: '面向独立创作者的轻量级智能创作工具'
      },
      keyFeatures: [
        { feature: 'AI智能排版', benefit: '自动生成专业排版方案', scenario: '内容创作完成后一键美化' },
        { feature: '多平台发布', benefit: '一次创作，多平台分发', scenario: '内容创作完成后同步发布' },
        { feature: '实时协作', benefit: '多人实时协同编辑', scenario: '团队协作完成大型项目' }
      ],
      coreBenefits: {
        functional: ['提升创作效率', '降低技术门槛'],
        emotional: ['减轻创作焦虑', '增强专业自信'],
        social: ['提升个人品牌形象']
      }
    };
  }

  private _mockUserInsight(promptText: string) {
    return {
      persona: { name: '小林', archetype: '追求成长的创作者', description: '28岁，自由撰稿人，在一二线城市生活，热爱创作，重视个人品牌建设。', quote: '好的内容值得被好好呈现' },
      painPoints: [{ pain: '工具复杂难上手', intensity: '高', frequency: '经常' }, { pain: '排版耗时费力', intensity: '高', frequency: '经常' }],
      emotionalNeeds: [{ need: '被理解和认同', manifestation: '作品获得认可', priority: '高' }, { need: '成长与进步', manifestation: '技能提升', priority: '高' }],
      motivationTriggers: [{ trigger: 'deadline压力', context: '紧急任务', action: '寻找高效工具' }],
      behaviorPatterns: { informationGathering: '社交媒体', decisionFactors: '用户评价、功能匹配度', usageContext: '深夜创作、咖啡馆工作' }
    };
  }

  private _mockSceneDesign(promptText: string) {
    return {
      scenarios: [
        {
          title: '深夜的救星',
          setting: { time: '深夜十一点', place: '家中书房', atmosphere: '窗外雨声淅沥，台灯昏黄' },
          character: { name: '小林', state: '疲惫但焦虑', desire: '尽快完成排版任务' },
          plot: { setup: '客户临时要求明天一早看到排版精美的方案', conflict: '小林不擅长排版，以往都要花一整天', climax: '打开工具，AI自动完成排版和设计', resolution: '半小时完成原本需要一天的工作', aftermath: '小林终于能安心睡个好觉' },
          sensoryDetails: ['键盘敲击声在雨夜中格外清晰', '屏幕蓝光映在小林疲惫的脸上'],
          emotionalArc: ['焦虑', '惊喜', '释然', '自信'],
          productRole: '在关键时刻提供能力加成'
        },
        {
          title: '咖啡馆里的灵感时刻',
          setting: { time: '周日下午', place: '街角咖啡馆', atmosphere: '阳光透过玻璃窗，爵士乐轻柔' },
          character: { name: '小林', state: '放松但期待', desire: '抓住突发的创作灵感' },
          plot: { setup: '在咖啡馆突然想到一个绝妙的选题', conflict: '没带电脑，只有手机和平板', climax: '打开移动端APP，完整功能一应俱全', resolution: '在咖啡馆完成从构思到成稿的全过程', aftermath: '小林感受到前所未有的创作自由' },
          sensoryDetails: ['咖啡豆研磨的沙沙声', '阳光在桌面上移动的光影'],
          emotionalArc: ['兴奋', '担忧', '惊喜', '满足'],
          productRole: '打破设备限制，让灵感随时落地'
        }
      ],
      emotionalConnections: [{ emotion: '被理解的温暖', trigger: '工具懂创作者的痛点', resonance: '减少孤独感' }],
      sensoryDetails: { visual: ['深夜的屏幕蓝光', '咖啡馆的阳光'], auditory: ['雨声', '爵士乐'] }
    };
  }

  private _mockStoryCreation(promptText: string) {
    return {
      content: `# 一个人的创作，也可以很专业\n\n深夜十一点，雨声敲打着窗户。\n\n小林盯着电脑屏幕，手指悬在键盘上方。客户的消息还亮在手机上："明天早上能把排版好的方案发我吗？"\n\n她叹了口气。内容早就写好了，但排版...那是她的软肋。\n\n---\n\n**每一个创作者，都有过这样的时刻。**\n\n明明有满脑子的好想法，却被技术门槛拦在门外。明明付出了同样的努力，作品却因为呈现方式不被认可。\n\n这不是能力的问题，是工具的问题。\n\n---\n\n小林打开了一个新的工具。\n\n导入文档，点击"智能排版"。然后她愣住了。\n\n原本需要一整天的工作，在三十秒内完成了。不是那种模板的生硬堆砌，而是像有一位资深设计师在帮她调整。\n\n---\n\n**好的工具，不是让你变成另一个人。而是让你成为更好的自己。**\n\n---\n\n三个月后，小林在咖啡馆里打开了同一个工具。阳光很好，她刚刚想到一个绝妙的选题。\n\n现在的她，已经签下了三个长期客户，有了自己的小团队。\n\n工具没有改变她是谁。但它让她终于能被看见。\n\n---\n\n**每一个认真创作的人，都值得被认真对待。让专业，触手可及。**`,
      emotionalResonance: { primary: '被理解的温暖与专业认同', secondary: '从焦虑到自信的转变', intensity: '高' },
      narrativeArc: { hook: '深夜截稿的焦虑场景', setup: '创作者的技术困境', risingAction: '尝试新工具的犹豫与惊喜', climax: '三十秒完成一天工作的转折', fallingAction: '三个月后的成长变化', resolution: '专业触手可及的信念升华' },
      keyMessages: ['工具不应成为创作的门槛', '专业呈现是每个创作者的权利', '好的工具让你成为更好的自己'],
      callToAction: { text: '欢迎加入我们，和十万创作者一起', type: '软', urgency: '低' }
    };
  }

  private _mockContentOptimization(promptText: string) {
    return {
      content: `# ✨ 一个人的创作，也可以很专业\n\n深夜十一点，雨声敲打着窗户。\n\n小林盯着电脑屏幕，手指悬在键盘上方。客户的消息还亮在手机上："明天早上能把排版好的方案发我吗？"\n\n她叹了口气。内容早就写好了，但排版...那是她的软肋。\n\n---\n\n**每一个创作者，都有过这样的时刻。**\n\n明明有满脑子的好想法，却被技术门槛拦在门外。这不是能力的问题，是工具的问题。\n\n---\n\n小林打开了一个新的工具。导入文档，点击"智能排版"。\n\n原本需要一整天的工作，在三十秒内完成了。\n\n---\n\n**好的工具，不是让你变成另一个人。而是让你成为更好的自己。**\n\n---\n\n三个月后，小林在咖啡馆里打开了同一个工具。她已经签下了三个长期客户。\n\n工具没有改变她是谁。但它让她终于能被看见。\n\n---\n\n**每一个认真创作的人，都值得被认真对待。让专业，触手可及。**`,
      keyMessages: ['专业触手可及', '工具服务于创作'],
      goldenSentences: ['好的工具，不是让你变成另一个人，而是让你成为更好的自己。', '每一个认真创作的人，都值得被认真对待。']
    };
  }

  private async _generateWithOpenAI(prompt: any, options: any): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API Key 未配置。请在环境变量中设置 AI_API_KEY。');
    }

    const systemPrompt = typeof prompt === 'object' ? prompt.system : '';
    const userPrompt = typeof prompt === 'object' ? prompt.user : prompt;

    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: options.model || this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`OpenAI API 错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    try { return JSON.parse(content); } catch { return { content }; }
  }

  private async _generateWithClaude(prompt: any, options: any): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('Claude API Key 未配置。请在环境变量中设置 AI_API_KEY。');
    }

    const systemPrompt = typeof prompt === 'object' ? prompt.system : '';
    const userPrompt = typeof prompt === 'object' ? prompt.user : prompt;

    const response = await fetch(`${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
        'anthropic-version': '2024-10-22',
      },
      body: JSON.stringify({
        model: options.model || this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`Claude API 错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    try { return JSON.parse(content); } catch { return { content }; }
  }

  private async _generateWithDeepSeek(prompt: any, options: any): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('DeepSeek API Key 未配置。请在环境变量中设置 AI_API_KEY。');
    }

    const systemPrompt = typeof prompt === 'object' ? prompt.system : '';
    const userPrompt = typeof prompt === 'object' ? prompt.user : prompt;

    const response = await fetch(`${this.config.baseUrl || 'https://api.deepseek.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: options.model || this.config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`DeepSeek API 错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    try { return JSON.parse(content); } catch { return { content }; }
  }

  private async _generateWithSiliconFlow(prompt: any, options: any): Promise<any> {
    if (!this.config.apiKey) {
      throw new Error('硅基流动 API Key 未配置。请在环境变量中设置 AI_API_KEY。');
    }

    const systemPrompt = typeof prompt === 'object' ? prompt.system : '';
    const userPrompt = typeof prompt === 'object' ? prompt.user : prompt;

    const response = await fetch(`${this.config.baseUrl || 'https://api.siliconflow.cn/v1'}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({
        model: options.model || this.config.model || 'Qwen/Qwen2.5-7B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || errorData?.message || response.statusText;
      throw new Error(`硅基流动 API 错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    try { return JSON.parse(content); } catch { return { content }; }
  }

  private async _generateWithOllama(prompt: any, options: any): Promise<any> {
    const systemPrompt = typeof prompt === 'object' ? prompt.system : '';
    const userPrompt = typeof prompt === 'object' ? prompt.user : prompt;
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${userPrompt}` : userPrompt;

    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    try {
      const healthCheck = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (!healthCheck.ok) {
        throw new Error('Ollama 服务不可用，请确认 Ollama 已启动。');
      }
    } catch (e: any) {
      throw new Error(`Ollama 连接失败: ${e.message}。请确认 Ollama 已启动且运行在 ${baseUrl}。`);
    }

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model || this.config.model || 'qwen2.5:7b',
        prompt: fullPrompt,
        stream: false,
        options: { temperature: options.temperature || 0.7, num_predict: options.maxTokens || 2000 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Ollama API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.response || '';
    try { return JSON.parse(content); } catch { return { content }; }
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      totalGenerations: this.generationHistory.length,
      successRate: this.generationHistory.length > 0
        ? this.generationHistory.filter(h => h.success).length / this.generationHistory.length
        : 0,
      provider: this.config.provider,
      model: this.config.model,
      lastError: this.generationHistory.filter(h => !h.success).slice(-1)[0]?.error || null,
    };
  }

  getConfig() {
    return {
      provider: this.config.provider,
      model: this.config.model,
      hasApiKey: !!this.config.apiKey,
      baseUrl: this.config.baseUrl || 'default',
    };
  }
}
