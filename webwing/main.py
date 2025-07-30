from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from utils.models import WingInput
from utils.log_config import setup_logger
from tasks import predict_wing_flowfield, celery_app

from celery.result import AsyncResult
import redis

MAX_QUEUE_LENGTH = 5

api_logger = setup_logger("api", 'api.log')

app = FastAPI()
templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

# # 可选：允许跨域访问（开发调试用）
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

redis_conn = redis.StrictRedis(host="localhost", port=6379, db=0)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    api_logger.info("Page loaded: /")
    return templates.TemplateResponse("index_tailwind.html", {"request": request})

@app.post("/predict_wing_flowfield")
async def predict(data: WingInput):
    queue_length = redis_conn.llen("celery")

    if queue_length >= MAX_QUEUE_LENGTH:
        api_logger.warning(f"Prediction request refused cause reaching MAX_QUEUE_LENGTH = {MAX_QUEUE_LENGTH}")
        return JSONResponse(
            status_code=429,
            content={"error": "Server is busy. Try again later"}
        )
    
    task = predict_wing_flowfield.delay(data.model_dump())
    api_logger.info(f"Prediction request received: Task_id = {task.id}")
    return {"task_id": task.id}

@app.get("/result/{task_id}")
async def get_result(task_id: str):
    task = AsyncResult(task_id, app=celery_app)
    if task.state == "PENDING":
        api_logger.warning(f"[Pending] querying result for task_id={task_id}")
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"state": task.state, "error": str(task.info)})
    elif task.state == "SUCCESS":
        api_logger.info(f"[Success] querying result for task_id={task_id}")
        return task.result
    else:
        api_logger.error(f"[ Error ] querying result for task_id={task_id} : {str(task.info)}")
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"state": task.state, "error": str(task.info)})

@app.route("/config")
def config():
    return {"mode": "server"}