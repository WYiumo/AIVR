/**
 * Web Speech API Engine
 * Uses browser's native speech recognition capabilities
 */

class WebSpeechEngine {
    constructor(config = {}) {
        this.onResult = config.onResult || (() => {});
        this.onError = config.onError || (() => {});
        this.onStatusChange = config.onStatusChange || (() => {});
        
        this.isAvailableFlag = false;
        this.isRecording = false;
        
        // Speech recognition instance
        this.recognition = null;
        
        // Configuration
        this.config = {
            continuous: true,
            interimResults: true,
            lang: 'zh-CN', // Default to Chinese, can be configured
            maxAlternatives: 1
        };
        
        // Result tracking
        this.finalTranscript = '';
        this.interimTranscript = '';
    }
    
    async init() {
        try {
            this.onStatusChange('Initializing Web Speech API...');
            
            // Check browser support
            if (!this.checkBrowserSupport()) {
                throw new Error('Web Speech API not supported in this browser');
            }
            
            // Initialize speech recognition
            this.initSpeechRecognition();
            
            this.isAvailableFlag = true;
            this.onStatusChange('Web Speech API ready');
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    checkBrowserSupport() {
        return (
            'webkitSpeechRecognition' in window ||
            'SpeechRecognition' in window
        );
    }
    
    initSpeechRecognition() {
        // Create speech recognition instance
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.lang = this.config.lang;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
        
        // Set up event handlers
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        this.recognition.onstart = () => {
            console.log('Web Speech API started');
            this.isRecording = true;
            this.onStatusChange('Web Speech API recording started');
        };
        
        this.recognition.onend = () => {
            console.log('Web Speech API ended');
            this.isRecording = false;
            this.onStatusChange('Web Speech API recording stopped');
        };
        
        this.recognition.onresult = (event) => {
            this.handleResults(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Web Speech API error:', event.error);
            this.handleError(event);
        };
        
        this.recognition.onnomatch = () => {
            console.log('Web Speech API: No speech was recognised');
        };
        
        this.recognition.onspeechstart = () => {
            console.log('Speech started');
        };
        
        this.recognition.onspeechend = () => {
            console.log('Speech ended');
        };
        
        this.recognition.onsoundstart = () => {
            console.log('Sound started');
        };
        
        this.recognition.onsoundend = () => {
            console.log('Sound ended');
        };
    }
    
    handleResults(event) {
        this.interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                this.finalTranscript += transcript;
                const metadata = {
                    mode: 'webspeech',
                    is_final: true,
                    confidence: event.results[i][0].confidence,
                    engine: 'webspeech'
                };
                this.onResult(transcript, metadata);
            } else {
                this.interimTranscript += transcript;
                // Optionally send interim results with metadata
                const metadata = {
                    mode: 'webspeech',
                    is_final: false,
                    confidence: event.results[i][0].confidence,
                    engine: 'webspeech'
                };
                // For now, only send final results to avoid too many interim updates
                // this.onResult(transcript, metadata);
            }
        }
        
        // For debugging - log interim results
        if (this.interimTranscript) {
            console.log('Interim result:', this.interimTranscript);
        }
    }
    
    handleError(event) {
        let errorMessage = 'Web Speech API error: ';
        
        switch (event.error) {
            case 'no-speech':
                errorMessage += 'No speech was detected';
                // Don't treat this as a fatal error, just restart if still recording
                if (this.isRecording) {
                    setTimeout(() => {
                        this.restartRecognition();
                    }, 1000);
                }
                return;
                
            case 'audio-capture':
                errorMessage += 'Audio capture failed';
                break;
                
            case 'not-allowed':
                errorMessage += 'Permission to use microphone is blocked';
                break;
                
            case 'network':
                errorMessage += 'Network connection failed';
                break;
                
            case 'language-not-supported':
                errorMessage += 'Language not supported';
                break;
                
            case 'service-not-allowed':
                errorMessage += 'Speech recognition service not allowed';
                break;
                
            default:
                errorMessage += event.error;
                break;
        }
        
        this.onError(new Error(errorMessage));
    }
    
    async restartRecognition() {
        if (!this.isRecording) return;
        
        try {
            console.log('Restarting Web Speech API recognition');
            this.recognition.stop();
            
            // Wait a bit before restarting
            setTimeout(() => {
                if (this.isRecording) {
                    this.recognition.start();
                }
            }, 100);
            
        } catch (error) {
            console.error('Error restarting recognition:', error);
        }
    }
    
    async start() {
        if (!this.isAvailableFlag) {
            throw new Error('Web Speech API not available');
        }
        
        if (this.isRecording) {
            return;
        }
        
        try {
            // Clear previous results
            this.finalTranscript = '';
            this.interimTranscript = '';
            
            // Start recognition
            this.recognition.start();
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    async stop() {
        if (!this.isRecording) {
            return;
        }
        
        try {
            this.recognition.stop();
            
        } catch (error) {
            this.onError(error);
            throw error;
        }
    }
    
    // Configuration methods
    setLanguage(lang) {
        this.config.lang = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }
    
    setContinuous(continuous) {
        this.config.continuous = continuous;
        if (this.recognition) {
            this.recognition.continuous = continuous;
        }
    }
    
    setInterimResults(interimResults) {
        this.config.interimResults = interimResults;
        if (this.recognition) {
            this.recognition.interimResults = interimResults;
        }
    }
    
    // Get supported languages (browser-dependent)
    getSupportedLanguages() {
        // This is a common list of supported languages for Web Speech API
        // Actual support varies by browser and platform
        return [
            { code: 'zh-CN', name: '中文 (普通话, 中国大陆)' },
            { code: 'zh-TW', name: '中文 (台灣)' },
            { code: 'zh-HK', name: '中文 (香港)' },
            { code: 'en-US', name: 'English (United States)' },
            { code: 'en-GB', name: 'English (United Kingdom)' },
            { code: 'ja-JP', name: '日本語 (日本)' },
            { code: 'ko-KR', name: '한국어 (대한민국)' },
            { code: 'es-ES', name: 'Español (España)' },
            { code: 'fr-FR', name: 'Français (France)' },
            { code: 'de-DE', name: 'Deutsch (Deutschland)' },
        ];
    }
    
    getCurrentLanguage() {
        return this.config.lang;
    }
    
    getFinalTranscript() {
        return this.finalTranscript;
    }
    
    getInterimTranscript() {
        return this.interimTranscript;
    }
    
    isAvailable() {
        return this.isAvailableFlag;
    }
    
    destroy() {
        if (this.isRecording) {
            this.stop();
        }
        
        if (this.recognition) {
            this.recognition.onstart = null;
            this.recognition.onend = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onnomatch = null;
            this.recognition.onspeechstart = null;
            this.recognition.onspeechend = null;
            this.recognition.onsoundstart = null;
            this.recognition.onsoundend = null;
            
            this.recognition = null;
        }
        
        this.isAvailableFlag = false;
    }
} 