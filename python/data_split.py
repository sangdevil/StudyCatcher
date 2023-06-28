import os
import random
import csv


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
csv_dir = os.path.join(root_dir, "label_csv")


train_result = []
valid_result = []
test_result = []

valid_idx = 6
test_idx = 0

for x,y in input_dirs.items():
    for input_dir in y:
        if (x==valid_idx):
            csv_file = open(os.path.join(csv_dir, f"{identities[x]}_{input_dir}.csv"), 'r')
            rea = csv.reader(csv_file)
            for row in rea:
                valid_result.append(row)
            csv_file.close()
        elif (x==test_idx):
            csv_file = open(os.path.join(csv_dir, f"{identities[x]}_{input_dir}.csv"), 'r')
            rea = csv.reader(csv_file)
            for row in rea:
                test_result.append(row)
            csv_file.close()
        else:
            csv_file = open(os.path.join(csv_dir, f"{identities[x]}_{input_dir}.csv"), 'r')
            rea = csv.reader(csv_file)
            for row in rea:
                train_result.append(row)
            csv_file.close()

# shuffle 
random.seed('12345')
random.shuffle(train_result)
random.shuffle(valid_result)

# generate csv annotation
csv_file = open(os.path.join(csv_dir, "train.csv"), 'w')
for item in train_result:
    csv_file.write(item[0] + "\n")
csv_file.close()

csv_file = open(os.path.join(csv_dir, "test.csv"), 'w')
for item in test_result:
    csv_file.write(item[0] + "\n")
csv_file.close()

csv_file = open(os.path.join(csv_dir, "val.csv"), 'w')
for item in valid_result:
    csv_file.write(item[0] + "\n")
csv_file.close()