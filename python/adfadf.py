import os
import time
from collections import OrderedDict
import multiprocessing
from multiprocessing import Queue, Value
import numpy as np
import cv2

import mediapipe as mp
from deepface import DeepFace
import torch
import torch.backends.cudnn as cudnn
from timm.models import create_model

import utils
import video_transforms as video_transforms
import volume_transforms as volume_transforms
import cv2
import time
import numpy as np

classes = ("concentrating", "absence", "sleep", "phone")
total_res = []
## Mediapipe
mp_pose = mp.solutions.pose
POSE = mp_pose.Pose(
    min_tracking_confidence=0.5,
    model_complexity=2,
    min_detection_confidence=0.5,
    enable_segmentation=True
)
mp_face_detection = mp.solutions.face_detection
FACE_DETECTION = mp_face_detection.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.5
)

## Model for action classification
NUM_JOINTS = 23
SIGMA = 7.0
size = 6*SIGMA + 3
x = np.arange(0, size, 1, float)
y = x[:, np.newaxis]
x0, y0 = 3*SIGMA + 1, 3*SIGMA + 1
HEATMAP_G = np.exp(- ((x - x0) ** 2 + (y - y0) ** 2) / (2 * SIGMA ** 2))

data_transform = video_transforms.Compose([
    video_transforms.Resize(224, interpolation='bilinear'),
    video_transforms.CenterCrop(size=(224, 224)),
    volume_transforms.ClipToTensor()
])
heatmap_transform = video_transforms.Compose([
    video_transforms.Resize(224, interpolation='bilinear'),
    video_transforms.CenterCrop(size=(224, 224)),
    volume_transforms.ClipToTensor(channel_nb=NUM_JOINTS)
])

normalize = video_transforms.Compose([
    video_transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                std=[0.229, 0.224, 0.225])
])

cudnn.benchmark = True

MODELS = []

for i in range(1):
    model = create_model(
        "vit_base_patch16_224",
        pretrained=False,
        num_classes=4,
        drop_path_rate=0.1,
        drop_block_rate=None,
        init_scale=0.001
    )

    checkpoint = torch.load(os.path.join("DreamLadders\checkpoints", f"valid_{i}.pth"), map_location='cpu')

    if "model" in checkpoint:
        checkpoint_model=checkpoint["model"]
    elif "module" in checkpoint:
        checkpoint_model=checkpoint["module"]
    else:
        checkpoint_model=checkpoint

    state_dict = model.state_dict()
    for k in ['head.weight', 'head.bias']:
        if k in checkpoint_model and checkpoint_model[k].shape != state_dict[k].shape:
            print(f"Removing key {k} from pretrained checkpoint")
            del checkpoint_model[k]

    all_keys = list(checkpoint_model.keys())
    new_dict = OrderedDict()
    for key in all_keys:
        if key.startswith('backbone.'):
            new_dict[key[9:]] = checkpoint_model[key]
        elif key.startswith('encoder.'):
            new_dict[key[8:]] = checkpoint_model[key]
        else:
            new_dict[key] = checkpoint_model[key]
    checkpoint_model = new_dict

    # interpolate position embedding
    if 'pos_embed' in checkpoint_model:
        pos_embed_checkpoint = checkpoint_model['pos_embed']
        embedding_size = pos_embed_checkpoint.shape[-1] # channel dim
        num_patches = model.patch_embed.num_patches # 
        num_extra_tokens = model.pos_embed.shape[-2] - num_patches # 0/1

        # height (== width) for the checkpoint position embedding 
        orig_size = int(((pos_embed_checkpoint.shape[-2] - num_extra_tokens)//(16 // model.patch_embed.tubelet_size)) ** 0.5)
        # height (== width) for the new position embedding
        new_size = int((num_patches // (16 // model.patch_embed.tubelet_size) )** 0.5)
        # class_token and dist_token are kept unchanged
        if orig_size != new_size:
            print("Position interpolate from %dx%d to %dx%d" % (orig_size, orig_size, new_size, new_size))
            extra_tokens = pos_embed_checkpoint[:, :num_extra_tokens]
            # only the position tokens are interpolated
            pos_tokens = pos_embed_checkpoint[:, num_extra_tokens:]
            # B, L, C -> BT, H, W, C -> BT, C, H, W
            pos_tokens = pos_tokens.reshape(-1, 16 // model.patch_embed.tubelet_size, orig_size, orig_size, embedding_size)
            pos_tokens = pos_tokens.reshape(-1, orig_size, orig_size, embedding_size).permute(0, 3, 1, 2)
            pos_tokens = torch.nn.functional.interpolate(
                pos_tokens, size=(new_size, new_size), mode='bicubic', align_corners=False)
            # BT, C, H, W -> BT, H, W, C ->  B, T, H, W, C
            pos_tokens = pos_tokens.permute(0, 2, 3, 1).reshape(-1, 16 // model.patch_embed.tubelet_size, new_size, new_size, embedding_size) 
            pos_tokens = pos_tokens.flatten(1, 3) # B, L, C
            new_pos_embed = torch.cat((extra_tokens, pos_tokens), dim=1)
            checkpoint_model['pos_embed'] = new_pos_embed

    utils.load_state_dict(model, checkpoint_model, prefix="")
    model.to("cpu")
    model.eval()

    MODELS.append(model)
## Model for action classification


def sample_frame_indices(clip_len, frame_sample_rate, seg_len):
    converted_len = int(clip_len * frame_sample_rate)
    end_idx = np.random.randint(converted_len, seg_len)
    str_idx = end_idx - converted_len
    index = np.linspace(str_idx, end_idx, num=clip_len)
    index = np.clip(index, str_idx, end_idx - 1).astype(np.int64)

    return index


def generate_batch_heatmap(keypoints, height, width):
    batch_size, _, _ = keypoints.shape
    heatmap = torch.zeros((batch_size, NUM_JOINTS, height, width), dtype=torch.float32)

    for batch_idx, joints in enumerate(keypoints):
        for joint_idx, pts in enumerate(joints):
            x, y, visibility = pts

            if visibility < 0.2:
                continue
            
            ul = int(np.round(x - 3 * SIGMA - 1)), int(np.round(y - 3 * SIGMA - 1))
            br = int(np.round(x + 3 * SIGMA + 2)), int(np.round(y + 3 * SIGMA + 2))

            c, d = max(0, -ul[0]), min(br[0], width) - ul[0]
            a, b = max(0, -ul[1]), min(br[1], height) - ul[1]

            cc, dd = max(0, ul[0]), min(br[0], width)
            aa, bb = max(0, ul[1]), min(br[1], height)

            heatmap[batch_idx, joint_idx, aa:bb, cc:dd] = np.maximum(
                heatmap[batch_idx, joint_idx, aa:bb, cc:dd], HEATMAP_G[a:b, c:d]
            )

    return heatmap


def detect_keypoints(video):
    batch_size, image_height, image_width, _ = video.shape

    coords = np.zeros((batch_size, NUM_JOINTS, 3))

    for img_idx, img in enumerate(video):
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = POSE.process(img)

        if not results.pose_landmarks:
            continue
        
        pose_landmarks = results.pose_landmarks.landmark
        
        for joint_idx in range(NUM_JOINTS):
            x = int(pose_landmarks[joint_idx].x * image_width)
            y = int(pose_landmarks[joint_idx].y * image_height)

            if x <=0 or y<=0 or x>=image_width or y>=image_height:
                continue

            coords[img_idx, joint_idx] = [x, y, pose_landmarks[joint_idx].visibility]

    return coords



def run_classification(frames):
    print('[classification] classification starts')

    start_time = time.time()

    buffer = np.array(frames)  # list를 numpy 배열로 변환합니다.
    
    a, height, width, b = buffer.shape
    keypoints = detect_keypoints(buffer)
    heatmap = generate_batch_heatmap(keypoints, height, width)
    print("heatmap", time.time() - start_time)
    buffer = data_transform(buffer)
    buffer = normalize(buffer)
    heatmap = heatmap.detach().cpu().numpy()
    heatmap = np.transpose(heatmap, (0, 2, 3, 1))
    heatmap = heatmap_transform(heatmap)
    buffer = torch.cat([buffer, heatmap], dim=0)
    buffer = buffer.unsqueeze(0)
    print("heatmap done", time.time() - start_time)

    outputs = []
    with torch.no_grad():
        output = MODELS[0](buffer)
        outputs.append(output.unsqueeze(0))
    print("no grad", time.time() - start_time)

    outputs = torch.cat(outputs, dim=0)
    output = torch.mean(outputs, dim=0)
    idx = output.argmax(-1).item()
    print(f'class: {classes[idx]}')
    print(f'[classification] elapsed time: {time.time()-start_time}')
    return classes[idx]


cap = cv2.VideoCapture(0)

# 3/16초 마다 한 번 캡처하도록 설정.
delay = 3/16

frames = []
start_time = time.time()

while True:
    # 웹캠에서 프레임을 읽는다.
    ret, frame = cap.read()
    # 읽기에 실패했다면 루프를 종료한다.
    if not ret:
        break

    center = (frame.shape[1] // 2, frame.shape[0] // 2)  # (frame_width // 2, frame_height // 2)
    frame = cv2.getRectSubPix(frame, (480, 480), center)

    # 잘라낸 프레임을 224x224로 리사이즈한다.
    frame = cv2.resize(frame, (224, 224))

    # 읽은 프레임을 frames에 추가한다.
    frames.append(frame)

    # 3초가 지났고, frames의 길이가 16이라면 분류를 실행한다.
    if time.time() - start_time >= 3 and len(frames) == 16:
        print(time.time() - start_time)
        run_classification(frames)
        frames = []
        start_time = time.time()

    # delay 후 다음 프레임을 읽는다.
    time.sleep(delay)

# 웹캠을 해제한다.
cap.release()