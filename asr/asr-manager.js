/**
 * ASR Engine Manager
 * Manages three ASR engines with automatic fallback:
 * 1. Sherpa-ONNX WebAssembly (default, local)
 * 2. FunASR WebSocket (server-based)
 * 3. Web Speech API (browser native)
 */

class ASRManager {
    constructor(config = {}) {
        this.engines = {
            SHERPA: 'sherpa',
            FUNASR: 'funasr', 
            WEBSPEECH: 'webspeech'
        };
        
        this.fallbackOrder = [this.engines.SHERPA, this.engines.FUNASR, this.engines.WEBSPEECH];
        this.currentEngine = null;
        this.currentEngineIndex = 0;
        this.isInitialized = false;
        this.isRecording = false;
        
        // Callbacks
        this.onResult = config.onResult || ((text, metadata) => console.log('ASR Result:', text, metadata));
        this.onError = config.onError || ((error) => console.error('ASR Error:', error));
        this.onEngineChange = config.onEngineChange || ((engine) => console.log('Engine changed to:', engine));
        this.onStatusChange = config.onStatusChange || ((status) => console.log('Status:', status));
        
        // Engine instances
        this.sherpaEngine = null;
        this.funasrEngine = null;
        this.webspeechEngine = null;
        
        this.init();
    }
    
    async init() {
        this.updateStatus('Initializing ASR engines...');
        await this.initEngines();
        this.isInitialized = true;
        this.updateStatus('ASR engines ready');
    }
    
    async initEngines() {
        // Initialize engines in order of preference with individual error handling
        console.log('Initializing ASR engines...');
        
        // Initialize Sherpa engine
        try {
            console.log('Initializing Sherpa-ONNX engine...');
            await this.initSherpaEngine();
            console.log('Sherpa-ONNX engine initialized successfully');
        } catch (error) {
            console.warn('Sherpa engine initialization failed:', error);
            this.sherpaEngine = null;
        }
        
        // Initialize FunASR engine
        try {
            console.log('Initializing FunASR engine...');
            await this.initFunASREngine();
            console.log('FunASR engine initialized successfully');
        } catch (error) {
            console.warn('FunASR engine initialization failed:', error);
            this.funasrEngine = null;
        }
        
        // Initialize Web Speech API engine
        try {
            console.log('Initializing Web Speech API engine...');
            await this.initWebSpeechEngine();
            console.log('Web Speech API engine initialized successfully');
        } catch (error) {
            console.warn('Web Speech API initialization failed:', error);
            this.webspeechEngine = null;
        }
        
        // Set the first available engine as current
        this.setFirstAvailableEngine();
    }
    
    async initSherpaEngine() {
        // Prevent recreation if engine already exists and is available
        if (this.sherpaEngine && this.sherpaEngine.isAvailable && this.sherpaEngine.isAvailable()) {
            console.log('✅ Sherpa engine already exists and is available, skipping recreation');
            return;
        }
        
        console.log('🔄 Creating new Sherpa engine...');
        console.trace('📍 initSherpaEngine call stack:');
        
        try {
            this.sherpaEngine = new SherpaASREngine({
                onResult: this.onResult,
                onError: (error) => this.handleEngineError(this.engines.SHERPA, error),
                onStatusChange: this.onStatusChange
            });
            await this.sherpaEngine.init();
        } catch (error) {
            console.warn('Full Sherpa engine failed, using fallback:', error);
            // Use fallback engine if main engine fails
            if (typeof SherpaFallbackEngine !== 'undefined') {
                this.sherpaEngine = new SherpaFallbackEngine({
                    onResult: this.onResult,
                    onError: (error) => this.handleEngineError(this.engines.SHERPA, error),
                    onStatusChange: this.onStatusChange
                });
                await this.sherpaEngine.init();
            } else {
                throw error;
            }
        }
    }
    
    async initFunASREngine() {
        this.funasrEngine = new FunASREngine({
            onResult: this.onResult,
            onError: (error) => this.handleEngineError(this.engines.FUNASR, error),
            onStatusChange: this.onStatusChange
        });
        await this.funasrEngine.init();
    }
    
    async initWebSpeechEngine() {
        this.webspeechEngine = new WebSpeechEngine({
            onResult: this.onResult,
            onError: (error) => this.handleEngineError(this.engines.WEBSPEECH, error),
            onStatusChange: this.onStatusChange
        });
        await this.webspeechEngine.init();
    }
    
    setFirstAvailableEngine() {
        for (const engine of this.fallbackOrder) {
            if (this.isEngineAvailable(engine)) {
                this.switchEngine(engine);
                break;
            }
        }
        
        if (!this.currentEngine) {
            throw new Error('No ASR engines available');
        }
    }
    
    isEngineAvailable(engine) {
        switch (engine) {
            case this.engines.SHERPA:
                return this.sherpaEngine && this.sherpaEngine.isAvailable();
            case this.engines.FUNASR:
                return this.funasrEngine && this.funasrEngine.isAvailable();
            case this.engines.WEBSPEECH:
                return this.webspeechEngine && this.webspeechEngine.isAvailable();
            default:
                return false;
        }
    }
    
    switchEngine(engine) {
        if (!this.isEngineAvailable(engine)) {
            throw new Error(`Engine ${engine} is not available`);
        }
        
        // Stop current engine if recording
        if (this.isRecording && this.currentEngine) {
            this.getCurrentEngineInstance().stop();
        }
        
        this.currentEngine = engine;
        this.currentEngineIndex = this.fallbackOrder.indexOf(engine);
        this.onEngineChange(engine);
        this.updateStatus(`Switched to ${engine} engine`);
    }
    
    getCurrentEngineInstance() {
        switch (this.currentEngine) {
            case this.engines.SHERPA:
                return this.sherpaEngine;
            case this.engines.FUNASR:
                return this.funasrEngine;
            case this.engines.WEBSPEECH:
                return this.webspeechEngine;
            default:
                throw new Error('No current engine available');
        }
    }
    
    async startRecording() {
        if (!this.isInitialized) {
            throw new Error('ASR Manager not initialized');
        }
        
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }
        
        if (!this.currentEngine) {
            throw new Error('No engine available for recording');
        }
        
        try {
            await this.getCurrentEngineInstance().start();
            this.isRecording = true;
            this.updateStatus(`Recording with ${this.currentEngine} engine`);
        } catch (error) {
            console.error(`Failed to start recording with ${this.currentEngine}:`, error);
            await this.tryFallback(error);
        }
    }
    
    async stopRecording() {
        console.log(`🛑 ASRManager stopRecording called, isRecording: ${this.isRecording}, currentEngine: ${this.currentEngine}`);
        
        if (!this.isRecording) {
            console.log('📝 ASR Manager is not recording, skipping stop');
            return;
        }
        
        try {
            const engineInstance = this.getCurrentEngineInstance();
            console.log(`🔧 Stopping engine instance: ${engineInstance?.constructor?.name || 'unknown'}`);
            
            await engineInstance.stop();
            this.isRecording = false;
            console.log(`✅ ASR Manager recording stopped successfully`);
            this.updateStatus('Recording stopped');
        } catch (error) {
            console.error('Error stopping recording:', error);
            this.isRecording = false;
            console.log(`❌ ASR Manager recording stopped due to error`);
        }
    }
    
    async handleEngineError(engineName, error) {
        console.error(`Engine ${engineName} error:`, error);
        console.log(`🔍 Error context: currentEngine=${this.currentEngine}, engineName=${engineName}, isRecording=${this.isRecording}`);
        
        if (this.currentEngine === engineName && this.isRecording) {
            console.log(`🔄 Attempting fallback for engine ${engineName}...`);
            await this.tryFallback(error);
        } else {
            console.log(`📢 Reporting error for engine ${engineName} (not triggering fallback)`);
            this.onError(error);
        }
    }
    
    async tryFallback(originalError) {
        this.updateStatus('Engine failed, trying fallback...');
        
        // Find next available engine
        let nextEngineIndex = this.currentEngineIndex + 1;
        let fallbackFound = false;
        
        while (nextEngineIndex < this.fallbackOrder.length) {
            const nextEngine = this.fallbackOrder[nextEngineIndex];
            if (this.isEngineAvailable(nextEngine)) {
                try {
                    await this.switchEngine(nextEngine);
                    await this.getCurrentEngineInstance().start();
                    fallbackFound = true;
                    this.updateStatus(`Fallback successful: switched to ${nextEngine}`);
                    break;
                } catch (error) {
                    console.error(`Fallback to ${nextEngine} failed:`, error);
                    nextEngineIndex++;
                }
            } else {
                nextEngineIndex++;
            }
        }
        
        if (!fallbackFound) {
            this.isRecording = false;
            this.currentEngine = null;
            this.onError(new Error('All ASR engines failed. Original error: ' + originalError.message));
            this.updateStatus('All engines failed');
        }
    }
    
    updateStatus(status) {
        this.onStatusChange(status);
    }
    
    getAvailableEngines() {
        return this.fallbackOrder.filter(engine => this.isEngineAvailable(engine));
    }
    
    getCurrentEngine() {
        return this.currentEngine;
    }
    
    async manualSwitchEngine(engine) {
        if (!this.isEngineAvailable(engine)) {
            throw new Error(`Engine ${engine} is not available`);
        }
        
        const wasRecording = this.isRecording;
        
        if (this.isRecording) {
            await this.stopRecording();
        }
        
        this.switchEngine(engine);
        
        if (wasRecording) {
            await this.startRecording();
        }
    }
    
    destroy() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.sherpaEngine) {
            this.sherpaEngine.destroy();
        }
        if (this.funasrEngine) {
            this.funasrEngine.destroy();
        }
        if (this.webspeechEngine) {
            this.webspeechEngine.destroy();
        }
        
        this.isInitialized = false;
        this.currentEngine = null;
    }
} 