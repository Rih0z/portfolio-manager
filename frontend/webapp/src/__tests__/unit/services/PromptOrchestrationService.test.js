/**
 * プロジェクト: https://portfolio-wise.com/
 * ファイルパス: src/__tests__/unit/services/PromptOrchestrationService.test.js
 * 
 * 作成者: Claude Code
 * 作成日: 2025-01-03
 * 
 * 説明:
 * PromptOrchestrationServiceのユニットテスト
 */

import promptOrchestrationService from '../../../services/PromptOrchestrationService';

// localStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('PromptOrchestrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    promptOrchestrationService.reset();
  });

  describe('loadUserContext', () => {
    it('should load default user context when no stored data exists', () => {
      const context = promptOrchestrationService.loadUserContext();
      
      expect(context).toHaveProperty('age', null);
      expect(context).toHaveProperty('occupation', '');
      expect(context).toHaveProperty('primaryGoal', '');
      expect(context).toHaveProperty('motivationLevel', 5);
      expect(context).toHaveProperty('anxietyLevel', 5);
      expect(context).toHaveProperty('sessionCount', 0);
    });

    it('should load stored user context when data exists', () => {
      const storedContext = {
        age: 35,
        occupation: 'Engineer',
        primaryGoal: 'Retirement planning',
        motivationLevel: 8,
        anxietyLevel: 3
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedContext));
      
      const context = promptOrchestrationService.loadUserContext();
      
      expect(context.age).toBe(35);
      expect(context.occupation).toBe('Engineer');
      expect(context.primaryGoal).toBe('Retirement planning');
    });
  });

  describe('updateUserContext', () => {
    it('should update user context and save to localStorage', () => {
      const updates = {
        age: 30,
        occupation: 'Developer',
        primaryGoal: 'Financial freedom'
      };
      
      promptOrchestrationService.updateUserContext(updates);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userContext',
        expect.stringContaining('"age":30')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'userContext',
        expect.stringContaining('"occupation":"Developer"')
      );
    });

    it('should increment totalInteractions when updating', () => {
      promptOrchestrationService.updateUserContext({ age: 25 });
      promptOrchestrationService.updateUserContext({ age: 26 });
      
      expect(promptOrchestrationService.userContext.totalInteractions).toBe(2);
    });

    it('should update lastUpdate timestamp', () => {
      const beforeUpdate = new Date().toISOString();
      promptOrchestrationService.updateUserContext({ age: 25 });
      const afterUpdate = new Date().toISOString();
      
      expect(promptOrchestrationService.userContext.lastUpdate).toBeTruthy();
      expect(promptOrchestrationService.userContext.lastUpdate >= beforeUpdate).toBe(true);
      expect(promptOrchestrationService.userContext.lastUpdate <= afterUpdate).toBe(true);
    });
  });

  describe('startSession', () => {
    it('should start a new session with default type', () => {
      promptOrchestrationService.startSession();
      
      expect(promptOrchestrationService.userContext.sessionCount).toBe(1);
      expect(promptOrchestrationService.userContext.currentSession).toHaveProperty('type', 'general');
      expect(promptOrchestrationService.userContext.currentSession).toHaveProperty('startTime');
      expect(promptOrchestrationService.userContext.currentSession).toHaveProperty('prompts', []);
    });

    it('should start a new session with custom type', () => {
      promptOrchestrationService.startSession('portfolio_analysis');
      
      expect(promptOrchestrationService.userContext.currentSession.type).toBe('portfolio_analysis');
    });
  });

  describe('analyzeEmotionalContext', () => {
    it('should analyze emotional context based on anxiety and motivation levels', () => {
      promptOrchestrationService.updateUserContext({
        anxietyLevel: 8,
        motivationLevel: 3
      });
      
      const emotional = promptOrchestrationService.analyzeEmotionalContext();
      
      expect(emotional.needsSupport).toBe(true);
      expect(emotional.confidence).toBeLessThan(5);
    });

    it('should indicate no support needed for low anxiety', () => {
      promptOrchestrationService.updateUserContext({
        anxietyLevel: 3,
        motivationLevel: 7
      });
      
      const emotional = promptOrchestrationService.analyzeEmotionalContext();
      
      expect(emotional.needsSupport).toBe(false);
      expect(emotional.urgency).toBeGreaterThan(5);
      expect(emotional.optimism).toBeGreaterThan(5);
    });

    it('should boost confidence based on recent successes', () => {
      const recentSuccess = {
        outcome: 'positive',
        date: new Date().toISOString() // Recent success
      };
      
      promptOrchestrationService.updateUserContext({
        previousResults: [recentSuccess],
        anxietyLevel: 5,
        motivationLevel: 5
      });
      
      const emotional = promptOrchestrationService.analyzeEmotionalContext();
      
      expect(emotional.confidence).toBeGreaterThan(5);
    });
  });

  describe('generatePersonalizedPrompt', () => {
    it('should generate personalized prompt with user context', () => {
      promptOrchestrationService.updateUserContext({
        age: 35,
        occupation: 'Engineer',
        primaryGoal: 'Early retirement',
        targetMarkets: ['US', 'JAPAN'],
        monthlyBudget: 50000
      });
      
      const prompt = promptOrchestrationService.generatePersonalizedPrompt('portfolio_analysis');
      
      expect(prompt).toHaveProperty('title');
      expect(prompt).toHaveProperty('content');
      expect(prompt).toHaveProperty('metadata');
      expect(prompt.content).toContain('35歳');
      expect(prompt.content).toContain('Engineer');
      expect(prompt.content).toContain('Early retirement');
    });

    it('should include market preferences in prompt', () => {
      promptOrchestrationService.updateUserContext({
        age: 30,
        targetMarkets: ['US', 'CRYPTO'],
        monthlyBudget: 30000
      });
      
      const prompt = promptOrchestrationService.generatePersonalizedPrompt('portfolio_analysis');
      
      expect(prompt.content).toContain('米国市場');
      expect(prompt.content).toContain('仮想通貨');
      expect(prompt.content).toContain('30,000円');
    });
  });

  describe('generateDataImportPrompt', () => {
    it('should generate screenshot portfolio analysis prompt in Japanese', () => {
      const prompt = promptOrchestrationService.generateDataImportPrompt('screenshot_portfolio');
      
      expect(prompt).toHaveProperty('title');
      expect(prompt).toHaveProperty('content');
      expect(prompt).toHaveProperty('type', 'screenshot_portfolio');
      expect(prompt).toHaveProperty('language', 'ja');
      expect(prompt.content).toContain('ポートフォリオ');
      expect(prompt.content).toContain('JSON形式');
    });

    it('should generate market data analysis prompt', () => {
      const prompt = promptOrchestrationService.generateDataImportPrompt('market_data_screenshot');
      
      expect(prompt.type).toBe('market_data_screenshot');
      expect(prompt.content).toContain('株価');
      expect(prompt.content).toContain('市場データ');
    });

    it('should include user instructions when provided', () => {
      const userInstructions = '特定の銘柄のみ抽出してください';
      const prompt = promptOrchestrationService.generateDataImportPrompt(
        'screenshot_portfolio',
        userInstructions
      );
      
      expect(prompt.content).toContain(userInstructions);
    });
  });

  describe('recordPrompt', () => {
    it('should record prompt in history', () => {
      const testPrompt = {
        title: 'Test Prompt',
        content: 'Test content',
        metadata: { type: 'test' }
      };
      
      const promptId = promptOrchestrationService.recordPrompt(testPrompt);
      
      expect(promptId).toBeTruthy();
      expect(promptOrchestrationService.promptHistory).toHaveLength(1);
      expect(promptOrchestrationService.promptHistory[0]).toHaveProperty('id', promptId);
      expect(promptOrchestrationService.promptHistory[0]).toHaveProperty('prompt', testPrompt);
    });

    it('should limit history to 100 entries', () => {
      // Add 101 prompts
      for (let i = 0; i < 101; i++) {
        promptOrchestrationService.recordPrompt({
          title: `Prompt ${i}`,
          content: `Content ${i}`
        });
      }
      
      expect(promptOrchestrationService.promptHistory).toHaveLength(100);
      expect(promptOrchestrationService.promptHistory[0].prompt.title).toBe('Prompt 100');
    });

    it('should save prompt history to localStorage', () => {
      const testPrompt = { title: 'Test', content: 'Content' };
      promptOrchestrationService.recordPrompt(testPrompt);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'promptHistory',
        expect.stringContaining('"title":"Test"')
      );
    });
  });

  describe('learnFromResponse', () => {
    it('should learn from positive feedback', () => {
      const promptId = promptOrchestrationService.recordPrompt({
        title: 'Test Prompt',
        content: 'Test content'
      });
      
      const aiResponse = { aiProvider: 'claude' };
      const userFeedback = { 
        rating: 5, 
        successFactors: ['clear', 'detailed'] 
      };
      
      promptOrchestrationService.learnFromResponse(promptId, aiResponse, userFeedback);
      
      expect(promptOrchestrationService.userContext.successPatterns).toHaveLength(1);
      expect(promptOrchestrationService.userContext.successPatterns[0]).toHaveProperty('aiUsed', 'claude');
    });

    it('should not add success pattern for low ratings', () => {
      const promptId = promptOrchestrationService.recordPrompt({
        title: 'Test Prompt',
        content: 'Test content'
      });
      
      const aiResponse = { aiProvider: 'claude' };
      const userFeedback = { rating: 2 };
      
      promptOrchestrationService.learnFromResponse(promptId, aiResponse, userFeedback);
      
      expect(promptOrchestrationService.userContext.successPatterns).toHaveLength(0);
    });
  });

  describe('exportUserProfile', () => {
    it('should export user profile with correct structure', () => {
      promptOrchestrationService.updateUserContext({
        age: 30,
        occupation: 'Developer'
      });
      
      const profile = promptOrchestrationService.exportUserProfile();
      
      expect(profile).toHaveProperty('userContext');
      expect(profile).toHaveProperty('aiPreferences');
      expect(profile).toHaveProperty('successPatterns');
      expect(profile).toHaveProperty('timestamp');
      expect(profile).toHaveProperty('version', '1.0');
      expect(profile.userContext.age).toBe(30);
    });
  });

  describe('importUserProfile', () => {
    it('should import valid user profile', () => {
      const profileData = {
        version: '1.0',
        userContext: {
          age: 40,
          occupation: 'Manager'
        },
        aiPreferences: {
          preferredAI: 'gemini'
        }
      };
      
      const result = promptOrchestrationService.importUserProfile(profileData);
      
      expect(result).toBe(true);
      expect(promptOrchestrationService.userContext.age).toBe(40);
      expect(promptOrchestrationService.userContext.occupation).toBe('Manager');
    });

    it('should reject invalid version', () => {
      const profileData = {
        version: '2.0',
        userContext: { age: 40 }
      };
      
      const result = promptOrchestrationService.importUserProfile(profileData);
      
      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all stored data', () => {
      // Set some data first
      promptOrchestrationService.updateUserContext({ age: 30 });
      promptOrchestrationService.recordPrompt({ title: 'Test' });
      
      promptOrchestrationService.reset();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userContext');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('promptHistory');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('aiPreferences');
    });
  });

  describe('AI preference language handling', () => {
    it('should generate English prompt when language is set to English', () => {
      // Mock English AI preferences
      promptOrchestrationService.aiPreferences.languagePreference = 'en';
      
      promptOrchestrationService.updateUserContext({
        age: 25,
        occupation: 'Student',
        primaryGoal: 'Build wealth'
      });
      
      const prompt = promptOrchestrationService.generatePersonalizedPrompt('portfolio_analysis');
      
      expect(prompt.content).toContain('I am a 25-year-old Student');
      expect(prompt.content).toContain('Build wealth');
    });
  });
});