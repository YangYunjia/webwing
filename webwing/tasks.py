import time
from utils.log_config import setup_logger

from celery import Celery
from celery.signals import worker_process_init
from flowvae.app.wing.api import Wing_api

celery_app = Celery("tasks")
celery_app.config_from_object({
    'broker_url': 'redis://localhost:6379/0',
    'result_backend': 'redis://localhost:6379/0',
    'task_serializer': 'json',
    'result_serializer': 'json',
    'accept_content': ['json'],
    'timezone': 'UTC',
    'result_expires': 3600,
    'worker_concurrency': 1  # only one GPU
})

worker_logger = setup_logger("worker", "worker.log")
# 模型只初始化一次
wing_api = None

@worker_process_init.connect
def init_wing_api(**kwargs):
    """
    initialize CUDA only at the initialization
    """
    global wing_api
    wing_api = Wing_api(saves_folder='../../saves', device='default')

@celery_app.task
def predict_wing_flowfield(data):
    try:
        worker_logger.info(f"[START] New prediction task received")

        start_time = time.time()
        results = wing_api.end2end_predict(data)
        duration = time.time() - start_time

        worker_logger.info(f"[DONE] Task completed in {duration:.2f}s")
        return results
    
    except Exception as e:
        worker_logger.exception(f"[ERROR] Prediction failed: {e}")
        return {"error": str(e)}