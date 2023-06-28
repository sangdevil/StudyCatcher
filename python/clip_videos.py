import os
import json
import ffmpeg
from tqdm import tqdm


classes = {'concentrating': 0, 'absence': 1, 'sleep': 2, 'phone': 3}
identities = {0: 'alba', 1: 'alba2', 2: 'daehwan', 3: 'hana', 4: 'sungho', 5: 'sunwoo', 6: 'terry'}

root_dir = 'data'
input_dirs = {
    0: ['20230210_1', '20230210_2'],
    1: ['20230317_1', '20230317_2'],
    2: ['20230207_1', '20230207_2'],
    3: ['20230210_1', '20230210_2'],
    4: ['20230209_1', '20230209_2'],
    5: ['20230207_1', '20230207_2'],
    6: ['20230207_1', '20230207_2', '20230207_3']
}
output_video_dir = os.path.join(root_dir, "Data")
csv_dir = os.path.join(root_dir, "label_csv")
os.makedirs(output_video_dir, exist_ok=True)
os.makedirs(csv_dir, exist_ok=True)


# trim videos for 3~4 seconds and by class
def trim_video(idx, target_identity, input_json_file, input_video_path, output_video_dir):
    with open(input_json_file) as f:
        jf = json.load(f)

    result_info = []

    # sort by time
    info = dict()
    for target_class in jf:
        class_index = classes[target_class]
        for item in jf[target_class]:
            item['class'] = class_index
            info[item['interval']] = item
    
    for key in tqdm(sorted(info)):
        value = info[key]
        start = value['start_time']['minute'] * 60 + value['start_time']['second']
        length = value['length']['minute'] * 60 + value['length']['second']
        class_index = value['class']
        while length > 0:
            if (length < 5):
                duration = length
            elif (8 <= length < 9):
                duration = 4
            else:
                duration=3

            output_video_path = os.path.join(output_video_dir, f'{idx}.mp4')
            input_stream = ffmpeg.input(input_video_path)
            (
                input_stream.video
                .filter('fps', fps=12, round='up')
                .trim(start=start, duration=duration)
                .setpts('PTS-STARTPTS')
                .filter('scale', 320, -1)
                .output(output_video_path, loglevel="quiet")
                .run()
            )

            idx += 1
            start += duration
            length -= duration

            result_info.append(output_video_path + f' {class_index} {target_identity}')

    return result_info

idx = 0
total_result = []

for x,y in input_dirs.items():
    for input_dir in y:

        input_json_file = os.path.join(root_dir, f'Data_{identities[x]}', input_dir, 'interval_info.json')
        input_video_path = os.path.join(root_dir, f'Data_{identities[x]}', input_dir, 'concentrate.mp4')

        print(os.path.join(root_dir, f'Data_{identities[x]}', input_dir))
        result = trim_video(idx, x, input_json_file, input_video_path, output_video_dir)
        idx += len(result)
        total_result += result
        print(len(result))

        # generate csv annotation
        csv_file = open(os.path.join(csv_dir, f"{identities[x]}_{input_dir}.csv"), 'w')
        for item in result:
            csv_file.write(item + "\n")
        csv_file.close()