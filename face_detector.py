import cv2
import numpy as np
from PIL import Image
import os

class FaceDetectionSystem:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
    def analyze_image(self, image_path):
        try:
            img = cv2.imread(image_path)
            if img is None:
                return "วัตถุ"
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                return "วัตถุ"
            
            largest_face = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest_face
            
            face_roi = gray[y:y+h, x:x+w]
            
            image_quality = self._assess_image_quality(gray)
            if image_quality < 0.3:
                return "วัตถุ"
            
            face_clarity = self._assess_face_clarity(face_roi)
            if face_clarity < 0.4:
                return "วัตถุ"
            
            eyes = self.eye_cascade.detectMultiScale(face_roi, 1.1, 3)
            if len(eyes) < 1:
                return "วัตถุ"
            
            face_size_ratio = (w * h) / (img.shape[0] * img.shape[1])
            if face_size_ratio < 0.05:
                return "วัตถุ"
            
            return "มนุษย์"
            
        except Exception as e:
            return "วัตถุ"
    
    def _assess_image_quality(self, gray_image):
        blur_score = cv2.Laplacian(gray_image, cv2.CV_64F).var()
        normalized_blur = min(blur_score / 1000.0, 1.0)
        return normalized_blur
    
    def _assess_face_clarity(self, face_roi):
        if face_roi.size == 0:
            return 0
        
        brightness = np.mean(face_roi)
        contrast = np.std(face_roi)
        
        brightness_score = 1.0 if 50 <= brightness <= 200 else 0.3
        contrast_score = min(contrast / 50.0, 1.0)
        
        return (brightness_score + contrast_score) / 2.0

def main():
    system = FaceDetectionSystem()
    
    print("Face Detection System")
    print("Enter image path or 'quit' to exit:")
    
    while True:
        image_path = input("Image path: ").strip()
        
        if image_path.lower() == 'quit':
            break
            
        if not os.path.exists(image_path):
            print("วัตถุ")
            continue
            
        result = system.analyze_image(image_path)
        print(result)

if __name__ == "__main__":
    main()