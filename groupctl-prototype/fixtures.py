from typing import List, Literal
from dataclasses import dataclass
from colors import BwColor
from events import BwTrack

track_structure_1: List[BwTrack] = [
    BwTrack(
        depth=0,
        name="top refs (13)",
        position=13,
        color="86,96,198", # blue
        children=[
            BwTrack(
                depth=1,
                name="limits (1)",
                position=13,
                color="86,96,198", # blue
                children=[],
            ),
            BwTrack(
                depth=1,
                name="bow down (1)",
                position=13,
                color="188,118,240", # light purple
                children=[],
            ),
        ]
    ),
    BwTrack(
        depth=0,
        name="top inst (15)",
        position=13,
        color="254,130,60", # sober orange
        children=[
            BwTrack(
                depth=1,
                name="gtrs (1)",
                position=13,
                color="216,46,34", # red
                children=[
                    BwTrack(
                        depth=1,
                        name="gtr main (1)",
                        position=13,
                        color="216,46,34", # red
                        children=[],
                    ),
                ],
            ),
            BwTrack(
                depth=1,
                name="bass (2)",
                position=13,
                color="86,96,198", # blue
                children=[],
            ),
        ]
    ),
]
