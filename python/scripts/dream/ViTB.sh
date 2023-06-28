# Set the path to save checkpoints
OUTPUT_DIR='results'
# path to SSV2 annotation file (train.csv/val.csv/test.csv)
DATA_PATH='data/label_csv'
# path to pretrain model
MODEL_PATH='pretrained/K400_ViTS_1600.pth'

python run_class_finetuning.py \
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
    --dist_eval