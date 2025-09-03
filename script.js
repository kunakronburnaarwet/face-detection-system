class FaceDetector {
    constructor() {
        this.detector = null;
        this.initializeElements();
        this.setupEventListeners();
        this.loadModel();
    }

    initializeElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.cameraBtn = document.getElementById('cameraBtn');
        this.camera = document.getElementById('camera');
        this.captureBtn = document.getElementById('captureBtn');
        this.resultSection = document.getElementById('resultSection');
        this.previewImage = document.getElementById('previewImage');
        this.result = document.getElementById('result');
        this.resetBtn = document.getElementById('resetBtn');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    setupEventListeners() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.cameraBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.captureImage());
        this.resetBtn.addEventListener('click', () => this.reset());

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
    }

    async loadModel() {
        try {
            this.detector = await faceDetection.createDetector(
                faceDetection.SupportedModels.MediaPipeFaceDetector,
                {
                    runtime: 'tfjs',
                    maxFaces: 1
                }
            );
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processImage(file);
        }
    }

    async processImage(file) {
        if (!this.detector) {
            await this.loadModel();
        }

        const img = new Image();
        img.onload = async () => {
            this.previewImage.src = img.src;
            this.showResultSection();
            
            const result = await this.analyzeImage(img);
            this.showResult(result);
        };
        img.src = URL.createObjectURL(file);
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' } 
            });
            this.camera.srcObject = stream;
            this.camera.style.display = 'block';
            this.captureBtn.style.display = 'block';
            this.cameraBtn.style.display = 'none';
        } catch (error) {
            console.error('Camera error:', error);
        }
    }

    captureImage() {
        this.canvas.width = this.camera.videoWidth;
        this.canvas.height = this.camera.videoHeight;
        this.ctx.drawImage(this.camera, 0, 0);
        
        this.canvas.toBlob(async (blob) => {
            await this.processImage(blob);
            this.stopCamera();
        });
    }

    stopCamera() {
        const stream = this.camera.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
        this.camera.style.display = 'none';
        this.captureBtn.style.display = 'none';
        this.cameraBtn.style.display = 'block';
    }

    async analyzeImage(img) {
        try {
            const faces = await this.detector.estimateFaces(img);
            
            if (faces.length === 0) {
                return "วัตถุ";
            }

            const face = faces[0];
            
            const imageQuality = this.checkImageQuality(img);
            if (imageQuality < 0.3) {
                return "วัตถุ";
            }

            const faceQuality = this.checkFaceQuality(face);
            if (faceQuality < 0.6) {
                return "วัตถุ";
            }

            const faceSize = this.checkFaceSize(face, img);
            if (faceSize < 0.05) {
                return "วัตถุ";
            }

            return "มนุษย์";
            
        } catch (error) {
            console.error('Analysis error:', error);
            return "วัตถุ";
        }
    }

    checkImageQuality(img) {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        
        const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
        }
        
        const avgBrightness = totalBrightness / (data.length / 4);
        
        if (avgBrightness < 30 || avgBrightness > 225) {
            return 0.2;
        }
        
        return Math.min(avgBrightness / 150, 1.0);
    }

    checkFaceQuality(face) {
        const confidence = face.score || 0.5;
        const keypoints = face.keypoints || [];
        
        if (confidence < 0.8) {
            return 0.3;
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

    checkFaceSize(face, img) {
        const box = face.box;
        const faceArea = box.width * box.height;
        const imageArea = img.width * img.height;
        return faceArea / imageArea;
    }

    showResultSection() {
        this.uploadArea.style.display = 'none';
        this.cameraBtn.style.display = 'none';
        this.resultSection.style.display = 'block';
    }

    showResult(result) {
        this.result.textContent = result;
        this.result.className = `result ${result === 'มนุษย์' ? 'human' : 'object'}`;
    }

    reset() {
        this.uploadArea.style.display = 'block';
        this.cameraBtn.style.display = 'block';
        this.resultSection.style.display = 'none';
        this.fileInput.value = '';
        this.stopCamera();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FaceDetector();
});