from fastapi import FastAPI, Request, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from models import WingInput
from tasks import predict_wing_flowfield, celery_app
from celery.result import AsyncResult
import redis

MAX_QUEUE_LENGTH = 5

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
    return templates.TemplateResponse("index_tailwind.html", {"request": request})

@app.post("/predict_wing_flowfield")
async def predict(data: WingInput):
    queue_length = redis_conn.llen("celery")

    if queue_length >= MAX_QUEUE_LENGTH:
        return JSONResponse(
            status_code=429,
            content={"error": "Server is busy. Try again later"}
        )
    
    task = predict_wing_flowfield.delay(data.model_dump())
    return {"task_id": task.id}

@app.get("/result/{task_id}")
async def get_result(task_id: str):
    task = AsyncResult(task_id, app=celery_app)
    if task.state == "PENDING":
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"state": task.state, "error": str(task.info)})
    elif task.state == "SUCCESS":
        return task.result
    else:
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"state": task.state, "error": str(task.info)})
    