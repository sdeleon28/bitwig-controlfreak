from typing import List, Literal

BwColor = Literal["red"] | Literal["green"] | Literal["blue"]


class BwTrack:
    id: str
    name: str
    color: BwColor
    children: List["BwTrack"]


class Bitwig:
    def __init__(self) -> None:
        pass
