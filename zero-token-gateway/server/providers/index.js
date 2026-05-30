import { DeepSeekWebProvider } from './deepseek.js';
import { ClaudeWebProvider } from './claude.js';
import { ChatGPTWebProvider } from './chatgpt.js';
import { GeminiWebProvider } from './gemini.js';
import { QwenWebProvider } from './qwen.js';
import { KimiWebProvider } from './kimi.js';
import { DoubaoWebProvider } from './doubao.js';
import { GrokWebProvider } from './grok.js';
import { GLMWebProvider } from './glm.js';
import { XiaomiWebProvider } from './xiaomi.js';

export class ProviderRegistry {
  constructor() {
    this.providers = {};
    this._registerDefaults();
  }

  _registerDefaults() {
    this.register('deepseek-web', new DeepSeekWebProvider());
    this.register('claude-web', new ClaudeWebProvider());
    this.register('chatgpt-web', new ChatGPTWebProvider());
    this.register('gemini-web', new GeminiWebProvider());
    this.register('qwen-web', new QwenWebProvider('intl'));
    this.register('qwen-cn-web', new QwenWebProvider('cn'));
    this.register('kimi-web', new KimiWebProvider());
    this.register('doubao-web', new DoubaoWebProvider());
    this.register('grok-web', new GrokWebProvider());
    this.register('glm-web', new GLMWebProvider('cn'));
    this.register('glm-intl-web', new GLMWebProvider('intl'));
    this.register('xiaomi-web', new XiaomiWebProvider());
  }

  register(name, provider) {
    this.providers[name] = provider;
  }

  get(name) {
    return this.providers[name] || null;
  }

  list() {
    return Object.entries(this.providers).map(([name, p]) => ({
      id: name,
      name: p.displayName,
      models: p.models,
      status: p.status,
      authConfig: p.authConfig
    }));
  }

  listModels() {
    const models = [];
    for (const [providerId, p] of Object.entries(this.providers)) {
      for (const model of p.models) {
        models.push({
          id: `${providerId}/${model.id}`,
          provider: providerId,
          name: model.name,
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
          reasoning: model.reasoning || false
        });
      }
    }
    return models;
  }

  resolveModel(modelId) {
    const slashIdx = modelId.indexOf('/');
    if (slashIdx === -1) {
      for (const [pid, p] of Object.entries(this.providers)) {
        if (p.models.some(m => m.id === modelId)) {
          return { providerId: pid, modelId, provider: p };
        }
      }
      return null;
    }
    const providerId = modelId.slice(0, slashIdx);
    const mid = modelId.slice(slashIdx + 1);
    const provider = this.providers[providerId];
    if (!provider) return null;
    return { providerId, modelId: mid, provider };
  }
}
