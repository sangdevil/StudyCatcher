
from PIL import Image
from io import BytesIO
import base64

from deepface import DeepFace  # pip install deepface
from flask import Flask, make_response, request, jsonify
from flask_cors import CORS
import base64
import os
import time
from collections import OrderedDict
import multiprocessing
from multiprocessing import Queue, Value
import numpy as np
import cv2
from inference import *
import mediapipe as mp
from deepface import DeepFace
import torch
import torch.backends.cudnn as cudnn
from timm.models import create_model

import utils
import modeling_finetune
import video_transforms as video_transforms
import volume_transforms as volume_transforms
import cv2
import time
import numpy as np

base_human = None

app = Flask(__name__)
CORS(app)


@app.route('/api/create-human/', methods=['POST', 'OPTIONS'])
def handle_create_human():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    else:
        return create_human()


@app.route('/api/create-human', methods=['POST'])
def create_human():
    global base_human
    img1 = request.json['image']
    img1 = img1.split(',')[1]
    img1 = Image.open(BytesIO(base64.b64decode(img1)))
    base_human = img1
    img1.save("base_face_img.jpg", "JPEG")
    # Check if image contains human face(s)
    try:
        detected_faces = DeepFace.extract_faces("base_face_img.jpg")
        # Determine number of detected faces
        num_faces = len(detected_faces)
        if num_faces == 1:
            state = "정상입니다."
        else:
            state = "얼굴 여러 개 감지"
    except ValueError as e:
        print(e.args[0])
        if (e.args[0].startswith("Face")):
            state = "얼굴 미감지"


    response = jsonify({'result': state})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    return response


@app.route('/api/compare-human', methods=['POST'])
def compare_human():
    print()
    # img1 에서는 항상 얼굴이 있는 파일만 준다.
    img1 = request.json['img1']
    img1 = img1.split(',')[1]
    img1 = Image.open(BytesIO(base64.b64decode(img1)))
    img1 = img1.convert('RGB')
    img1.save("image1.jpg", "JPEG")
    if 'img2' in request.json:
        img2 = request.json['img2']
        img2 = img2.split(',')[1]
        img2 = Image.open(BytesIO(base64.b64decode(img2)))
        img2 = img2.convert('RGB')
        img2.save("image2.jpg", "JPEG")    
    models = ["SFace"]
    try:
        result = DeepFace.verify(img1_path = "image1.jpg",
                                 img2_path="base_face_img.jpg",  # 2번 이미지
                                 model_name=models[0],  # SFace 사용
                                 distance_metric="cosine",
                                 enforce_detection=True)
        
        threshHold = 0.7
        print(result)
        
        if result['distance'] < 0.7:
            state = '정상'
        else:
            state = '다른 사람'

    except ValueError as e:

        if 'Face' in e.args[0]:
            state = '얼굴 미감지'
        else:
            return jsonify({'error': 'ValueError 발생'})

    response = jsonify({'result': state})

    response.headers.add('Access-Control-Allow-Origin', '*')

    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    print(response)
    return response



@app.route('/api/study-human', methods=['POST'])
def study_human():
    images = request.json['imgList']
    frames = []
    for img in images:
        img = img.split(',')[1]
        img = Image.open(BytesIO(base64.b64decode(img)))
        img = img.convert('RGB')
        frames.append(np.array(img))  # 이미지를 numpy 배열로 변환하여 frames 리스트에 추가합니다.
    state = processing(frames)  # frames를 processing 함수에 전달합니다.
    response = jsonify({'result': state})

    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')

    return response


def processing(frames):
    buffer = np.array(frames)  # list를 numpy 배열로 변환합니다.
    num_frames = buffer.shape[0]  # Get the number of frames
    height, width, channels = buffer[0].shape  # Get the shape of the first frame
    keypoints = detect_keypoints(buffer)
    heatmap = generate_batch_heatmap(keypoints, height, width)
    buffer = data_transform(buffer)
    buffer = normalize(buffer)
    heatmap = heatmap.detach().cpu().numpy()
    heatmap = np.transpose(heatmap, (0, 2, 3, 1))
    heatmap = heatmap_transform(heatmap)
    buffer = torch.cat([buffer, heatmap], dim=0)
    buffer = buffer.unsqueeze(0)

    outputs = []
    with torch.no_grad():
        output = MODELS[0](buffer)
        outputs.append(output.unsqueeze(0))

    outputs = torch.cat(outputs, dim=0)
    output = torch.mean(outputs, dim=0)
    idx = output.argmax(-1).item()
    return classes[idx]