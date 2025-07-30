from pydantic import BaseModel
from typing import List

class WingInput(BaseModel):
    conditions: List[float]
    planform: List[float]
    t: float
    cstu: List[float]
    cstl: List[float]