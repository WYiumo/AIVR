/**
 * Sherpa-ONNX Fallback Engine
 * A simplified version that can be used when the full WebAssembly engine fails
 */

class SherpaFallbackEngine {
    constructor(config = {}) {
        this.onResult = config.onResult || (() => {});
        this.onError = config.onError || (() => {});
        this.onStatusChange = config.onStatusChange || (() => {});
        
        this.isAvailableFlag = false;
        this.isRecording = false;
    }
    
    async init() {
        try {
            this.onStatusChange('Sherpa-ONNX WebAssembly not available, engine disabled');
            
            // This fallback engine is not available - it's just a placeholder
            this.isAvailableFlag = false;
            
            console.log('Sherpa fallback engine initialized (not available)');
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    async start() {
        throw new Error('Sherpa-ONNX WebAssembly not available');
    }
    
    async stop() {
        // Nothing to stop
    }
    
    isAvailable() {
        return false; // Fallback engine is never available
    }
    
    destroy() {
        this.isAvailableFlag = false;
    }
} 