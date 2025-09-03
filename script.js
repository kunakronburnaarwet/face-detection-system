class AdvancedFaceDetection {
    constructor() {
        this.models = {};
        this.currentModel = 'mediapipe';
        this.settings = {
            strictness: 7,
            showLandmarks: true,
            showBoundingBox: true,
            enableSound: false
        };
        this.currentStream = null;
        this.facingMode = 'user';
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadModels();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.camera = document.getElementById('camera');
        this.analysisSection = document.getElementById('analysisSection');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.resultContainer = document.getElementById('resultContainer');
        this.previewImage = document.getElementById('previewImage');
        this.resultBadge = document.getElementById('resultBadge');
        this.confidenceScore = document.getElementById('confidenceScore');
        this.analysisDetails = document.getElementById('analysisDetails');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.startCameraBtn = document.getElementById('startCamera');
        this.capturePhotoBtn = document.getElementById('capturePhoto');
        this.switchCameraBtn = document.getElementById('switchCamera');
        this.analyzeAgainBtn = document.getElementById('analyzeAgain');
        this.downloadResultBtn = document.getElementById('downloadResult');
        
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsContent = document.getElementById('settingsContent');
        this.strictnessLevel = document.getElementById('strictnessLevel');
        this.strictnessValue = document.getElementById('strictnessValue');
        this.showLandmarks = document.getElementById('showLandmarks');
        this.showBoundingBox = document.getElementById('showBoundingBox');
        this.enableSound = document.getElementById('enableSound');
    }

    setupEventListeners() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processImage(files[0]);
            }
        });

        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.capturePhotoBtn.addEventListener('click', () => this.capturePhoto());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.analyzeAgainBtn.addEventListener('click', () => this.resetToUpload());
        this.downloadResultBtn.addEventListener('click', () => this.downloadResult());

        this.settingsBtn.addEventListener('click', () => this.toggleSettings());
        
        this.strictnessLevel.addEventListener('input', (e) => {
            this.settings.strictness = parseInt(e.target.value);
            this.strictnessValue.textContent = e.target.value;
        });
        
        this.showLandmarks.addEventListener('change', (e) => {
            this.settings.showLandmarks = e.target.checked;
        });
        
        this.showBoundingBox.addEventListener('change', (e) => {
            this.settings.showBoundingBox = e.target.checked;
        });
        
        this.enableSound.addEventListener('change', (e) => {
            this.settings.enableSound = e.target.checked;
        });

        document.querySelectorAll('input[name="model"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
            });
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    async loadModels() {
        try {
            this.models.mediapipe = await faceDetection.createDetector(
                faceDetection.SupportedModels.MediaPipeFaceDetector,
                {
                    runtime: 'tfjs',
                    maxFaces: 5,
                    detectionConfidence: 0.5
                }
            );
            
            this.models.blazeface = await blazeface.load();
            
            this.models.facemesh = await faceLandmarksDetection.createDetector(
                faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                {
                    runtime: 'tfjs',
                    maxFaces: 1,
                    refineLandmarks: true
                }
            );
            
            console.log('All models loaded successfully');
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        if (tabName === 'camera') {
            this.stopCamera();
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert('ขนาดไฟล์ต้องไม่เกิน 10MB');
                return;
            }
            await this.processImage(file);
        }
    }

    async processImage(file) {
        const img = new Image();
        img.onload = async () => {
            this.previewImage.src = img.src;
            this.showAnalysisSection();
            
            const result = await this.analyzeImage(img);
            this.showResult(result, img);
        };
        img.src = URL.createObjectURL(file);
    }

    async startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.camera.srcObject = this.currentStream;
            
            this.camera.style.display = 'block';
            this.startCameraBtn.style.display = 'none';
            this.capturePhotoBtn.style.display = 'block';
            this.switchCameraBtn.style.display = 'block';
            
        } catch (error) {
            console.error('Camera error:', error);
            alert('ไม่สามารถเข้าถึงกล้องได้');
        }
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        this.camera.style.display = 'none';
        this.startCameraBtn.style.display = 'block';
        this.capturePhotoBtn.style.display = 'none';
        this.switchCameraBtn.style.display = 'none';
    }

    switchCamera() {
        this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
        this.stopCamera();
        this.startCamera();
    }

    capturePhoto() {
        this.canvas.width = this.camera.videoWidth;
        this.canvas.height = this.camera.videoHeight;
        this.ctx.drawImage(this.camera, 0, 0);
        
        this.canvas.toBlob(async (blob) => {
            await this.processImage(blob);
            this.stopCamera();
        });
    }

    async analyzeImage(img) {
        this.showLoading();
        
        try {
            let faces = [];
            let analysis = {};
            
            if (!this.models[this.currentModel]) {
                throw new Error(`Model ${this.currentModel} not loaded`);
            }
            
            switch (this.currentModel) {
                case 'mediapipe':
                    faces = await this.models.mediapipe.estimateFaces(img);
                    analysis = this.analyzeWithMediaPipe(faces, img);
                    break;
                case 'blazeface':
                    const predictions = await this.models.blazeface.estimateFaces(img);
                    analysis = this.analyzeWithBlazeFace(predictions, img);
                    break;
                case 'facemesh':
                    faces = await this.models.facemesh.estimateFaces(img);
                    analysis = this.analyzeWithFaceMesh(faces, img);
                    break;
            }
            
            if (!analysis.faces || analysis.faces.length === 0) {
                return {
                    result: "วัตถุ",
                    confidence: 0,
                    faces: [],
                    details: "ไม่พบใบหน้าในภาพ"
                };
            }
            
            return this.makeFinalDecision(analysis);
            
        } catch (error) {
            console.error('Analysis error:', error);
            return {
                result: "วัตถุ",
                confidence: 0,
                faces: [],
                details: "เกิดข้อผิดพลาดในการวิเคราะห์"
            };
        }
    }

    analyzeWithMediaPipe(faces, img) {
        if (faces.length === 0) {
            return { result: "วัตถุ", confidence: 0, faces: [] };
        }
        
        const face = faces[0];
        const quality = this.assessImageQuality(img);
        const faceQuality = this.assessFaceQuality(face);
        const sizeRatio = this.calculateFaceSizeRatio(face, img);
        
        const strictness = this.settings.strictness / 15;
        
        if (quality < 0.15 || faceQuality < 0.3 || sizeRatio < 0.02) {
            return { result: "วัตถุ", confidence: Math.max(quality, faceQuality), faces: [face] };
        }
        
        const overallConfidence = (quality + faceQuality + Math.min(sizeRatio * 15, 1)) / 3;
        
        if (overallConfidence < strictness) {
            return { result: "วัตถุ", confidence: overallConfidence, faces: [face] };
        }
        
        return { result: "มนุษย์", confidence: overallConfidence, faces: [face] };
    }

    analyzeWithBlazeFace(predictions, img) {
        if (predictions.length === 0) {
            return { result: "วัตถุ", confidence: 0, faces: [] };
        }
        
        const prediction = predictions[0];
        const quality = this.assessImageQuality(img);
        const confidence = prediction.probability[0];
        
        const sizeRatio = (prediction.box.width * prediction.box.height) / (img.width * img.height);
        
        const strictness = this.settings.strictness / 15;
        
        if (quality < 0.15 || confidence < 0.5 || sizeRatio < 0.02) {
            return { result: "วัตถุ", confidence: Math.min(confidence, quality), faces: [prediction] };
        }
        
        const overallConfidence = (quality + confidence + Math.min(sizeRatio * 15, 1)) / 3;
        
        if (overallConfidence < strictness) {
            return { result: "วัตถุ", confidence: overallConfidence, faces: [prediction] };
        }
        
        return { result: "มนุษย์", confidence: overallConfidence, faces: [prediction] };
    }

    analyzeWithFaceMesh(faces, img) {
        if (faces.length === 0) {
            return { result: "วัตถุ", confidence: 0, faces: [] };
        }
        
        const face = faces[0];
        const quality = this.assessImageQuality(img);
        const landmarks = face.keypoints || [];
        
        const sizeRatio = this.calculateFaceSizeRatio(face, img);
        const landmarkQuality = landmarks.length / 468;
        
        const strictness = this.settings.strictness / 15;
        
        if (quality < 0.15 || landmarkQuality < 0.4 || sizeRatio < 0.02) {
            return { result: "วัตถุ", confidence: Math.min(quality, landmarkQuality), faces: [face] };
        }
        
        const overallConfidence = (quality + landmarkQuality + Math.min(sizeRatio * 15, 1)) / 3;
        
        if (overallConfidence < strictness) {
            return { result: "วัตถุ", confidence: overallConfidence, faces: [face] };
        }
        
        return { result: "มนุษย์", confidence: overallConfidence, faces: [face] };
    }

    makeFinalDecision(analysis) {
        if (this.settings.enableSound) {
            this.playSound(analysis.result);
        }
        
        return analysis;
    }

    assessImageQuality(img) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        
        const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        
        let totalBrightness = 0;
        let contrast = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            contrast += Math.abs(brightness - avgBrightness);
        }
        
        const avgContrast = contrast / (data.length / 4);
        
        if (avgBrightness < 20 || avgBrightness > 235) {
            return 0.1;
        }
        
        const brightnessScore = Math.min(avgBrightness / 180, 1.0);
        const contrastScore = Math.min(avgContrast / 80, 1.0);
        
        return (brightnessScore + contrastScore) / 2;
    }

    assessFaceQuality(face) {
        const confidence = face.score || 0.5;
        const keypoints = face.keypoints || [];
        
        if (confidence < 0.4) {
            return 0.2;
        }
        
        const requiredPoints = ['leftEye', 'rightEye', 'noseTip', 'mouthLeft', 'mouthRight'];
        let foundPoints = 0;
        
        requiredPoints.forEach(pointName => {
            if (keypoints.some(kp => kp.name === pointName)) {
                foundPoints++;
            }
        });
        
        const pointScore = foundPoints / requiredPoints.length;
        return (confidence + pointScore) / 2;
    }

    calculateFaceSizeRatio(face, img) {
        const box = face.box || face.boundingBox;
        if (!box) return 0;
        
        const faceArea = box.width * box.height;
        const imageArea = img.width * img.height;
        return faceArea / imageArea;
    }

    showAnalysisSection() {
        document.querySelector('.upload-section').style.display = 'none';
        document.querySelector('.model-selection').style.display = 'none';
        this.analysisSection.style.display = 'block';
    }

    showLoading() {
        this.loadingSpinner.style.display = 'block';
        this.resultContainer.style.display = 'none';
    }

    showResult(result, img) {
        this.loadingSpinner.style.display = 'none';
        this.resultContainer.style.display = 'block';
        
        this.resultBadge.textContent = result.result;
        this.resultBadge.className = `result-badge ${result.result === 'มนุษย์' ? 'human' : 'object'}`;
        
        this.confidenceScore.textContent = `ความมั่นใจ: ${Math.round(result.confidence * 100)}%`;
        
        const details = this.generateAnalysisDetails(result);
        this.analysisDetails.innerHTML = details;
        
        this.drawAnalysisOverlay(result, img);
    }

    generateAnalysisDetails(result) {
        const modelNames = {
            'mediapipe': 'MediaPipe Face Detection',
            'blazeface': 'BlazeFace',
            'facemesh': 'FaceMesh'
        };
        
        return `
            <div class="detail-item">
                <strong>โมเดลที่ใช้:</strong> ${modelNames[this.currentModel]}
            </div>
            <div class="detail-item">
                <strong>ระดับความเข้มงวด:</strong> ${this.settings.strictness}/10
            </div>
            <div class="detail-item">
                <strong>จำนวนใบหน้าที่พบ:</strong> ${result.faces.length}
            </div>
            <div class="detail-item">
                <strong>คุณภาพภาพ:</strong> ${this.getQualityLabel(this.assessImageQuality(this.previewImage))}
            </div>
        `;
    }

    getQualityLabel(quality) {
        if (quality >= 0.8) return 'ดีมาก';
        if (quality >= 0.6) return 'ดี';
        if (quality >= 0.4) return 'ปานกลาง';
        return 'ต้องปรับปรุง';
    }

    drawAnalysisOverlay(result, img) {
        const overlay = document.getElementById('analysisOverlay');
        overlay.innerHTML = '';
        
        if (!this.settings.showBoundingBox && !this.settings.showLandmarks) {
            return;
        }
        
        const rect = this.previewImage.getBoundingClientRect();
        const scaleX = rect.width / img.width;
        const scaleY = rect.height / img.height;
        
        result.faces.forEach(face => {
            const box = face.box || face.boundingBox;
            if (box && this.settings.showBoundingBox) {
                const boxElement = document.createElement('div');
                boxElement.className = 'bounding-box';
                boxElement.style.left = `${box.xMin * scaleX}px`;
                boxElement.style.top = `${box.yMin * scaleY}px`;
                boxElement.style.width = `${box.width * scaleX}px`;
                boxElement.style.height = `${box.height * scaleY}px`;
                overlay.appendChild(boxElement);
            }
            
            if (face.keypoints && this.settings.showLandmarks) {
                face.keypoints.forEach(point => {
                    const pointElement = document.createElement('div');
                    pointElement.className = 'landmark-point';
                    pointElement.style.left = `${point.x * scaleX}px`;
                    pointElement.style.top = `${point.y * scaleY}px`;
                    overlay.appendChild(pointElement);
                });
            }
        });
    }

    playSound(result) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = result === 'มนุษย์' ? 800 : 400;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    toggleSettings() {
        this.settingsContent.style.display = 
            this.settingsContent.style.display === 'none' ? 'block' : 'none';
    }

    resetToUpload() {
        this.analysisSection.style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
        document.querySelector('.model-selection').style.display = 'block';
        this.fileInput.value = '';
    }

    downloadResult() {
        const link = document.createElement('a');
        link.download = `face-detection-result-${Date.now()}.jpg`;
        link.href = this.previewImage.src;
        link.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdvancedFaceDetection();
});