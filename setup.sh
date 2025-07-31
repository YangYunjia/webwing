pip install einops numpy scipy tqdm

pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

pip install flask
pip install fastapi celery redis uvicorn
sudo apt install git

mkdir repos

cd repos/

git clone https://github.com/YangYunjia/cst-modeling3d.git
git clone https://github.com/YangYunjia/cfdpost.git
git clone https://github.com/YangYunjia/floGen.git

cd cst-modeling3d/ && pip install . && cd ..
cd cfdpost/ && pip install . && cd ..
cd floGen/ && pip install . && cd ..

cd ..

git clone https://github.com/YangYunjia/webwing.git -b dev


sudo apt install nginx certbot python3-certbot-nginx
sudo apt install redis-server

sudo systemctl start redis

# sudo systemctl status redis

celery -A tasks worker --loglevel=warning

sudo apt install uvicorn
