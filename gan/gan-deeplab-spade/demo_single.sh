#!/bin/sh
python demo_spade.py single -i capture_screen.png -c cocostuff164k.yaml -m deeplab-pytorch/data/models/deeplabv2_resnet101_msc-cocostuff164k-100000.pth --dataset_mode coco --dataroot SPADE/datasets/coco_stuff/ --checkpoints_dir ./SPADE/checkpoints --exp_name coco_pretrained