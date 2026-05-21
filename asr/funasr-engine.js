/**
 * FunASR Engine - WebSocket-based ASR
 * Wraps the existing FunASR implementation for server-based recognition
 */

class FunASREngine {
    constructor(config = {}) {
        this.onResult = config.onResult || (() => {});
        this.onError = config.onError || (() => {});
        this.onStatusChange = config.onStatusChange || (() => {});
        
        this.isAvailableFlag = false;
        this.isRecording = false;
        
        // WebSocket connector
        this.wsconnecter = null;
        this.recorder = null;
        
        // Audio recording buffer
        this.sampleBuf = new Int16Array();
        this.isConnected = false;
        
        // Result tracking
        this.recText = '';
        this.offlineText = '';
    }
    
    async init() {
        try {
            this.onStatusChange('Initializing FunASR engine...');
            
            // Check if required scripts are loaded
            if (!this.checkRequiredGlobals()) {
                await this.loadRequiredScripts();
            }
            
            // Initialize WebSocket connector
            this.initWebSocketConnector();
            
            // Initialize recorder
            this.initRecorder();
            
            this.isAvailableFlag = true;
            this.onStatusChange('FunASR engine ready');
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    checkRequiredGlobals() {
        return (
            typeof Recorder !== 'undefined' &&
            typeof WebSocketConnectMethod !== 'undefined'
        );
    }
    
    async loadRequiredScripts() {
        const scripts = [
            'recorder-core.js',
            'wav.js', 
            'pcm.js',
            'wsconnecter.js'
        ];
        
        for (const script of scripts) {
            if (!this.isScriptLoaded(script)) {
                await this.loadScript(script);
            }
        }
    }
    
    isScriptLoaded(scriptName) {
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src.includes(scriptName)) {
                return true;
            }
        }
        return false;
    }
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    initWebSocketConnector() {
        this.wsconnecter = new WebSocketConnectMethod({
            msgHandle: (jsonMsg) => this.handleMessage(jsonMsg),
            stateHandle: (state) => this.handleConnectionState(state)
        });
    }
    
    initRecorder() {
        this.recorder = Recorder({
            type: "pcm",
            bitRate: 16,
            sampleRate: 16000,
            onProcess: (buffer, powerLevel, bufferDuration, bufferSampleRate, newBufferIdx, asyncEnd) => {
                this.processAudio(buffer, powerLevel, bufferDuration, bufferSampleRate, newBufferIdx, asyncEnd);
            }
        });
    }
    
    handleMessage(jsonMsg) {
        try {
            const data = JSON.parse(jsonMsg.data);
            const text = data.text || '';
            const asrModel = data.mode || '';
            const isFinal = data.is_final || false;
            
            if (asrModel === "2pass-offline" || asrModel === "offline") {
                this.offlineText += text.replace(/ +/g, "") + '\n';
                this.recText = this.offlineText;
            } else {
                this.recText += text;
            }
            
            if (text && text.trim()) {
                const metadata = {
                    mode: asrModel,
                    is_final: isFinal,
                    timestamp: data.timestamp,
                    engine: 'funasr'
                };
                this.onResult(text.trim(), metadata);
            }
            
        } catch (error) {
            console.error('Error parsing FunASR message:', error);
        }
    }
    
    handleConnectionState(state) {
        switch (state) {
            case 0: // Connected
                this.isConnected = true;
                this.onStatusChange('FunASR connected successfully');
                break;
            case 1: // Disconnected
                this.isConnected = false;
                this.onStatusChange('FunASR disconnected');
                break;
            case 2: // Error
                this.isConnected = false;
                this.onError(new Error('FunASR connection failed'));
                break;
        }
    }
    
    processAudio(buffer, powerLevel, bufferDuration, bufferSampleRate, newBufferIdx, asyncEnd) {
        if (!this.isRecording || !this.isConnected) return;
        
        const data48k = buffer[buffer.length - 1];
        const array48k = new Array(data48k);
        const data16k = Recorder.SampleData(array48k, bufferSampleRate, 16000).data;
        
        this.sampleBuf = Int16Array.from([...this.sampleBuf, ...data16k]);
        
        const chunkSize = 960; // ASR chunk size [5, 10, 5]
        
        while (this.sampleBuf.length >= chunkSize) {
            const sendBuf = this.sampleBuf.slice(0, chunkSize);
            this.sampleBuf = this.sampleBuf.slice(chunkSize, this.sampleBuf.length);
            this.wsconnecter.wsSend(sendBuf);
        }
    }
    
    getServerAddress() {
        // Try to get from UI if available, otherwise use default
        const wssipElement = document.getElementById('wssip');
        if (wssipElement) {
            return wssipElement.value;
        }
        return 'wss://www.funasr.com:10096/';
    }
    
    getAsrMode() {
        // Try to get from UI if available, otherwise use default
        const asrModeElements = document.getElementsByName("asr_mode");
        if (asrModeElements) {
            for (let element of asrModeElements) {
                if (element.checked) {
                    return element.value;
                }
            }
        }
        return '2pass'; // Default mode
    }
    
    getUseITN() {
        // Try to get from UI if available, otherwise use default
        const itnElements = document.getElementsByName("use_itn");
        if (itnElements) {
            for (let element of itnElements) {
                if (element.checked) {
                    return element.value === "true";
                }
            }
        }
        return false; // Default
    }
    
    getHotwords() {
        // Try to get from UI if available, otherwise return null
        const hotwordElement = document.getElementById("varHot");
        if (hotwordElement && hotwordElement.value.length > 0) {
            const val = hotwordElement.value.toString();
            const items = val.split(/[(\r\n)\r\n]+/);
            const jsonResult = {};
            const regexNum = /^[0-9]*$/;
            
            for (const item of items) {
                const result = item.split(" ");
                if (result.length >= 2 && regexNum.test(result[result.length - 1])) {
                    let wordStr = "";
                    for (let i = 0; i < result.length - 1; i++) {
                        wordStr += result[i] + " ";
                    }
                    jsonResult[wordStr.trim()] = parseInt(result[result.length - 1]);
                }
            }
            
            return Object.keys(jsonResult).length > 0 ? JSON.stringify(jsonResult) : null;
        }
        return null;
    }
    
    async connect() {
        if (this.isConnected) {
            return;
        }
        
        // Set the server address in the input field if it exists
        const wssipElement = document.getElementById('wssip');
        if (wssipElement && !wssipElement.value) {
            wssipElement.value = this.getServerAddress();
        }
        
        const result = this.wsconnecter.wsStart();
        if (result !== 1) {
            throw new Error('Failed to start WebSocket connection');
        }
        
        this.onStatusChange('Connecting to FunASR server...');
    }
    
    async start() {
        if (!this.isAvailableFlag) {
            throw new Error('FunASR engine not available');
        }
        
        if (this.isRecording) {
            return;
        }
        
        try {
            // Connect if not already connected
            if (!this.isConnected) {
                await this.connect();
                // Wait for connection to establish
                await this.waitForConnection();
            }
            
            // Clear previous results
            this.recText = '';
            this.offlineText = '';
            this.sampleBuf = new Int16Array();
            
            // Start recording
            await new Promise((resolve, reject) => {
                this.recorder.open(() => {
                    this.recorder.start();
                    this.isRecording = true;
                    this.onStatusChange('FunASR recording started');
                    resolve();
                }, reject);
            });
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    async waitForConnection(timeout = 5000) {
        const startTime = Date.now();
        while (!this.isConnected && Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!this.isConnected) {
            throw new Error('Connection timeout');
        }
    }
    
    async stop() {
        if (!this.isRecording) {
            return;
        }
        
        try {
            // Send final chunk and stop signal
            if (this.sampleBuf.length > 0) {
                this.wsconnecter.wsSend(this.sampleBuf);
                this.sampleBuf = new Int16Array();
            }
            
            // Send stop request
            const request = {
                "chunk_size": [5, 10, 5],
                "wav_name": "h5",
                "is_speaking": false,
                "chunk_interval": 10,
                "mode": this.getAsrMode(),
                "itn": this.getUseITN()
            };
            
            const hotwords = this.getHotwords();
            if (hotwords) {
                request.hotwords = hotwords;
            }
            
            this.wsconnecter.wsSend(JSON.stringify(request));
            
            // Stop recorder
            this.recorder.stop(() => {
                this.isRecording = false;
                this.onStatusChange('FunASR recording stopped');
            }, (error) => {
                console.error('Error stopping recorder:', error);
                this.isRecording = false;
            });
            
            // Close WebSocket connection after a delay
            setTimeout(() => {
                this.wsconnecter.wsStop();
                this.isConnected = false;
            }, 3000);
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    isAvailable() {
        return this.isAvailableFlag;
    }
    
    destroy() {
        if (this.isRecording) {
            this.stop();
        }
        
        if (this.wsconnecter) {
            this.wsconnecter.wsStop();
        }
        
        if (this.recorder) {
            this.recorder.close();
        }
        
        this.isAvailableFlag = false;
        this.isConnected = false;
    }
} 