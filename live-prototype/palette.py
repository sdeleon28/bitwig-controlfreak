# Launchpad MK2 color velocities for use with mido
# To light up a pad: mido.Message('note_on', note=pad_note, velocity=color, channel=0)
# To light up a pad flashing: mido.Message('note_on', note=pad_note, velocity=color, channel=1)
# To light up a pad pulsing: mido.Message('note_on', note=pad_note, velocity=color, channel=2)

# Bitwig palette rows — each value is a velocity for note_on messages
row1 = [
    0,  # dark gray
    103,  # medium gray
    70,  # light gray
    112,  # muted blue-gray
    83,  # brown
    108,  # tan
    69,  # muted blue
    49,  # light blue
    81,  # purple
]

row2 = [
    95,  # hot pink
    72,  # red
    84,  # orange
    99,  # gold
    101,  # olive green
    87,  # green
    34,  # teal
    79,  # blue
    52,  # violet
]

row3 = [
    53,  # pink
    83,  # salmon
    108,  # light orange
    109,  # yellow
    98,  # lime
    31,  # mint green
    33,  # aqua
    41,  # sky blue
    56,  # lavender
]

palette = [row1, row2, row3]
