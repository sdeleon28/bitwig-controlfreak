/**
 * Declarative device-to-encoder mapping configurations.
 * Each device has an array of bands with color, encoder (turn) and button (press) mappings.
 * Buttons share the same physical encoder (e.g., encoder 9 turn=Gain, press=Active).
 */
var DeviceMappings = {
    "Frequalizer Alt": [
        // Band 1: Lowest (blue)
        { color: { r: 80, g: 80, b: 255 },
          encoders: [
              { encoder: 13, paramId: 'CONTENTS/PID5e65eb21' },  // Q1: Frequency
              { encoder: 14, paramId: 'CONTENTS/PID1fdbd404' },  // Q1: Quality
          ],
          buttons: [
              { encoder: 13, paramId: 'CONTENTS/PID60a37761' },  // Q1: Active
              { encoder: 14, paramId: 'CONTENTS/PID10cd4cb4', value: 1, releaseValue: 0, resolution: 19 },  // Band Solo → Q1
          ]},
        // Band 2: Low (red)
        { color: { r: 255, g: 0, b: 0 },
          encoders: [
              { encoder: 1, paramId: 'CONTENTS/PID47f82203' },   // Q2: Frequency
              { encoder: 5, paramId: 'CONTENTS/PID74f25b66' },   // Q2: Quality
              { encoder: 9, paramId: 'CONTENTS/PID14682278' },   // Q2: Gain
          ],
          buttons: [
              { encoder: 9, paramId: 'CONTENTS/PID10cd7bbf' },   // Q2: Active
              { encoder: 5, paramId: 'CONTENTS/PID10cd4cb4', value: 2, releaseValue: 0, resolution: 19 },   // Band Solo → Q2
          ]},
        // Band 3: Low Mids (green)
        { color: { r: 0, g: 255, b: 0 },
          encoders: [
              { encoder: 2, paramId: 'CONTENTS/PID7f826bc6' },   // Q3: Frequency
              { encoder: 6, paramId: 'CONTENTS/PIDefa39e9' },    // Q3: Quality
              { encoder: 10, paramId: 'CONTENTS/PID9318ad5' },   // Q3: Gain
          ],
          buttons: [
              { encoder: 10, paramId: 'CONTENTS/PID78de40dc' },  // Q3: Active
              { encoder: 6, paramId: 'CONTENTS/PID10cd4cb4', value: 3, releaseValue: 0, resolution: 19 },   // Band Solo → Q3
          ]},
        // Band 4: High Mids (orange)
        { color: { r: 255, g: 150, b: 0 },
          encoders: [
              { encoder: 3, paramId: 'CONTENTS/PID5f199778' },   // Q4: Frequency
              { encoder: 7, paramId: 'CONTENTS/PID416caa1b' },   // Q4: Quality
              { encoder: 11, paramId: 'CONTENTS/PID1d7657e3' },  // Q4: Gain
          ],
          buttons: [
              { encoder: 11, paramId: 'CONTENTS/PIDf24026a' },   // Q4: Active
              { encoder: 7, paramId: 'CONTENTS/PID10cd4cb4', value: 4, releaseValue: 0, resolution: 19 },   // Band Solo → Q4
          ]},
        // Band 5: High (yellow)
        { color: { r: 255, g: 255, b: 0 },
          encoders: [
              { encoder: 4, paramId: 'CONTENTS/PID5c3cef11' },   // Q5: Frequency
              { encoder: 8, paramId: 'CONTENTS/PID2a8313f4' },   // Q5: Quality
              { encoder: 12, paramId: 'CONTENTS/PID4b5ee4aa' },  // Q5: Gain
          ],
          buttons: [
              { encoder: 12, paramId: 'CONTENTS/PID651c7971' },  // Q5: Active
              { encoder: 8, paramId: 'CONTENTS/PID10cd4cb4', value: 5, releaseValue: 0, resolution: 19 },   // Band Solo → Q5
          ]},
        // Band 6: Highest (bright red)
        { color: { r: 255, g: 50, b: 0 },
          encoders: [
              { encoder: 15, paramId: 'CONTENTS/PID10d85b53' },  // Q6: Frequency
              { encoder: 16, paramId: 'CONTENTS/PID1430a8b6' },  // Q6: Quality
          ],
          buttons: [
              { encoder: 15, paramId: 'CONTENTS/PID74e8446f' },  // Q6: Active
              { encoder: 16, paramId: 'CONTENTS/PID10cd4cb4', value: 6, releaseValue: 0, resolution: 19 },  // Band Solo → Q6
          ]}
    ]
};

if (typeof module !== 'undefined') module.exports = DeviceMappings;
