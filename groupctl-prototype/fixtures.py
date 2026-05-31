from typing import List, Literal
from dataclasses import dataclass
from colors import BwColor
from events import BwTrack

track_structure_1: List[BwTrack] = [
    BwTrack(
        depth=0,
        id="top refs (13)",
        name="top refs (13)",
        position=13,
        color="86,96,198", # blue
        children=[
            BwTrack(
                depth=1,
                id="limits (1)",
                name="limits (1)",
                position=1,
                color="86,96,198", # blue
                children=[],
            ),
            BwTrack(
                depth=1,
                id="bow down (2)",
                name="bow down (2)",
                position=2,
                color="188,118,240", # light purple
                children=[],
            ),
        ]
    ),
    BwTrack(
        depth=0,
        id="top inst (15)",
        name="top inst (15)",
        position=15,
        color="254,130,60", # sober orange
        children=[
            BwTrack(
                depth=1,
                id="gtrs (1)",
                name="gtrs (1)",
                position=1,
                color="216,46,34", # red
                children=[
                    BwTrack(
                        depth=2,
                        id="gtr main (1)",
                        name="gtr main (1)",
                        position=1,
                        color="216,46,34", # red
                        children=[],
                    ),
                ],
            ),
            BwTrack(
                depth=1,
                id="bass (2)",
                name="bass (2)",
                position=2,
                color="86,96,198", # blue
                children=[],
            ),
        ]
    ),
]


complete_fixture_doc = """
top refs (13) -> cyan
    ref1 (1)
    ref2 (2)
    ref3 (3)
    ref4 (4)
top vox (14) -> cyan
    vox main (1)
    vox main adlibs (2)
    vox feat (3)
    vox feat adlibs (4)
    vox harm 1 (5)
    vox harm 2 (6)
    vox harm 3 (7)
    vox harm 4 (8)
top inst (15) -> gold
    gtrs (1) -> red
        gtr main (1) -> blue
        gtr lead (2) -> red
        gtr fx (3) -> purple
        gtr synth (4) -> magenta
    bass (2) -> blue
        bass di (1) -> blue
        bass lo (2) -> purple
        bass hi (3) -> yellow
        bass dist (4) -> red
        bass synth (5) -> magenta
    synth (3) -> magenta
        808 (1) -> blue
        lead (2) -> red
        pad (2) -> cyan
    drms (4) -> green
        okw (1) -> green
        trap machine (2) -> yellow
        fx kit (3) -> magenta
    casuarinas (12) -> yellow
        handpan (1) -> yellow
        cuenco (2) -> red
        ribbit (3) -> green
        oink (4) -> aqua
"""


complete_fixture: List[BwTrack] = [
    BwTrack(
        depth=0,
        id="top refs (13)",
        name="top refs (13)",
        position=13,
        color="68,200,254", # cyan
        children=[
            BwTrack(
                depth=1,
                id="ref1 (1)",
                name="ref1 (1)",
                position=1,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="ref2 (2)",
                name="ref2 (2)",
                position=2,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="ref3 (3)",
                name="ref3 (3)",
                position=3,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="ref4 (4)",
                name="ref4 (4)",
                position=4,
                color="68,200,254", # cyan
                children=[],
            ),
        ],
    ),
    BwTrack(
        depth=0,
        id="top vox (14)",
        name="top vox (14)",
        position=14,
        color="68,200,254", # cyan
        children=[
            BwTrack(
                depth=1,
                id="vox main (1)",
                name="vox main (1)",
                position=1,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox main adlibs (2)",
                name="vox main adlibs (2)",
                position=2,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox feat (3)",
                name="vox feat (3)",
                position=3,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox feat adlibs (4)",
                name="vox feat adlibs (4)",
                position=4,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox harm 1 (5)",
                name="vox harm 1 (5)",
                position=5,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox harm 2 (6)",
                name="vox harm 2 (6)",
                position=6,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox harm 3 (7)",
                name="vox harm 3 (7)",
                position=7,
                color="68,200,254", # cyan
                children=[],
            ),
            BwTrack(
                depth=1,
                id="vox harm 4 (8)",
                name="vox harm 4 (8)",
                position=8,
                color="68,200,254", # cyan
                children=[],
            ),
        ],
    ),
    BwTrack(
        depth=0,
        id="top inst (15)",
        name="top inst (15)",
        position=15,
        color="216,156,14", # gold (light orange)
        children=[
            BwTrack(
                depth=1,
                id="gtrs (1)",
                name="gtrs (1)",
                position=1,
                color="216,46,34", # red
                children=[
                    BwTrack(
                        depth=2,
                        id="gtr main (1)",
                        name="gtr main (1)",
                        position=1,
                        color="86,96,198", # blue
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="gtr lead (2)",
                        name="gtr lead (2)",
                        position=2,
                        color="216,46,34", # red
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="gtr fx (3)",
                        name="gtr fx (3)",
                        position=3,
                        color="148,72,202", # purple
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="gtr synth (4)",
                        name="gtr synth (4)",
                        position=4,
                        color="216,56,110", # magenta
                        children=[],
                    ),
                ],
            ),
            BwTrack(
                depth=1,
                id="bass (2)",
                name="bass (2)",
                position=2,
                color="86,96,198", # blue
                children=[
                    BwTrack(
                        depth=2,
                        id="bass di (1)",
                        name="bass di (1)",
                        position=1,
                        color="86,96,198", # blue
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="bass lo (2)",
                        name="bass lo (2)",
                        position=2,
                        color="148,72,202", # purple
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="bass hi (3)",
                        name="bass hi (3)",
                        position=3,
                        color="228,182,76", # yellow
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="bass dist (4)",
                        name="bass dist (4)",
                        position=4,
                        color="216,46,34", # red
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="bass synth (5)",
                        name="bass synth (5)",
                        position=5,
                        color="216,56,110", # magenta
                        children=[],
                    ),
                ],
            ),
            BwTrack(
                depth=1,
                id="synth (3)",
                name="synth (3)",
                position=3,
                color="216,56,110", # magenta
                children=[
                    BwTrack(
                        depth=2,
                        id="808 (1)",
                        name="808 (1)",
                        position=1,
                        color="86,96,198", # blue
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="lead (2)",
                        name="lead (2)",
                        position=2,
                        color="216,46,34", # red
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="pad (2)",
                        name="pad (2)",
                        position=2,
                        color="68,200,254", # cyan
                        children=[],
                    ),
                ],
            ),
            BwTrack(
                depth=1,
                id="drms (4)",
                name="drms (4)",
                position=4,
                color="0,156,68", # green
                children=[
                    BwTrack(
                        depth=2,
                        id="okw (1)",
                        name="okw (1)",
                        position=1,
                        color="0,156,68", # green
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="trap machine (2)",
                        name="trap machine (2)",
                        position=2,
                        color="228,182,76", # yellow
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="fx kit (3)",
                        name="fx kit (3)",
                        position=3,
                        color="216,56,110", # magenta
                        children=[],
                    ),
                ],
            ),
            BwTrack(
                depth=1,
                id="casuarinas (12)",
                name="casuarinas (12)",
                position=12,
                color="228,182,76", # yellow
                children=[
                    BwTrack(
                        depth=2,
                        id="handpan (1)",
                        name="handpan (1)",
                        position=1,
                        color="228,182,76", # yellow
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="cuenco (2)",
                        name="cuenco (2)",
                        position=2,
                        color="216,46,34", # red
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="ribbit (3)",
                        name="ribbit (3)",
                        position=3,
                        color="0,156,68", # green
                        children=[],
                    ),
                    BwTrack(
                        depth=2,
                        id="oink (4)",
                        name="oink (4)",
                        position=4,
                        color="0,166,146", # aqua (dim aqua)
                        children=[],
                    ),
                ],
            ),
        ],
    ),
]
