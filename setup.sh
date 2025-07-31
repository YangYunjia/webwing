#!/bin/bash

# install git
if ! command -v git &> /dev/null; then
    sudo apt update
    sudo apt install -y git
else
    echo "git 已安装，跳过安装。"
fi

# install prerequirements
pip install einops numpy scipy tqdm
pip install flask

# MUST CHANGE TO CORRECT CUDA VERSION 
pip3 install torch --index-url https://download.pytorch.org/whl/cu118

# download git repos
mkdir -p repos
cd repos/
git clone https://github.com/YangYunjia/cst-modeling3d.git
git clone https://github.com/YangYunjia/cfdpost.git
git clone https://github.com/YangYunjia/floGen.git
pip install -e ./repos/cst-modeling3d
pip install -e ./repos/cfdpost
pip install -e ./repos/floGen
cd ..

# clone main project
# git clone https://github.com/YangYunjia/webwing.git -b dev
