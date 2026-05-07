import { WorkflowEngine } from './WorkflowEngine';
import { PromptTemplate } from './PromptTemplate';
import { ContentGenerator, StreamCallback } from './ContentGenerator';
import { QualityValidator } from './QualityValidator';

export interface SSEEvent {
  type: 'stage_start' | 'stage_progress' | 'stage_complete' | 'stage_error' | 'stream_chunk' | 'done' | 'error';
  stage?: string;
  stageName?: string;
  stageIndex?: number;
  totalStages?: number;
  progress?: number;
  chunk?: string;
  result?: any;
  error?: string;
}

export type SSECallback = (event: SSEEvent) => void;

export interface BrandStoryInput {
  productInfo: {
    name: string;
    description: string;
    features?: string[];
    category?: string;
    competitors?: string;
  };
  brandPositioning?: {
    tone?: string;
    values?: string[];
    channels?: string[];
  };
  targetAudience?: {
    description?: string;
    demographics?: any;
    psychographics?: any;
  };
  options?: {
    provider?: string;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    defaultTone?: string;
  };
}

export class BrandStoryAgent {
  private workflow: WorkflowEngine;
  private promptTemplate: PromptTemplate;
  private contentGenerator: ContentGenerator;
  private validator: QualityValidator;
  private config: any;

  constructor(configOverrides: any = {}) {
    this.config = {
      maxRetries: 3,
      defaultTone: 'warm_professional',
      outputFormat: 'markdown',
      ...configOverrides
    };

    this.workflow = new WorkflowEngine();
    this.promptTemplate = new PromptTemplate();
    this.contentGenerator = new ContentGenerator({
      provider: configOverrides?.provider || 'mock',
      apiKey: configOverrides?.apiKey,
      baseUrl: configOverrides?.baseUrl,
      model: configOverrides?.model,
    });
    this.validator = new QualityValidator();

    this._initializeWorkflow();
  }

  private _initializeWorkflow() {
    this.workflow
      .addStage('productAnalysis', {
        name: '产品价值分析',
        description: '深入分析产品功能特性，提炼核心价值主张',
        handler: this._analyzeProduct.bind(this),
      })
      .addStage('userInsight', {
        name: '用户需求洞察',
        description: '识别目标用户群体特征，分析需求痛点',
        handler: this._analyzeUser.bind(this),
      })
      .addStage('sceneDesign', {
        name: '场景构建设计',
        description: '设计真实可信的产品使用场景',
        handler: this._designScenes.bind(this),
      })
      .addStage('storyCreation', {
        name: '故事叙事创作',
        description: '创作完整的品牌推广故事内容',
        handler: this._createStory.bind(this),
      })
      .addStage('contentOptimization', {
        name: '内容优化完善',
        description: '润色优化，确保符合品牌调性',
        handler: this._optimizeContent.bind(this),
      });
  }

  async createBrandStory(input: BrandStoryInput) {
    const { productInfo, brandPositioning, targetAudience, options = {} } = input;

    const context = {
      productInfo,
      brandPositioning: brandPositioning || { tone: this.config.defaultTone, values: [], channels: ['微信公众号', '小红书'] },
      targetAudience: targetAudience || { description: '追求品质生活的都市白领', demographics: {}, psychographics: {} },
      options: { ...this.config, ...options }
    };

    const result = await this.workflow.execute(context);
    return this._buildOutput(result);
  }

  async quickCreate(productName: string, productDesc: string, targetUser: string, productFeatures: string[] = []) {
    return this.createBrandStory({
      productInfo: { name: productName, description: productDesc, features: productFeatures },
      brandPositioning: { tone: 'warm_professional', values: [], channels: ['微信公众号', '小红书'] },
      targetAudience: { description: targetUser, demographics: {}, psychographics: {} }
    });
  }

  async createBrandStoryStream(input: BrandStoryInput, onEvent: SSECallback) {
    const { productInfo, brandPositioning, targetAudience, options = {} } = input;

    const context = {
      productInfo,
      brandPositioning: brandPositioning || { tone: this.config.defaultTone, values: [], channels: ['微信公众号', '小红书'] },
      targetAudience: targetAudience || { description: '追求品质生活的都市白领', demographics: {}, psychographics: {} },
      options: { ...this.config, ...options }
    };

    const stageNames = ['productAnalysis', 'userInsight', 'sceneDesign', 'storyCreation', 'contentOptimization'];
    const stageDisplayNames: Record<string, string> = {
      productAnalysis: '产品价值分析',
      userInsight: '用户需求洞察',
      sceneDesign: '场景构建设计',
      storyCreation: '故事叙事创作',
      contentOptimization: '内容优化完善',
    };

    const stageResults: Record<string, any> = {};
    const totalStages = stageNames.length;

    for (let i = 0; i < stageNames.length; i++) {
      const stageName = stageNames[i];
      const handler = this._getStageHandler(stageName);

      onEvent({
        type: 'stage_start',
        stage: stageName,
        stageName: stageDisplayNames[stageName],
        stageIndex: i,
        totalStages,
        progress: Math.round((i / totalStages) * 100),
      });

      try {
        const streamCallback: StreamCallback = (chunk, done) => {
          if (chunk) {
            onEvent({
              type: 'stream_chunk',
              stage: stageName,
              chunk,
              progress: Math.round(((i + 0.5) / totalStages) * 100),
            });
          }
        };

        const result = await this.contentGenerator.generateStream(
          this._buildPrompt(stageName, context, stageResults),
          this._getStageOptions(stageName),
          streamCallback,
        );

        stageResults[stageName] = result;
        Object.assign(context, result);

        onEvent({
          type: 'stage_complete',
          stage: stageName,
          stageName: stageDisplayNames[stageName],
          stageIndex: i,
          totalStages,
          progress: Math.round(((i + 1) / totalStages) * 100),
          result: { keys: Object.keys(result || {}) },
        });
      } catch (error: any) {
        onEvent({
          type: 'stage_error',
          stage: stageName,
          stageName: stageDisplayNames[stageName],
          error: error.message,
        });
        throw error;
      }
    }

    const finalResult = this._buildOutputFromStages(context, stageResults);
    onEvent({ type: 'done', result: finalResult });
    return finalResult;
  }

  private _getStageHandler(stageName: string): string {
    const map: Record<string, string> = {
      productAnalysis: '_analyzeProduct',
      userInsight: '_analyzeUser',
      sceneDesign: '_designScenes',
      storyCreation: '_createStory',
      contentOptimization: '_optimizeContent',
    };
    return map[stageName] || stageName;
  }

  private _buildPrompt(stageName: string, context: any, stageResults: Record<string, any>): any {
    const { productInfo, brandPositioning, targetAudience } = context;

    switch (stageName) {
      case 'productAnalysis':
        return this.promptTemplate.render('productAnalysis', {
          productName: productInfo.name,
          productDescription: productInfo.description,
          productFeatures: productInfo.features,
          productCategory: productInfo.category,
          competitiveLandscape: productInfo.competitors,
        });

      case 'userInsight':
        return this.promptTemplate.render('userInsight', {
          targetAudience: targetAudience.description,
          demographics: targetAudience.demographics,
          psychographics: targetAudience.psychographics,
          valueProposition: stageResults.productAnalysis?.valueProposition,
        });

      case 'sceneDesign':
        return this.promptTemplate.render('sceneDesign', {
          userPersona: stageResults.userInsight?.persona,
          keyFeatures: stageResults.productAnalysis?.keyFeatures,
          painPoints: stageResults.userInsight?.painPoints,
          sceneCount: 2,
        });

      case 'storyCreation':
        return this.promptTemplate.render('storyCreation', {
          scenarios: stageResults.sceneDesign?.scenarios,
          valueProposition: stageResults.productAnalysis?.valueProposition,
          brandTone: brandPositioning?.tone || 'warm_professional',
          brandValues: brandPositioning?.values,
          storyLength: '800-1200字',
        });

      case 'contentOptimization': {
        const rawContent = stageResults.storyCreation?.content || '';
        return this.promptTemplate.render('contentOptimization', {
          content: rawContent,
          brandTone: brandPositioning?.tone || 'warm_professional',
        });
      }

      default:
        return '';
    }
  }

  private _getStageOptions(stageName: string): any {
    const options: Record<string, any> = {
      productAnalysis: { temperature: 0.3, maxTokens: 1500 },
      userInsight: { temperature: 0.4, maxTokens: 1500 },
      sceneDesign: { temperature: 0.6, maxTokens: 2000 },
      storyCreation: { temperature: 0.7, maxTokens: 3000 },
      contentOptimization: { temperature: 0.5, maxTokens: 3000 },
    };
    return options[stageName] || {};
  }

  private _buildOutputFromStages(context: any, stageResults: Record<string, any>) {
    const optimized = stageResults.contentOptimization || {};
    const storyContent = stageResults.storyCreation?.content || '';
    const finalContent = optimized.content || storyContent;
    const validation = this.validator.validate(finalContent);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '4.0.0',
        workflowStages: 5,
        provider: this.contentGenerator.getConfig().provider,
        model: this.contentGenerator.getConfig().model,
        isMock: this.contentGenerator.getConfig().provider === 'mock',
      },
      productValue: {
        coreValue: stageResults.productAnalysis?.valueProposition?.core || '',
        extended: stageResults.productAnalysis?.valueProposition?.extended || '',
        differentiation: stageResults.productAnalysis?.differentiation || {},
        keyFeatures: stageResults.productAnalysis?.keyFeatures || [],
        coreBenefits: stageResults.productAnalysis?.coreBenefits || {},
      },
      userProfile: {
        persona: stageResults.userInsight?.persona || {},
        painPoints: stageResults.userInsight?.painPoints || [],
        emotionalNeeds: stageResults.userInsight?.emotionalNeeds || [],
        motivationTriggers: stageResults.userInsight?.motivationTriggers || [],
      },
      scenarios: stageResults.sceneDesign?.scenarios || [],
      brandStory: {
        content: finalContent,
        wordCount: finalContent.length,
        emotionalResonance: stageResults.storyCreation?.emotionalResonance || {},
        narrativeArc: stageResults.storyCreation?.narrativeArc || {},
        keyMessages: optimized.keyMessages || stageResults.storyCreation?.keyMessages || [],
        callToAction: stageResults.storyCreation?.callToAction || {},
      },
      quality: validation || { passed: true },
      contentScore: this.validator.scoreContent(finalContent, { brandTone: context.brandPositioning?.tone }),
      stats: this.contentGenerator.getStats(),
    };
  }

  private async _analyzeProduct(context: any) {
    const { productInfo } = context;
    const prompt = this.promptTemplate.render('productAnalysis', {
      productName: productInfo.name,
      productDescription: productInfo.description,
      productFeatures: productInfo.features,
      productCategory: productInfo.category,
      competitiveLandscape: productInfo.competitors
    });

    return await this.contentGenerator.generate(prompt, { temperature: 0.3, maxTokens: 1500 });
  }

  private async _analyzeUser(context: any) {
    const { targetAudience, valueProposition } = context;
    const prompt = this.promptTemplate.render('userInsight', {
      targetAudience: targetAudience.description,
      demographics: targetAudience.demographics,
      psychographics: targetAudience.psychographics,
      valueProposition: valueProposition
    });

    return await this.contentGenerator.generate(prompt, { temperature: 0.4, maxTokens: 1500 });
  }

  private async _designScenes(context: any) {
    const { userPersona, keyFeatures, painPoints } = context;
    const prompt = this.promptTemplate.render('sceneDesign', {
      userPersona, keyFeatures, painPoints, sceneCount: 2
    });

    return await this.contentGenerator.generate(prompt, { temperature: 0.6, maxTokens: 2000 });
  }

  private async _createStory(context: any) {
    const { scenarios, valueProposition, brandPositioning } = context;
    const prompt = this.promptTemplate.render('storyCreation', {
      scenarios, valueProposition,
      brandTone: brandPositioning?.tone || 'warm_professional',
      brandValues: brandPositioning?.values,
      storyLength: '800-1200字'
    });

    return await this.contentGenerator.generate(prompt, { temperature: 0.7, maxTokens: 3000 });
  }

  private async _optimizeContent(context: any) {
    const { storyContent, content, brandPositioning } = context;
    const rawContent = content || storyContent || '';
    const prompt = this.promptTemplate.render('contentOptimization', {
      content: rawContent,
      brandTone: brandPositioning?.tone || 'warm_professional'
    });

    const optimized = await this.contentGenerator.generate(prompt, { temperature: 0.5, maxTokens: 3000 });
    const validation = this.validator.validate(optimized.content || rawContent);

    return {
      finalContent: optimized.content || rawContent,
      distributionSuggestions: optimized.suggestions || [],
      keyMessages: optimized.keyMessages || [],
      emotionalTriggers: optimized.emotionalTriggers || [],
      validation
    };
  }

  private _buildOutput(result: any) {
    const finalContent = result.finalContent || result.storyContent || result.content || '';
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '3.0.0',
        workflowStages: 5,
        duration: result.metadata?.duration,
        provider: this.contentGenerator.getConfig().provider,
        model: this.contentGenerator.getConfig().model,
        isMock: this.contentGenerator.getConfig().provider === 'mock',
      },
      productValue: {
        coreValue: result.valueProposition?.core || '',
        extended: result.valueProposition?.extended || '',
        differentiation: result.differentiation || {},
        keyFeatures: result.keyFeatures || [],
        coreBenefits: result.coreBenefits || {}
      },
      userProfile: {
        persona: result.persona || {},
        painPoints: result.painPoints || [],
        emotionalNeeds: result.emotionalNeeds || [],
        motivationTriggers: result.motivationTriggers || []
      },
      scenarios: result.scenarios || [],
      brandStory: {
        content: finalContent,
        wordCount: finalContent.length,
        emotionalResonance: result.emotionalResonance || {},
        narrativeArc: result.narrativeArc || {},
        keyMessages: result.keyMessages || [],
        callToAction: result.callToAction || {}
      },
      quality: result.validation || { passed: true },
      contentScore: this.validator.scoreContent(finalContent, { brandTone: result.brandPositioning?.tone }),
      stats: this.contentGenerator.getStats()
    };
  }
}

export class BrandStoryError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'BrandStoryError';
  }
}
