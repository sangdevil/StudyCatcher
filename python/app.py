
from PIL import Image
from io import BytesIO
import base64

from deepface import DeepFace  # pip install deepface
from flask import Flask, make_response, request, jsonify
from flask_cors import CORS
import base64


app = Flask(__name__)
CORS(app)


@app.route('/create-human/', methods=['POST', 'OPTIONS'])
def handle_create_human():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    else:
        return create_human()


@app.route('/create-human', methods=['POST'])
def create_human():
    img1 = request.json['image']
    img1 = img1.split(',')[1]
    img1 = Image.open(BytesIO(base64.b64decode(img1)))
    img1.save("image.jpg", "JPEG")
    # Check if image contains human face(s)
    try:
        detected_faces = DeepFace.extract_faces("image.jpg")
    except ValueError as e:
        if (e.args[0].startswith("Face")):
            state = "얼굴 미감지"
    else:
        # Determine number of detected faces
        num_faces = len(detected_faces)
        if num_faces == 1:
            state = "정상입니다."
        else:
            state = "얼굴 여러 개 감지"

    response = jsonify({'result': state})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')

    return response


@app.route('/compare-human', methods=['POST'])
def compare_human():
    # img1 에서는 항상 얼굴이 있는 파일만 준다.

    img1 = request.json['img1']
    img1 = img1.split(',')[1]
    img1 = Image.open(BytesIO(base64.b64decode(img1)))
    img1.save("image1.jpg", "JPEG")

    img2 = request.json['img2']
    img2 = img2.split(',')[1]
    img2 = Image.open(BytesIO(base64.b64decode(img2)))
    img2.save("image2.jpg", "JPEG")

    models = ["SFace"]
    try:
        result = DeepFace.verify(img1_path="image1.jpg",  # 1번 이미지
                                 img2_path="image2.jpg",  # 2번 이미지
                                 model_name=models[0],  # SFace 사용
                                 distance_metric="euclidean_l2",
                                 enforce_detection=True)
        same_people = result['verified']

        state = '정상' if same_people else '다른 사람'
    except ValueError as e:

        if 'Face' in e.args[0]:
            state = '얼굴 미감지'
        else:
            return jsonify({'error': 'ValueError 발생'})

    response = jsonify({'result': state})

    response.headers.add('Access-Control-Allow-Origin', '*')

    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')

    return response
