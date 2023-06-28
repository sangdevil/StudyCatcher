# Set the path to save checkpoints
OUTPUT_DIR='/home/elicer/hdd1/VideoMAE/output/ensemble'
# path to SSV2 annotation file (train.csv/val.csv/test.csv)
DATA_PATH='/home/elicer/hdd1/DreamLadders/label_csv'
# path to pretrain model
MODEL_PATH='/home/elicer/hdd1/VideoMAE/pretrained/K400/finetune/K400_ViTB_1600.pth'
# MODEL_PATH='/home/elicer/hdd1/VideoMAE/pretrained/SSV2/finetune/SSV2_ViTB_2400.pth'

# batch_size can be adjusted according to number of GPUs
# this script is for 32 GPUs (4 nodes x 8 GPUs)
# OMP_NUM_THREADS=1 python -m torch.distributed.launch --nproc_per_node=1 \
#     run_class_finetuning.py \
#     --model vit_base_patch16_224 \
#     --data_set DreamLadders \
#     --nb_classes 4 \
#     --data_path ${DATA_PATH} \
#     --finetune ${MODEL_PATH} \
#     --log_dir ${OUTPUT_DIR} \
#     --output_dir ${OUTPUT_DIR} \
#     --batch_size 6 \
#     --num_sample 2 \
#     --input_size 224 \
#     --short_side_size 224 \
#     --save_ckpt_freq 10 \
#     --num_frames 16 \
#     --opt adamw \
#     --lr 1e-3 \
#     --layer_decay 0.7 \
#     --opt_betas 0.9 0.999 \
#     --weight_decay 0.05 \
#     --epochs 40 \
#     --test_num_segment 2 \
#     --test_num_crop 3 \
#     --dist_eval \
#     --enable_deepspeed 

python test_ensemble.py \
    --model vit_base_patch16_224 \
    --data_set DreamLadders \
    --nb_classes 4 \
    --data_path ${DATA_PATH} \
    --finetune ${MODEL_PATH} \
    --log_dir ${OUTPUT_DIR} \
    --output_dir ${OUTPUT_DIR} \
    --batch_size 2 \
    --num_sample 2 \
    --input_size 224 \
    --short_side_size 224 \
    --save_ckpt_freq 10 \
    --num_frames 16 \
    --opt adamw \
    --lr 1e-3 \
    --layer_decay 0.7 \
    --opt_betas 0.9 0.999 \
    --weight_decay 0.05 \
    --epochs 30 \
    --test_num_segment 2 \
    --test_num_crop 3 \
    --eval \
    --dist_eval