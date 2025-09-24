import os, time
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

from flask import Flask, render_template, request, jsonify
import uuid
from flowvae.app.wing.api import Wing_api

# establish the wing api instance at the beginning of the client
# later use it to predict wing results given input parameters
wing_api = Wing_api(saves_folder='../saves', device='default')
results  = {}   # for fake async
EXPIRE_SECONDS = 60

app = Flask(__name__)

@app.route('/predict_wing_flowfield', methods=['POST'])
def handle_predict_wing_flowfield():

    task_id = str(uuid.uuid4())

    # get all parameters
    data = request.get_json()
    # call wing_api to predict
    result = wing_api.end2end_predict(data)
    results[task_id] = (time.time(), result)

    return jsonify({"task_id": task_id})

@app.route("/result/<task_id>")
def get_result(task_id):
    clean_expired_tasks()
    if task_id in results:
        return jsonify(results[task_id][1])
    else:
        return jsonify({"status": "pending"}), 500

@app.route('/')
def index():
    return render_template('index_tailwind.html')

@app.route("/config")
def config():
    return jsonify({"mode": "local"})

def clean_expired_tasks():
    now = time.time()
    expired = [k for k, (t, _) in results.items() if now - t > EXPIRE_SECONDS]
    for k in expired:
        del results[k]

if __name__ == '__main__':
    app.run(port=5000, debug=False)
    # app.run(host='0.0.0.0', port=8000, debug=True)