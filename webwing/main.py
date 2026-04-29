from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from utils.log_config import setup_logger
from tasks import predict_wing_flowfield, celery_app

from celery.result import AsyncResult
import redis

from utils import _extract_user_guide_section, HourlyTrafficStats

from pydantic import BaseModel
class PredictRequest(BaseModel):
    '''
    Type define for json request, must-have for FastAPI
    '''
    ver: str
    inputs: dict

MAX_QUEUE_LENGTH = 5

api_logger = setup_logger("api", 'api.log')
traffic_logger = setup_logger("traffic_stats", "traffic_stats.log")

app = FastAPI()
templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

redis_conn = redis.StrictRedis(host="localhost", port=6379, db=0)
traffic_stats = HourlyTrafficStats(redis_conn=redis_conn, traffic_logger=traffic_logger, api_logger=api_logger)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    traffic_stats.record_home_visit()
    api_logger.info("Page loaded: /")
    return templates.TemplateResponse("index_tailwind.html", {"request": request})

@app.post("/predict_wing_flowfield")
async def predict(data: PredictRequest):
    try:
        queue_length = redis_conn.llen("celery")
        api_logger.info(f"Prediction request received, queue length = {queue_length}")
        if queue_length >= MAX_QUEUE_LENGTH:
            api_logger.warning(f"Prediction request refused cause reaching MAX_QUEUE_LENGTH = {MAX_QUEUE_LENGTH}")
            return JSONResponse(
                status_code=429,
                content={"error": "Server is busy. Try again later"}
            )
        task = predict_wing_flowfield.delay(data.model_dump())
        api_logger.info(f"Prediction request received: Task_id = {task.id}")
        return {"task_id": task.id}
    except Exception as exc:
        api_logger.exception("Failed to enqueue prediction task: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "Prediction service unavailable. Please retry later."},
        )

@app.get("/result/{task_id}")
async def get_result(task_id: str):
    task = AsyncResult(task_id, app=celery_app)
    if task.state == "PENDING":
        api_logger.warning(f"[Pending] querying result for task_id={task_id}")
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"state": task.state, "error": str(task.info)})
    elif task.state == "SUCCESS":
        traffic_stats.record_task_result(task_id, is_success=True)
        api_logger.info(f"[Success] querying result for task_id={task_id}")
        return task.result
    else:
        traffic_stats.record_task_result(task_id, is_success=False)
        api_logger.error(f"[ Error ] querying result for task_id={task_id} : {str(task.info)}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"state": task.state, "error": str(task.info)})

@app.get("/config")
def config():
    return {"mode": "server"}

@app.get("/user_guide")
async def user_guide():
    try:
        section_text = _extract_user_guide_section()
    except OSError as exc:
        api_logger.error("Failed to load README.md: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "Failed to load user guide"},
        )
    return {"content": section_text}