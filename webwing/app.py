import base64
from io import BytesIO
from matplotlib.figure import Figure
from flask import Flask, render_template, request, jsonify

# establish the wing api instance at the beginning of the client
# later use it to predict wing results given input parameters
# from flowvae.app.wing.wing_api import Wing_api
import numpy as np
wing_api = None
# wing_api = Wing_api(saves_folder='saves', device='default')

app = Flask(__name__)

@app.route('/display_sectional_airfoil', methods=['POST'])
def handle_display_sectional_airfoil():
    # 获取前端发送的JSON数据
    data = request.get_json()
    inputs = data['inputs']  # 获取输入的 inputs[9:] 部分
    
    nx = 501
    xx, yu, yl, _, _ = cst_foil(nx, inputs[1:11], inputs[11:], x=None, t=inputs[0], tail=0.004)
    return jsonify({"image": f"data:image/png;base64,{data}"})

@app.route('/display_wing_frame', methods=['POST'])
def handle_display_wing_frame():
    # 获取前端发送的JSON数据
    data = request.get_json()
    inputs = data['inputs']  # 获取输入的 inputs[9:] 部分

    # 调用 wing_api 的 display_sectional_airfoil 函数，生成图片
    fig = Figure(figsize=(5, 5), dpi=60)
    ax = fig.add_subplot(projection='3d')
    ax = wing_api.display_wing_frame(ax, inputs)

    buf = BytesIO()
    fig.savefig(buf, format="png")

    # 返回图片，供前端使用
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    return jsonify({"image": f"data:image/png;base64,{data}"})

@app.route('/predict_wing_flowfield', methods=['POST'])
def handle_predict_wing_flowfield():
    # 获取前端发送的JSON数据
    data = request.get_json()
    inputs = data['inputs']  # 获取输入的 inputs[9:] 部分

    # 调用 wing_api 的 display_sectional_airfoil 函数，生成图片
    wg = wing_api.predict(inputs)
    wg.lift_distribution()
    cl_array = wg.cl
    
    fig = Figure(figsize=(14, 10), dpi=100)
    wg._plot_2d(fig, ['upper', 'full'], contour=9, reverse_y=-1)
    
    buf = BytesIO()
    fig.savefig(buf, format="png")

    # 返回图片，供前端使用
    data = base64.b64encode(buf.getbuffer()).decode("ascii")
    return jsonify({"image": f"data:image/png;base64,{data}", "cl_array": cl_array.tolist()})

@app.route('/')
def index():
    return render_template('index_tailwind.html')

@app.route('/data')
def data():
    shape_type = request.args.get('type', 'sphere')
    
    if shape_type == 'cube':
        # 八个点
        x = [0, 1, 1, 0, 0, 1, 1, 0]
        y = [0, 0, 1, 1, 0, 0, 1, 1]
        z = [0, 0, 0, 0, 1, 1, 1, 1]
        # 定义面的三角网格（12个三角面）
        i = [0, 0, 0, 1, 1, 2, 4, 4, 5, 5, 6, 7]
        j = [1, 3, 4, 2, 5, 3, 5, 7, 6, 1, 2, 3]
        k = [3, 4, 5, 3, 6, 7, 7, 6, 1, 0, 3, 0]

        return jsonify({
            'type': 'cube',
            'x': x,
            'y': y,
            'z': z,
            'i': i,
            'j': j,
            'k': k
        })

    else:
        # 球面数据
        phi = np.linspace(0, np.pi, 20)
        theta = np.linspace(0, 2 * np.pi, 40)
        phi, theta = np.meshgrid(phi, theta)
        r = 1
        x = r * np.sin(phi) * np.cos(theta)
        y = r * np.sin(phi) * np.sin(theta)
        z = r * np.cos(phi)
        return jsonify({
            'type': 'sphere',
            'x': x.tolist(),
            'y': y.tolist(),
            'z': z.tolist()
        })

if __name__ == '__main__':
    app.run(debug=True)