var passed = 0;
var failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        return;
    }
    failed++;
    var location = '';
    try {
        var stack = new Error().stack;
        var lines = stack.split('\n');
        // lines[0] = "Error", lines[1] = this function, lines[2] = caller
        for (var i = 2; i < lines.length; i++) {
            var match = lines[i].match(/\((.+):(\d+):\d+\)/) || lines[i].match(/at (.+):(\d+):\d+/);
            if (match) {
                var file = match[1];
                // use path relative to cwd
                var cwd = process.cwd();
                if (file.indexOf(cwd) === 0) {
                    file = './' + file.slice(cwd.length + 1);
                }
                location = file + ':' + match[2];
                break;
            }
        }
    } catch (e) {
        // fall through with empty location
    }
    console.log(location + ': FAIL: ' + message);
}

function summary(label) {
    console.log((label || 'Tests') + ': ' + passed + ' passed, ' + failed + ' failed');
    return failed > 0 ? 1 : 0;
}

module.exports = { assert: assert, summary: summary };
