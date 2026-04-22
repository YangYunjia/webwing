import os, re, time
os.environ["KMP_DUPLICATE_LIB_OK"] = "True"

from pathlib import Path
from flask import Flask, render_template, request, jsonify
import uuid
from flowvae.app.wing.api import SimpleWingAPI, SuperWingAPI

# establish the wing api instance at the beginning of the client
# later use it to predict wing results given input parameters
wing_api = {
    'simple': SimpleWingAPI(),
    'transonic': SuperWingAPI()
}
results  = {}   # for fake async
EXPIRE_SECONDS = 60

app = Flask(__name__)

README_PATH = Path(__file__).resolve().parents[1] / "README.md"
USER_GUIDE_MARKER = "## User guide"

def _extract_user_guide_section(text: str):
    start = text.find(USER_GUIDE_MARKER)
    if start == -1:
        return "User guide section not found"
    section_text = text[start:].strip()
    next_header = section_text.find("\n## ", len(USER_GUIDE_MARKER))
    if next_header != -1:
        section_text = section_text[:next_header].strip()
    return section_text

@app.route('/predict_wing_flowfield', methods=['POST'])
def handle_predict_wing_flowfield():

    task_id = str(uuid.uuid4())

    # get all parameters
    data = request.get_json()
    # call wing_api to predict
    result = wing_api[data['ver']].end2end_predict(data['inputs'])
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


@app.route("/user_guide", methods=["GET"])
def user_guide():
    try:
        text = README_PATH.read_text(encoding="utf-8")
        section_text = _extract_user_guide_section(text)
    except OSError:
        return jsonify({"error": "Failed to load user guide"}), 500

    return jsonify({"content": section_text})

def clean_expired_tasks():
    now = time.time()
    expired = [k for k, (t, _) in results.items() if now - t > EXPIRE_SECONDS]
    for k in expired:
        del results[k]

if __name__ == '__main__':
    app.run(port=5000, debug=True)
    # app.run(host='0.0.0.0', port=8000, debug=False)