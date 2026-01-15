import json
from pathlib import Path

src = Path(r"..\static\\OLDwingindex.json")
dst = Path(r"..\static\wingindex.json")
from json import JSONEncoder

class CompactListEncoder(JSONEncoder):
    def iterencode(self, o, _one_shot=False):
        if isinstance(o, list):
            return iter([json.dumps(o, separators=(",", ":"))])
        return super().iterencode(o, _one_shot=_one_shot)
    

with src.open("r", encoding="utf-8") as f:
    data = json.load(f)

outs = {}
for key in data.keys():
    out = {}
    for name, arr in data[key].items():
        print(arr)
        if len(arr) < 29:
            raise ValueError(f"{name} length {len(arr)} != 29")
        out[name] = {
            "condition": arr[0:2],
            "planform": arr[2:8],
            "secpara": [[arr[8]]],
            "csts": [[arr[9:19], arr[19:29]]] # cstu, cstl
        }
    outs[key] = out

with dst.open("w", encoding="utf-8") as f:
    json.dump(outs, f, indent=2, cls=CompactListEncoder)

print(f"written: {dst}")