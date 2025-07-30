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
    'worker_concurrency': 1  # 只允许1个GPU任务并发
})

# 模型只初始化一次
wing_api = None

@worker_process_init.connect
def init_wing_api(**kwargs):
    """在每个 worker 子进程初始化时设置 CUDA"""
    global wing_api
    wing_api = Wing_api(saves_folder='../../saves', device='default')  # GPU 初始化

@celery_app.task
def predict_wing_flowfield(data):
    try:
        inputs = data['conditions'] + data['planform'] + [data['t']] + data['cstu'] + data['cstl']
        wg = wing_api.predict(inputs)
        wg.aero_force()
        cl_array = wg.cl
        surfaceField = wg.get_formatted_surface().transpose(2, 0, 1)
        return {
            "geom": surfaceField[:3].tolist(),
            "value": surfaceField[3:].tolist(),
            "cl_array": cl_array.tolist()
        }
    except Exception as e:
        return {"error": str(e)}