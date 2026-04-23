/**
 * Sherpa-ONNX WebAssembly ASR Engine
 * Lightweight local ASR using WebAssembly
 */

// Global flag to prevent multiple simultaneous initializations
let globalSherpaInitializing = false;
let globalSherpaInitialized = false;
let activeSherpaInstances = [];

class SherpaASREngine {
    constructor(config = {}) {
        this.instanceId = Math.random().toString(36).substr(2, 9);
        console.log(`🏗️ Creating new SherpaASREngine instance: ${this.instanceId}`);
        console.log(`📊 Active instances before creation: ${activeSherpaInstances.length}`);
        console.log(`📊 Global init status: initializing=${globalSherpaInitializing}, initialized=${globalSherpaInitialized}`);
        console.trace('📍 SherpaASREngine constructor call stack:');
        
        // Add to active instances list
        activeSherpaInstances.push(this.instanceId);
        console.log(`📊 Active instances after creation: ${activeSherpaInstances.map(id => id).join(', ')}`);
        
        this.onResult = config.onResult || (() => {});
        this.onError = config.onError ? ((error) => {
            console.log(`❌ SherpaASREngine instance ${this.instanceId} reporting error:`, error);
            console.trace('Error call stack:');
            config.onError(error);
        }) : (() => {});
        this.onStatusChange = config.onStatusChange || (() => {});
        
        this.isAvailableFlag = false;
        this.isRecording = false;
        
        // Audio context and processing
        this.audioCtx = null;
        this.mediaStream = null;
        this.recorder = null;
        this.expectedSampleRate = 16000;
        this.recordSampleRate = null;
        
        // Sherpa-ONNX components
        this.vad = null;
        this.buffer = null;
        this.recognizer = null;
        this.Module = null;
        
        // Result tracking
        this.lastResult = '';
        this.resultList = [];
        this.printed = false;

        // Safeguard for duplicate initialization
        this.isInitializing = false;
        this.isStopping = false; // Prevent duplicate stop calls
    }
    
    async init() {
        console.log(`🔧 Init called on SherpaASREngine instance: ${this.instanceId}`);
        
        // If already globally initialized, just mark this instance as available
        if (globalSherpaInitialized && window.Module && typeof createVad !== 'undefined') {
            console.log(`✅ Global Sherpa already initialized, reusing for instance ${this.instanceId}`);
            this.Module = window.Module;
            this.vad = createVad(window.Module);
            this.buffer = new CircularBuffer(30 * 16000, window.Module);
            this.initOfflineRecognizer();
            this.isAvailableFlag = true;
            this.onStatusChange('Sherpa-ONNX engine ready (reused)');
            return;
        }
        
        // Prevent duplicate initialization
        if (this.isInitializing) {
            console.warn(`⚠️ Sherpa-ONNX initialization already in progress for instance ${this.instanceId}, skipping duplicate call`);
            return;
        }
        
        if (this.isAvailableFlag) {
            console.log(`✅ Sherpa-ONNX already initialized for instance ${this.instanceId}, skipping`);
            return;
        }
        
        // Check if another instance is already initializing globally
        if (globalSherpaInitializing) {
            console.warn(`⚠️ Another Sherpa instance is already initializing globally, waiting...`);
            // Wait for the other instance to complete
            let attempts = 0;
            while (globalSherpaInitializing && attempts < 120) { // Wait up to 60 seconds
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (globalSherpaInitialized) {
                console.log(`✅ Global initialization completed by another instance, reusing for ${this.instanceId}`);
                this.Module = window.Module;
                this.vad = createVad(window.Module);
                this.buffer = new CircularBuffer(30 * 16000, window.Module);
                this.initOfflineRecognizer();
                this.isAvailableFlag = true;
                this.onStatusChange('Sherpa-ONNX engine ready (waited)');
                return;
            } else {
                throw new Error(`Timeout waiting for global Sherpa initialization by another instance`);
            }
        }
        
        // Mark as globally initializing
        globalSherpaInitializing = true;
        this.isInitializing = true;
        
        try {
            this.onStatusChange('Initializing Sherpa-ONNX WebAssembly...');
            
            // Check if required files exist
            console.log('Checking Sherpa-ONNX files...');
            if (!await this.checkRequiredFiles()) {
                throw new Error('Required Sherpa-ONNX files not found');
            }
            console.log('All required files found');
            
            // Initialize WebAssembly module
            console.log('Initializing WebAssembly module...');
            await this.initWebAssembly();
            console.log('WebAssembly module initialized');
            
            // Initialize audio context (but don't fail if this fails)
            try {
                console.log('Initializing audio context...');
                await this.initAudioContext();
                console.log('Audio context initialized');
            } catch (audioError) {
                console.warn('Audio context initialization failed:', audioError);
                // We'll initialize audio context when recording starts
            }
            
            this.isAvailableFlag = true;
            this.isInitializing = false;
            globalSherpaInitializing = false;
            globalSherpaInitialized = true;
            console.log(`🎉 Global Sherpa initialization completed successfully by instance ${this.instanceId}`);
            this.onStatusChange('Sherpa-ONNX engine ready');
            
        } catch (error) {
            console.error('Sherpa-ONNX initialization failed:', error);
            this.isAvailableFlag = false;
            this.isInitializing = false;
            globalSherpaInitializing = false; // Reset flag on failure
            console.error(`❌ Global Sherpa initialization failed for instance ${this.instanceId}`);
            this.onError(error);
            throw error;
        }
    }
    
    async checkRequiredFiles() {
        // The files are embedded in the .data package and loaded automatically by WASM runtime
        // No need to check file existence via HTTP - just verify directory structure exists
        console.log('✅ Sherpa-ONNX files will be loaded from .data package');
        return true;
    }
    
    async initWebAssembly() {
        return new Promise(async (resolve, reject) => {
            let wasmTimeoutId; // Store timeout ID to clear it later
            
            try {
                // Set up Module configuration FIRST, before loading any scripts
                // This is critical for the locateFile function to work
                const self = this;
                
                // Flag to track if initialization completed
                let initializationCompleted = false;
                
                // Clear any existing Module to prevent conflicts
                if (typeof window.Module !== 'undefined') {
                    console.warn('⚠️ Existing Module detected, backing up...');
                    window.__SherpaModuleBackup = window.Module;
                    delete window.Module;
                }
                
                console.log('🔧 Setting up fresh Module configuration...');
                
                // Set up global Module configuration
                window.Module = {
                    // https://emscripten.org/docs/api_reference/module.html#Module.locateFile
                    locateFile: function(path, scriptDirectory = '') {
                        console.log(`🔍 Locating file: ${path}, scriptDirectory: ${scriptDirectory}`);
                        
                        // If scriptDirectory is empty, use our base path
                        if (!scriptDirectory || scriptDirectory === './') {
                            const fullPath = './web-assembly-vad-asr-sherpa-onnx-zh-en-paraformer-small/' + path;
                            console.log(`📂 Resolved path: ${fullPath}`);
                            return fullPath;
                        }
                        
                        // Otherwise use the provided scriptDirectory
                        const fullPath = scriptDirectory + path;
                        console.log(`📂 Resolved path: ${fullPath}`);
                        return fullPath;
                    },
                    
                    // https://emscripten.org/docs/api_reference/module.html#Module.setStatus  
                    setStatus: function(status) {
                        console.log(`📡 Sherpa module status: ${status}`);
                        
                        // Parse download progress and show percentage
                        const progressMatch = status.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
                        if (progressMatch) {
                            const current = parseInt(progressMatch[1]);
                            const total = parseInt(progressMatch[2]);
                            const percentage = ((current / total) * 100).toFixed(1);
                            self.onStatusChange(`📦 Sherpa 模型下载中... ${percentage}%`);
                        } else if (status === 'Running...') {
                            self.onStatusChange('🚀 Sherpa-ONNX 模型加载完成');
                        } else if (status === '') {
                            self.onStatusChange('✅ Sherpa-ONNX 初始化完成');
                        }
                    },
                    
                    onRuntimeInitialized: function() {
                        try {
                            console.log('🚀 Sherpa-ONNX WebAssembly runtime initialized - onRuntimeInitialized CALLED');
                            
                            // Store the module reference (use the global Module that was set up)
                            self.Module = Module;
                            console.log('✅ Module reference stored');
                            
                            // Initialize components - wait a bit to ensure functions are available
                            setTimeout(() => {
                                try {
                                    console.log('🔧 Initializing Sherpa components...');
                                    
                                    // Check if required functions are available
                                    if (typeof createVad === 'undefined') {
                                        throw new Error('createVad function not available');
                                    }
                                    console.log('✅ createVad function available');
                                    
                                    if (typeof CircularBuffer === 'undefined') {
                                        throw new Error('CircularBuffer class not available');
                                    }
                                    console.log('✅ CircularBuffer class available');
                                    
                                    if (typeof OfflineRecognizer === 'undefined') {
                                        throw new Error('OfflineRecognizer class not available');
                                    }
                                    console.log('✅ OfflineRecognizer class available');
                                    
                                    // Initialize components like original demo
                                    self.vad = createVad(Module);
                                    console.log('✅ VAD created successfully');
                                    
                                    self.buffer = new CircularBuffer(30 * 16000, Module);
                                    console.log('✅ Circular buffer created successfully');
                                    
                                    self.initOfflineRecognizer();
                                    console.log('✅ Offline recognizer initialized successfully');
                                    
                                    // Clear timeout and mark as completed
                                    console.log('🎯 Clearing timeout and marking initialization complete');
                                    if (wasmTimeoutId) {
                                        clearTimeout(wasmTimeoutId);
                                        wasmTimeoutId = null;
                                    }
                                    initializationCompleted = true;
                                    
                                    // Mark global initialization as complete
                                    globalSherpaInitializing = false;
                                    globalSherpaInitialized = true;
                                    
                                    console.log('🎉 Sherpa-ONNX initialization completed successfully!');
                                    resolve();
                                    
                                } catch (componentError) {
                                    console.error('❌ Error initializing Sherpa components:', componentError);
                                    reject(componentError);
                                }
                            }, 500); // Wait 500ms for all functions to be available
                            
                        } catch (error) {
                            console.error('❌ Error in onRuntimeInitialized:', error);
                            reject(error);
                        }
                    }
                };
                
                // Now load all scripts with Module pre-configured
                console.log('🔄 Loading Sherpa scripts with Module pre-configured...');
                console.log('📋 Scripts to load:', ['sherpa-onnx-asr.js', 'sherpa-onnx-vad.js', 'sherpa-onnx-wasm-main-vad-asr.js']);
                
                await this.loadAllSherpaScripts();
                console.log('✅ All Sherpa scripts loaded successfully');
                
                // Verify that Module is still properly configured
                if (!window.Module || !window.Module.onRuntimeInitialized) {
                    throw new Error('Module configuration was lost after script loading');
                }
                console.log('✅ Module configuration intact after script loading');
                
                // Set timeout for 60 seconds to allow for large file download (80MB)
                wasmTimeoutId = setTimeout(() => {
                    if (!initializationCompleted && !self.isAvailableFlag) {
                        console.error(`⏰ WebAssembly module failed to initialize within timeout for instance ${self.instanceId}`);
                        console.error('🔍 Debugging WebAssembly initialization failure:');
                        console.error('- Module object exists:', !!self.Module);
                        console.error('- Module.ready exists:', !!(self.Module && self.Module.ready));
                        console.error('- createVad function exists:', typeof createVad !== 'undefined');
                        console.error('- CircularBuffer class exists:', typeof CircularBuffer !== 'undefined');
                        console.error('- OfflineRecognizer class exists:', typeof OfflineRecognizer !== 'undefined');
                        console.error('- onRuntimeInitialized was called:', !!self.Module);
                        console.error('- Components initialized:', {
                            hasVad: !!self.vad,
                            hasBuffer: !!self.buffer,
                            hasRecognizer: !!self.recognizer
                        });
                        console.error('⚠️ This suggests onRuntimeInitialized was never called or failed internally');
                        reject(new Error(`WebAssembly initialization timeout for instance ${self.instanceId} - onRuntimeInitialized not properly executed`));
                    } else if (self.isAvailableFlag) {
                        console.log(`✅ Timeout ignored - instance ${self.instanceId} already successfully initialized`);
                    } else {
                        console.log(`✅ Timeout cleared - initialization completed successfully for instance ${self.instanceId}`);
                    }
                }, 60000); // 60 second timeout for large model download
                
            } catch (error) {
                console.error('❌ Error in initWebAssembly:', error);
                reject(error);
            }
        });
    }
    
    async loadAllSherpaScripts() {
        const basePath = './web-assembly-vad-asr-sherpa-onnx-zh-en-paraformer-small/';
        
        // Load all scripts in the correct order following the original demo pattern
        const scripts = [
            'sherpa-onnx-asr.js',
            'sherpa-onnx-vad.js',
            'sherpa-onnx-wasm-main-vad-asr.js'  // Main WASM script loaded last
        ];
        
        // Load the scripts in order, but check for duplicates more carefully
        for (const script of scripts) {
            const fullPath = basePath + script;
            if (!this.isScriptLoadedByFullPath(fullPath)) {
                console.log(`📄 Loading script: ${script}`);
                await this.loadScript(fullPath);
            } else {
                console.log(`✅ Script already loaded: ${script}`);
            }
        }
        
        console.log('📚 All Sherpa scripts loaded');
    }
    
    isScriptLoadedByFullPath(fullPath) {
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src === new URL(fullPath, window.location.href).href) {
                return true;
            }
        }
        return false;
    }
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                console.log(`Loaded script: ${src}`);
                resolve();
            };
            script.onerror = (error) => {
                console.error(`Failed to load script: ${src}`, error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }
    
    createVad(Module) {
        // Use the global createVad function from sherpa-onnx-vad.js
        if (typeof createVad === 'undefined') {
            throw new Error('createVad function not available');
        }
        return createVad(Module);
    }
    
    fileExists(filename) {
        if (!this.Module) return false;
        
        const filenameLen = this.Module.lengthBytesUTF8(filename) + 1;
        const buffer = this.Module._malloc(filenameLen);
        this.Module.stringToUTF8(filename, buffer, filenameLen);
        
        let exists = this.Module._SherpaOnnxFileExists(buffer);
        
        this.Module._free(buffer);
        
        return exists;
    }
    
    initOfflineRecognizer() {
        if (typeof OfflineRecognizer === 'undefined') {
            throw new Error('OfflineRecognizer not available');
        }
        
        // Use the same pattern as original demo
        let config = {
            modelConfig: {
                debug: 1,
                tokens: './tokens.txt',
            },
        };
        
        // Check for models using the same pattern as original demo
        if (this.fileExists('paraformer.onnx') == 1) {
            config.modelConfig.paraformer = {
                model: './paraformer.onnx',
            };
        } else {
            console.log('Please specify a model.');
            throw new Error('No supported model found in WASM filesystem');
        }
        
        try {
            this.recognizer = new OfflineRecognizer(config, this.Module);
            console.log('OfflineRecognizer created successfully');
        } catch (error) {
            console.error('Failed to create OfflineRecognizer:', error);
            throw error;
        }
    }
    
    async initAudioContext() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia not supported');
        }
        
        const constraints = { audio: true };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext({ sampleRate: this.expectedSampleRate });
        }
        
        this.recordSampleRate = this.audioCtx.sampleRate;
        console.log('Audio sample rate:', this.recordSampleRate);
        
        // Create media stream source
        this.mediaStream = this.audioCtx.createMediaStreamSource(stream);
        
        // Create script processor
        const bufferSize = 4096;
        const numberOfInputChannels = 1;
        const numberOfOutputChannels = 2;
        
        // Note: ScriptProcessorNode is deprecated but AudioWorkletNode requires HTTPS
        // and additional setup. For compatibility, we'll continue using ScriptProcessorNode
        // but suppress the deprecation warning in our logs.
        console.warn('⚠️ Using ScriptProcessorNode (deprecated) for audio processing. Consider upgrading to AudioWorkletNode for production use.');
        
        if (this.audioCtx.createScriptProcessor) {
            this.recorder = this.audioCtx.createScriptProcessor(
                bufferSize, numberOfInputChannels, numberOfOutputChannels);
        } else {
            this.recorder = this.audioCtx.createJavaScriptNode(
                bufferSize, numberOfInputChannels, numberOfOutputChannels);
        }
        
        // Setup audio processing
        this.recorder.onaudioprocess = (e) => {
            try {
                this.processAudio(e);
            } catch (audioError) {
                console.error(`❌ Audio processing error in instance ${this.instanceId}:`, audioError);
                // Don't throw here to avoid stopping the audio processing completely
            }
        };
    }
    
    processAudio(e) {
        if (!this.isRecording) return;
        
        let samples = new Float32Array(e.inputBuffer.getChannelData(0));
        samples = this.downsampleBuffer(samples, this.expectedSampleRate);
        
        this.buffer.push(samples);
        
        while (this.buffer.size() > this.vad.config.sileroVad.windowSize) {
            const s = this.buffer.get(this.buffer.head(), this.vad.config.sileroVad.windowSize);
            this.vad.acceptWaveform(s);
            this.buffer.pop(this.vad.config.sileroVad.windowSize);
            
            if (this.vad.isDetected() && !this.printed) {
                this.printed = true;
                this.lastResult = 'Speech detected';
            }
            
            if (!this.vad.isDetected()) {
                this.printed = false;
                if (this.lastResult != '') {
                    this.resultList.push(this.lastResult);
                }
                this.lastResult = '';
            }
            
            while (!this.vad.isEmpty()) {
                const segment = this.vad.front();
                this.vad.pop();
                
                // Process with offline recognizer
                const stream = this.recognizer.createStream();
                stream.acceptWaveform(this.expectedSampleRate, segment.samples);
                this.recognizer.decode(stream);
                let recognitionResult = this.recognizer.getResult(stream);
                stream.free();
                
                const text = recognitionResult.text;
                if (text && text.trim()) {
                    const metadata = {
                        mode: 'sherpa',
                        is_final: true,
                        engine: 'sherpa',
                        duration: segment.samples.length / this.expectedSampleRate
                    };
                    this.onResult(text.trim(), metadata);
                }
            }
        }
    }
    
    // Downsample audio buffer
    downsampleBuffer(buffer, exportSampleRate) {
        if (exportSampleRate === this.recordSampleRate) {
            return buffer;
        }
        
        const sampleRateRatio = this.recordSampleRate / exportSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        
        return result;
    }
    
    async start() {
        if (!this.isAvailableFlag) {
            throw new Error('Sherpa engine not available');
        }
        
        if (this.isRecording) {
            return;
        }
        
        try {
            // Initialize audio context if not already done
            if (!this.audioCtx || !this.mediaStream || !this.recorder) {
                console.log('Initializing audio context for recording...');
                await this.initAudioContext();
            }
            
            // Reset components
            if (this.vad) this.vad.reset();
            if (this.buffer) this.buffer.reset();
            this.lastResult = '';
            this.resultList = [];
            this.printed = false;
            
            // Start audio processing
            this.mediaStream.connect(this.recorder);
            this.recorder.connect(this.audioCtx.destination);
            
            this.isRecording = true;
            this.onStatusChange('Sherpa-ONNX recording started');
            
        } catch (error) {
            console.error('Error starting Sherpa recording:', error);
            this.onError(error);
            throw error;
        }
    }
    
    async stop() {
        console.log(`🛑 Stop called on SherpaASREngine instance: ${this.instanceId}, isRecording: ${this.isRecording}, isStopping: ${this.isStopping}`);
        
        if (!this.isRecording) {
            console.log(`📝 Instance ${this.instanceId} is not currently recording, skipping stop`);
            return;
        }
        
        if (this.isStopping) {
            console.log(`🔄 Instance ${this.instanceId} is already stopping, skipping duplicate stop call`);
            return;
        }
        
        // Set flags IMMEDIATELY to prevent duplicate calls
        this.isRecording = false;
        this.isStopping = true;
        console.log(`🔒 Recording and stopping flags set for instance ${this.instanceId}`);
        
        try {
            console.log(`🔧 Stopping audio processing for instance ${this.instanceId}`);
            
            // Stop audio processing
            if (this.recorder && this.audioCtx) {
                this.recorder.disconnect(this.audioCtx.destination);
                console.log(`✅ Recorder disconnected from audio context (${this.instanceId})`);
            }
            
            if (this.mediaStream && this.recorder) {
                this.mediaStream.disconnect(this.recorder);
                console.log(`✅ Media stream disconnected from recorder (${this.instanceId})`);
            }
            
            // Reset VAD and buffer
            if (this.vad) {
                this.vad.reset();
                console.log(`✅ VAD reset (${this.instanceId})`);
            }
            
            if (this.buffer) {
                this.buffer.reset();
                console.log(`✅ Buffer reset (${this.instanceId})`);
            }
            
            console.log(`✅ Recording stopped successfully for instance ${this.instanceId}`);
            this.onStatusChange('Sherpa-ONNX recording stopped');
            
        } catch (error) {
            console.error(`❌ Error stopping recording for instance ${this.instanceId}:`, error);
            console.error(`🔍 Error details:`, {
                hasRecorder: !!this.recorder,
                hasAudioCtx: !!this.audioCtx,
                hasMediaStream: !!this.mediaStream,
                hasVad: !!this.vad,
                hasBuffer: !!this.buffer
            });
            // Don't re-throw the error here to prevent cascading failures
            console.warn(`⚠️ Continuing despite stop error for instance ${this.instanceId}`);
        } finally {
            // Always reset the stopping flag
            this.isStopping = false;
            console.log(`🔓 Stopping flag cleared for instance ${this.instanceId}`);
        }
    }
    
    isAvailable() {
        return this.isAvailableFlag;
    }
    
    destroy() {
        console.log(`💀 Destroying SherpaASREngine instance: ${this.instanceId}`);
        
        if (this.isRecording) {
            this.stop();
        }
        
        // Remove from active instances list
        const index = activeSherpaInstances.indexOf(this.instanceId);
        if (index !== -1) {
            activeSherpaInstances.splice(index, 1);
            console.log(`📊 Removed instance ${this.instanceId} from active list. Remaining: ${activeSherpaInstances.length}`);
        }
        
        if (this.recognizer) {
            this.recognizer.free();
        }
        
        if (this.vad) {
            this.vad.free();
        }
        
        if (this.buffer) {
            this.buffer.free();
        }
        
        if (this.audioCtx) {
            this.audioCtx.close();
        }
        
        this.isAvailableFlag = false;
        console.log(`✅ Instance ${this.instanceId} destroyed successfully`);
    }
} 