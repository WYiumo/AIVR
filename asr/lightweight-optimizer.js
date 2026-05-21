/**
 * Lightweight ASR Optimization Helper
 * Implements best practices for lightweight ASR design
 */

class LightweightOptimizer {
    constructor(config = {}) {
        this.config = {
            // Memory management
            maxBufferSize: 30 * 16000, // 30 seconds of 16kHz audio
            chunkSize: 960, // Optimal chunk size for real-time processing
            gcInterval: 30000, // Garbage collection interval in ms
            
            // Performance optimization
            audioWorkletSupported: false, // Will be set after initialization
            preferredSampleRate: 16000,
            maxConcurrentEngines: 2,
            
            // Network optimization
            connectionTimeout: 5000,
            reconnectDelay: 1000,
            maxReconnectAttempts: 3,
            
            // Resource thresholds - Increased for large WASM models
            maxMemoryUsage: 200 * 1024 * 1024, // 200MB to accommodate Sherpa-ONNX model
            cpuUsageThreshold: 80,
            networkLatencyThreshold: 500,
            
            ...config
        };
        
        this.metrics = {
            memoryUsage: 0,
            cpuUsage: 0,
            networkLatency: 0,
            bufferSizes: new Map(),
            engineStates: new Map()
        };
        
        this.bufferRegistry = new Map();
        this.isOptimizing = false;
        this.memoryMonitoringPaused = false; // Add pause mechanism
        
        this.init();
    }
    
    init() {
        this.initPerformanceMonitoring();
        
        // Set AudioWorklet support after methods are available
        this.config.audioWorkletSupported = this.checkAudioWorkletSupported();
        
        // Start periodic garbage collection
        this.startGarbageCollection();
    }
    
    checkAudioWorkletSupported() {
        try {
            // Create a dummy AudioContext and check for audioWorklet property
            const ctx = window.AudioContext ? new window.AudioContext() : (window.webkitAudioContext ? new window.webkitAudioContext() : null);
            if (!ctx) return false;
            const supported = typeof window.AudioWorkletNode !== 'undefined' && !!ctx.audioWorklet;
            ctx.close && ctx.close();
            return supported;
        } catch (e) {
            return false;
        }
    }
    
    initPerformanceMonitoring() {
        // Memory monitoring
        if (performance.memory) {
            this.startMemoryMonitoring();
        }
        
        // Performance observer for timing
        if (typeof PerformanceObserver !== 'undefined') {
            this.initPerformanceObserver();
        }
        
        // Start periodic garbage collection
        this.startGarbageCollection();
    }
    
    startMemoryMonitoring() {
        setInterval(() => {
            // Skip monitoring if paused (e.g., during WASM loading)
            if (this.memoryMonitoringPaused) {
                return;
            }
            
            if (performance.memory) {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
                
                // Trigger cleanup if memory usage is high
                if (this.metrics.memoryUsage > this.config.maxMemoryUsage) {
                    this.triggerMemoryCleanup();
                }
            }
        }, 15000); // Reduced frequency: check every 15 seconds instead of 5
    }
    
    pauseMemoryMonitoring(duration = 60000) {
        console.log('🔇 Pausing memory monitoring for intensive operation...');
        this.memoryMonitoringPaused = true;
        
        // Auto-resume after specified duration
        setTimeout(() => {
            this.resumeMemoryMonitoring();
        }, duration);
    }
    
    resumeMemoryMonitoring() {
        console.log('🔊 Resuming memory monitoring...');
        this.memoryMonitoringPaused = false;
    }
    
    initPerformanceObserver() {
        try {
            this.performanceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    if (entry.entryType === 'measure') {
                        // Monitor audio processing timing
                        if (entry.name.includes('audio-processing')) {
                            this.checkAudioPerformance(entry.duration);
                        }
                    }
                }
            });
            
            this.performanceObserver.observe({
                entryTypes: ['measure', 'navigation', 'resource']
            });
        } catch (error) {
            console.warn('Performance Observer not supported:', error);
        }
    }
    
    startGarbageCollection() {
        this.gcTimer = setInterval(() => {
            this.performGarbageCollection();
        }, this.config.gcInterval);
    }
    
    performGarbageCollection() {
        // Force garbage collection if available
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        // Clear any expired caches or buffers
        this.clearExpiredBuffers();
    }
    
    clearExpiredBuffers() {
        // This would be implemented by ASR engines to clear their buffers
        console.log('Performing buffer cleanup');
    }
    
    triggerMemoryCleanup() {
        console.warn('High memory usage detected, triggering cleanup');
        
        // Notify ASR engines to reduce memory usage
        this.performGarbageCollection();
        
        // Could trigger engine restart if memory is still high
        setTimeout(() => {
            if (performance.memory && 
                performance.memory.usedJSHeapSize > this.config.maxMemoryUsage) {
                console.warn('Memory usage still high after cleanup');
            }
        }, 1000);
    }
    
    checkAudioPerformance(duration) {
        // Check if audio processing is taking too long
        const maxProcessingTime = (this.config.chunkSize / this.config.preferredSampleRate) * 1000 * 0.8; // 80% of chunk duration
        
        if (duration > maxProcessingTime) {
            this.metrics.audioDropouts++;
            console.warn(`Audio processing taking ${duration}ms, expected <${maxProcessingTime}ms`);
        }
    }
    
    optimizeAudioContext(audioCtx) {
        // Set optimal buffer sizes and sample rates
        try {
            if (audioCtx.baseLatency !== undefined) {
                console.log(`Audio context base latency: ${audioCtx.baseLatency * 1000}ms`);
            }
            
            if (audioCtx.outputLatency !== undefined) {
                console.log(`Audio context output latency: ${audioCtx.outputLatency * 1000}ms`);
            }
            
            // Prefer lower latency if available
            if (audioCtx.sampleRate !== this.config.preferredSampleRate) {
                console.log(`Audio context sample rate: ${audioCtx.sampleRate}Hz (preferred: ${this.config.preferredSampleRate}Hz)`);
            }
            
        } catch (error) {
            console.warn('Error optimizing audio context:', error);
        }
    }
    
    createOptimalProcessor(audioCtx, processingFunction) {
        let processor;
        
        if (this.config.audioWorkletSupported) {
            // Use AudioWorklet for better performance (when available)
            try {
                processor = this.createAudioWorkletProcessor(audioCtx, processingFunction);
            } catch (error) {
                console.warn('AudioWorklet creation failed, falling back to ScriptProcessor:', error);
                processor = this.createScriptProcessor(audioCtx, processingFunction);
            }
        } else {
            // Fall back to ScriptProcessor
            processor = this.createScriptProcessor(audioCtx, processingFunction);
        }
        
        return processor;
    }
    
    createAudioWorkletProcessor(audioCtx, processingFunction) {
        // This would require loading an AudioWorklet module
        // For now, fall back to ScriptProcessor
        return this.createScriptProcessor(audioCtx, processingFunction);
    }
    
    createScriptProcessor(audioCtx, processingFunction) {
        const bufferSize = this.getOptimalBufferSize();
        const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        
        processor.onaudioprocess = (event) => {
            performance.mark('audio-processing-start');
            
            try {
                processingFunction(event);
            } catch (error) {
                console.error('Audio processing error:', error);
            }
            
            performance.mark('audio-processing-end');
            performance.measure('audio-processing', 'audio-processing-start', 'audio-processing-end');
        };
        
        return processor;
    }
    
    getOptimalBufferSize() {
        // Choose buffer size based on platform capabilities
        const possibleSizes = [256, 512, 1024, 2048, 4096, 8192];
        
        // For mobile devices, prefer larger buffers to avoid dropouts
        if (this.isMobileDevice()) {
            return 4096;
        }
        
        // For desktop, prefer smaller buffers for lower latency
        return 2048;
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    optimizeNetworkConnection(url, options = {}) {
        const optimizedOptions = {
            ...options,
            timeout: this.config.connectionTimeout,
            retries: this.config.maxReconnectAttempts,
            backoff: this.config.reconnectDelay
        };
        
        return optimizedOptions;
    }
    
    measureNetworkLatency(startTime) {
        const latency = Date.now() - startTime;
        this.metrics.networkLatency = latency;
        
        if (latency > this.config.networkLatencyThreshold) {
            console.warn(`High network latency detected: ${latency}ms`);
        }
        
        return latency;
    }
    
    shouldSwitchEngine(currentEngine, errorRate, latency) {
        // Decide if engine should be switched based on performance metrics
        const reasons = [];
        
        if (errorRate > 0.1) { // 10% error rate
            reasons.push('high error rate');
        }
        
        if (latency > this.config.networkLatencyThreshold) {
            reasons.push('high latency');
        }
        
        if (this.metrics.memoryUsage > this.config.maxMemoryUsage) {
            reasons.push('high memory usage');
        }
        
        if (this.metrics.audioDropouts > 5) {
            reasons.push('audio dropouts');
        }
        
        if (reasons.length > 0) {
            console.log(`Recommending engine switch due to: ${reasons.join(', ')}`);
            this.metrics.engineSwitches++;
            return true;
        }
        
        return false;
    }
    
    getResourceUsageReport() {
        return {
            memory: {
                used: this.metrics.memoryUsage,
                max: this.config.maxMemoryUsage,
                percentage: (this.metrics.memoryUsage / this.config.maxMemoryUsage) * 100
            },
            network: {
                latency: this.metrics.networkLatency,
                threshold: this.config.networkLatencyThreshold
            },
            audio: {
                dropouts: this.metrics.audioDropouts,
                sampleRate: this.config.preferredSampleRate
            },
            engines: {
                switches: this.metrics.engineSwitches
            }
        };
    }
    
    applyLightweightSettings(engine) {
        // Apply lightweight optimizations to specific engines
        switch (engine) {
            case 'sherpa':
                return this.optimizeSherpaEngine();
            case 'funasr':
                return this.optimizeFunASREngine();
            case 'webspeech':
                return this.optimizeWebSpeechEngine();
            default:
                return {};
        }
    }
    
    optimizeSherpaEngine() {
        return {
            // Reduce model complexity for better performance
            modelConfig: {
                numThreads: this.isMobileDevice() ? 2 : 4,
                useGpu: false, // CPU-only for better compatibility
                enableProfiler: false
            },
            vadConfig: {
                windowSize: 512, // Smaller window for faster processing
                threshold: 0.5
            }
        };
    }
    
    optimizeFunASREngine() {
        return {
            chunkSize: this.config.chunkSize,
            reconnectDelay: this.config.reconnectDelay,
            timeout: this.config.connectionTimeout
        };
    }
    
    optimizeWebSpeechEngine() {
        return {
            interimResults: false, // Disable interim results for better performance
            maxAlternatives: 1,
            continuous: true
        };
    }
    
    destroy() {
        if (this.gcTimer) {
            clearInterval(this.gcTimer);
        }
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        // Final cleanup
        this.performGarbageCollection();
    }
}

// Global lightweight optimizer instance
window.LightweightOptimizer = LightweightOptimizer; 